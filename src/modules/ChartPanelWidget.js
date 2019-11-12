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
      
      console.log("ChartPanelWidget created");

      this.contentPane = getEl(this.contentPaneId);
      let chartWidth = $(this.contentPane).width() - rightPad - leftEdge;
      let chartWidthPx = chartWidth + "px";

      this.chartTitleDiv = makeHtmlElement("div",null,null,null,"Shore Station: ");
      this.contentPane.appendChild(this.chartTitleDiv);

      this.vertProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "12%", height: "35%",},
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
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "86%", height: "10%",}
      };

      this.addDivFromLayout(this.vertProfile);
      this.addDivFromLayout(this.bbProfile);
      this.addDivFromLayout(this.substrateProfile);
      this.addDivFromLayout(this.scale);

      this.processData = function(results) {
        console.log("ChartPanelWidget processData function");
        let features = results.features;
        this.features = features;
        if (this.noFeatures(features))
          return;
        console.log(features.length + " profile points");     // TODO: Set this up, using HTML5 SVG  (https://www.w3schools.com/graphics/svg_intro.asp)
        this.initCharts();
        this.makeXYChart(this.vertProfile);
        this.makeBarChart(this.bbProfile);
        this.makeBarChart(this.substrateProfile);
        this.makeScaleBar(this.scale);
      };

    },

    addDivFromLayout: function(profile) {
      profile.div = makeHtmlElement("DIV", null, "chartDiv", ObjToCss(profile.layoutInfo));
      this.contentPane.appendChild(profile.div);
      if (profile.title) {
        profile.titleDiv = makeHtmlElement("DIV", null, "chartTitleDiv", ObjToCss(profile.titleLayoutInfo));
        profile.titleDiv.innerHTML = profile.title;
        this.contentPane.appendChild(profile.titleDiv);
      }
      profile.textContainer = makeHtmlElement("div");
      document.body.appendChild(profile.textContainer);
    },

    initCharts: function() {
      this.chartTitleDiv.innerHTML = replaceFromArray(this.titleTemplate, [this.features[0].attributes[this.titleField]]);
      this.numPoints = this.features.length;
      this.lastRecord = this.features[this.numPoints-1].attributes;
      this.profileLength = this.lastRecord["IntervalEndX_m"];

      this.vertProfile.viewBox = [0, -10, this.profileLength, 12];
      this.vertProfile.bottom = 2;
      // Initially, assume y from -2m to 10m.  Note that the y-axis points downward, so everything need to invert

      this.bbProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      this.substrateProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      this.scale.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      for (p of [this.vertProfile, this.bbProfile, this.substrateProfile]) {
        p.svgCode =  '<svg width="100%" height="100%" preserveAspectRatio="none" viewBox="' + p.viewBox + '">';
        p.textContainer.innerHTML = '';
      }
      this.scale.svgCode =  '<svg width="100%" height="100%" preserveAspectRatio="none" viewBox="' + p.viewBox + '">';
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
          let barNode = getEl(id);
          let ofs = $(barNode).offset();
          ofs.top += (profile.div.offsetHeight-profile.labelStyle.font_size)/2;
          let labelId = "label_" + id;
          let style = 'position:absolute;top:' + ofs.top + 'px;left:' + ofs.left + 'px;' + ObjToCss(profile.labelStyle);
          let labelEl = makeHtmlElement("div",labelId,null,style,label);
          labelEl.setAttribute("title", description);
          profile.textContainer.appendChild(labelEl);
        }
        lastLabel = label;
      }
    },

    moveBarLabels: function(profile) {
      for (f=1; f<this.features.length; f++) {
          let id = profile.labelField + f;
          let barNode = getEl(id);
          let ofs = $(barNode).offset();
          ofs.top += (profile.div.offsetHeight-profile.labelStyle.font_size)/2;
          let labelId = "label_" + id;
          let labelEl = getEl(labelId);
          if (labelEl) {
/*
            let labelNode = $(labelEl).offset();
            labelNode.left = ofs.left;
            labelNode.top = ofs.top;
*/
            labelEl.style.top = ofs.top + "px";
            labelEl.style.left = ofs.left + "px";
          }
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
      profile.svgCode += '<polygon class="vertProfileStyle" points= "' + pointsStr + '"/>';
      profile.svgCode += '<line class="vertProfileStyle" x1="0" y1="0" x2="' + this.profileLength  + '" y2="0" />';
      profile.svgCode += '</svg>';
      profile.div.innerHTML = profile.svgCode;
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

    makeScaleBar: function(profile) {
      let power = Math.floor(this.profileLength).toFixed(0).length -1;
      let interval = Math.pow(10, power);
      profile.svgCode += '<line class="scaleBarStyle" x1="0" y1="50" x2="' + this.profileLength  + '" y2="50" />';
      for (i=0; i<this.profileLength; i+=interval) {
        profile.svgCode += '<line class="scaleBarStyle" x1="' + i + '" y1="0" x2="' + i + '" y2="100" />';
      }
      profile.svgCode += '</svg>';
      profile.div.innerHTML = profile.svgCode;
    },

    resize: function () {
      let chartWidth = $(this.contentPane).width() - rightPad - leftEdge;
      let chartWidthPx = Math.round(chartWidth) + "px";
      for (p of [this.vertProfile, this.bbProfile, this.substrateProfile, this.scale])
        p.div.style.width = chartWidthPx;
      this.moveBarLabels(this.bbProfile);
    }

  });
});

