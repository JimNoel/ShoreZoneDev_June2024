/**
 * Class ChartPanelWidget
 *
 * Widget for display of charts
 *   subclass of QueryBasedPanelWidget
 *
 * Constructor arguments:
 *    mapServiceLayer: MapImageLayer
 *    layerName: String     name of a sublayer of mapServiceLayer
 *    panel: ContentPane    panel where processed query results are displayed
 *    -- perhaps other args for outFields and where clause?
 */

let leftEdge = 60;
let leftEdgePx = leftEdge + "px";
let rightPad = 5;
let viewBoxTemplate = "0 0 {0} {1}";


define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, QueryBasedPanelWidget){


  return declare(QueryBasedPanelWidget, {


    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);
      
      //console.log("ChartPanelWidget created");

//      this.contentPane = getEl(this.contentPaneId);
      this.contentPane = getEl(this.displayDivName);
      let chartWidth = $(this.contentPane).width() - rightPad - leftEdge;
      let chartWidthPx = chartWidth + "px";

      this.chartHeaderDiv = makeHtmlElement("div",null,null,"position: absolute;width: 100%;height:11%;");
      this.chartTitleDiv = makeHtmlElement("div",null,null,"position:absolute; height:10px; top:0; left:2px;","Shore Station: ");
      this.chartWidthDiv = makeHtmlElement("div",null,null,"position:absolute; height:10px; bottom:0; right:5px; font-weight:bold;","Total across-shore width: ");
      this.chartHeaderDiv.appendChild(this.chartTitleDiv);
      this.chartHeaderDiv.appendChild(this.chartWidthDiv);
      this.contentPane.appendChild(this.chartHeaderDiv);

      this.vertProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "12%", height: "35%", background_color: "#74E5E1"},
        titleLayoutInfo: {left: 0, width: leftEdgePx, top: "12%", height: "35%", text_align: "center", font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "black"},
        xField: "PointX_m",
        yField: "PointY_cm",
        yFactor: -0.01          // Converts centimeters to meters, and inverts
      };

      this.bbProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "48%", height: "21%",},
        titleLayoutInfo: {left: 0, width: leftEdgePx, top: "48%", height: "21%", text_align: "center", font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "black"},
        xField: "IntervalStartX_m",
        widthField: "IntervalWidth_m",
        colorField: "BiobandWebsiteColor",
        labelField: "Bioband",
        descrField: "BiobandName",
        labelStyle: {font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "white"},
        title: "Biobands on Profile"
    };

      this.substrateProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "70%", height: "15%",},
        titleLayoutInfo: {left: 0, width: leftEdgePx, top: "70%", height: "15%", text_align: "center", font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "black"},
        xField: "IntervalStartX_m",
        widthField: "IntervalWidth_m",
        colors: ["#808080", "#CCCCCC"],
        labelField: "SubstrateCode",
        descrField: "Substrate_Description",
        labelStyle: {font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "white"},
        title: "Substrate on Profile"
      };

      this.scale = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "86%", height: "3%", border_top: "1px solid"}
      };

      this.addDivFromLayout(this.vertProfile);
      this.addDivFromLayout(this.bbProfile);
      this.addDivFromLayout(this.substrateProfile);
      this.addDivFromLayout(this.scale);

      this.processFeatures = function(features) {
        this.initCharts();
        this.makeXYChart(this.vertProfile);
        this.makeBarChart(this.bbProfile);
        this.makeBarChart(this.substrateProfile);
        this.makeScaleBar(this.scale);
        this.resize();
      };

    },

    addDivFromLayout: function(profile) {
      profile.div = makeHtmlElement("DIV", null, "chartDiv", ObjToCss(profile.layoutInfo));
      this.contentPane.appendChild(profile.div);
      profile.titleDiv = makeHtmlElement("DIV", null, "chartTitleDiv", ObjToCss(profile.titleLayoutInfo));
      if (profile.title) {
        profile.titleDiv.innerHTML = profile.title;
      }
      this.contentPane.appendChild(profile.titleDiv);
      profile.textContainer = makeHtmlElement("div");
      this.contentPane.appendChild(profile.textContainer);
    },

    initCharts: function() {
      this.chartTitleDiv.innerHTML = replaceFromArray(this.titleTemplate, [this.features[0].attributes[this.titleField]]);
      this.numPoints = this.features.length;
      this.lastRecord = this.features[this.numPoints-1].attributes;
      this.profileLength = this.lastRecord["IntervalEndX_m"];
      this.chartWidthDiv.innerHTML = "Total across-shore width: " + this.profileLength.toFixed(1) + "m";

      this.vertProfile.viewBox = [0, -10, this.profileLength, 12];
      this.vertProfile.bottom = 2;
      // Initially, assume y from -2m to 10m.  Note that the y-axis points downward, so everything needs to invert

      this.bbProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      this.substrateProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      for (p of [this.vertProfile, this.bbProfile, this.substrateProfile]) {
        p.svgCode =  '<svg width="100%" height="100%" preserveAspectRatio="none" viewBox="' + p.viewBox + '">';
        p.textContainer.innerHTML = '';
      }
    },

    makeXYChart: function(profile) {
      let pointsStr = '0,' + profile.bottom;
      for (f=0; f<this.features.length; f++) {
        let attributes = this.features[f].attributes;
        let coords = [attributes[profile.xField], attributes[profile.yField]*profile.yFactor];
        pointsStr += ' ' + coords.join(',');
      }
      pointsStr +=  ' ' + this.profileLength + ',' + profile.bottom;
      //  Note:  stroke-alignment="inner" may not do anything  ( https://www.w3.org/TR/svg-strokes/#SpecifyingStrokeAlignment )
      profile.svgCode += '<polygon class="vertProfileStyle" stroke-alignment="inner" points= "' + pointsStr + '"/>';
      profile.svgCode += '<line id="xAxis" class="vertProfileStyle" x1="0" y1="0" x2="' + this.profileLength  + '" y2="0" />';     // x-axis line
      profile.startElev = this.features[0].attributes[profile.yField]*profile.yFactor;
      profile.svgCode += '<line id="startElevLine" class="hiddenLineStyle" x1="0" y1="' + profile.startElev + '" x2="0" y2="0" />';     // (hidden) marker, for positioning of initial elevation label
      profile.svgCode += '</svg>';
      profile.div.innerHTML = profile.svgCode;
      this.addScaleLabels(profile);
    },

    addScaleLabels: function(profile) {
      profile.titleDiv.innerHTML = "";      // Clear any previous labels

      let bottomYLabel = makeHtmlElement("div", null,"axisScaleLabel", "position:absolute; right:0; bottom:-5px", "-" + profile.bottom + "m");
      profile.titleDiv.appendChild(bottomYLabel);
      let topLabel = makeHtmlElement("div", null,"axisScaleLabel", "position:absolute; right:0; top:-5px", -profile.viewBox[1] + "m");
      profile.titleDiv.appendChild(topLabel);
      let titleDivOfs = $(profile.titleDiv).offset();

      let xAxisNode = getEl("xAxis");
      let xAxisOfs = $(xAxisNode).offset();
      xAxisOfs.top -= titleDivOfs.top + 5;
      let theStyle = "position:absolute; right:0; top:" + xAxisOfs.top + "px";
      profile.zeroLabel = makeHtmlElement("div", null,"axisScaleLabel", theStyle, "0");
      profile.titleDiv.appendChild(profile.zeroLabel);

      let startElevNode = getEl("startElevLine");
      let startElevOfs = $(startElevNode).offset();
      startElevOfs.top -= titleDivOfs.top + 5;
      theStyle = "position:absolute; right:0; top:" + startElevOfs.top + "px";
      profile.startElevLabel = makeHtmlElement("div", null,"axisScaleLabel", theStyle, -profile.startElev.toFixed(2) + "m");
      profile.titleDiv.appendChild(profile.startElevLabel);
    },

    moveScaleLabels: function(profile) {
      let titleDivOfs = $(profile.titleDiv).offset();

      let xAxisOfs = $(getEl("xAxis")).offset();
      xAxisOfs.top -= titleDivOfs.top + 5;
      profile.zeroLabel.style.top = xAxisOfs.top + "px";

      let startElevOfs = $(getEl("startElevLine")).offset();
      startElevOfs.top -= titleDivOfs.top + 5;
      profile.startElevLabel.style.top = startElevOfs.top + "px";
    },

    makeBarChart: function(profile) {
      let lastLabel = '';
      let c = 0;
      for (f=1; f<this.features.length; f++) {
        let attributes = this.features[f].attributes;
        let id = profile.labelField + f;
        let x = attributes[profile.xField];
        let width = attributes[profile.widthField];
        let color = null;
        if (profile.colorField)
          color = attributes[profile.colorField];
        else {      // if (profile.colors)
          let label = attributes[profile.labelField];
          if (label !== lastLabel) {
            lastLabel = label;
            c = 1 - c;
          }
          color = profile.colors[c];
        }
        profile.svgCode += '<rect id="' + id + '" x="' + x + '" y="0" width="' + width + '" height="100" style="fill:' + color + '"></rect>';
      }
      profile.svgCode += '</svg>';
      profile.div.innerHTML = profile.svgCode;
      this.addBarLabels(profile);
    },

    addBarLabels: function(profile) {
      let lastLabel = '';
      for (f=1; f<this.features.length; f++) {
        let attributes = this.features[f].attributes;
        let label = attributes[profile.labelField];
        if (label !== lastLabel) {
          let id = profile.labelField + f;
          let description = attributes[profile.descrField];
          if (!description)
            description = "(no description available)";
          let ofs = relOffset(id, profile.textContainer);
          ofs.top += (profile.div.offsetHeight-profile.labelStyle.font_size)/2;
          let labelId = "label_" + id;
          let style = 'position:absolute;top:' + ofs.top + 'px;left:' + ofs.left + 'px;' + ObjToCss(profile.labelStyle);
          let theClass = this.baseName.slice(0,2);
          let labelEl = makeHtmlElement("div",labelId,theClass,style,label);
          labelEl.setAttribute("title", description);
          profile.textContainer.appendChild(labelEl);
        }
        lastLabel = label;
      }
    },

    moveBarLabels: function(profile) {
      for (f=1; f<this.features.length; f++) {
        let id = profile.labelField + f;
        let ofs = relOffset(id, profile.textContainer);
        ofs.top += (profile.div.offsetHeight-profile.labelStyle.font_size)/2;
        let labelId = "label_" + id;
        let labelEl = getEl(labelId);
        if (labelEl) {
          labelEl.style.top = ofs.top + "px";
          labelEl.style.left = ofs.left + "px";
        }
      }
    },

    makeScaleBar: function(profile) {
      let power = Math.floor(this.profileLength).toFixed(0).length -1;
      let interval = Math.pow(10, power);
      let intervalPct = 100*interval/this.profileLength;
      profile.div.innerHTML = "";
      for (p=0; p<100; p+=intervalPct) {
        profile.div.innerHTML += '<div class="tickMark" style="left:' + p + '%"></div>';
      }
    },

    resize: function () {
      if (!this.features)
        return;
      let chartWidth = $(this.contentPane).width() - rightPad - leftEdge;
      let chartWidthPx = Math.round(chartWidth) + "px";
      for (p of [this.vertProfile, this.bbProfile, this.substrateProfile, this.scale])
        p.div.style.width = chartWidthPx;
      this.moveBarLabels(this.bbProfile);
      this.moveBarLabels(this.substrateProfile);
      this.moveScaleLabels(this.vertProfile);
    }

  });
});

