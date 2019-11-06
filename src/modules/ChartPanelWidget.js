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

let leftEdge = 100;
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

      this.vertProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "12%", height: "35%",}
      };

      this.bbProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "48%", height: "21%",},
        //layoutInfo: {left: "14%", width: "85%", top: "48%", height: "21%",},
        xField: "IntervalStartX_m",
        widthField: "IntervalWidth_m",
        colorField: "BiobandWebsiteColor",
        labelField: "Bioband",
        descrField: "BiobandName",
        labelStyle: {font_family: "sans-serif", font_size: 10, font_weight: "bold", color: "white"},
        title: "Biobands on Profile"
    };

      this.substrateProfile = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "70%", height: "15%",}
      };

      this.scale = {
        layoutInfo: {left: leftEdgePx, width: chartWidthPx, top: "86%", height: "2%",}
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
        this.makeBarChart(this.bbProfile);
      };

    },

    addDivFromLayout: function(profile) {
      profile.div = makeHtmlElement("DIV", null, "chartDiv", ObjToCss(profile.layoutInfo));
      this.contentPane.appendChild(profile.div);
      if (profile.title) {
        profile.titleDiv = profile.div.cloneNode(false);
        profile.titleDiv.style.left = "0";
        profile.titleDiv.style.width = leftEdgePx;
        profile.titleDiv.setAttribute("class","chartTitleDiv");
        profile.titleDiv.innerHTML = profile.title;
        this.contentPane.appendChild(profile.titleDiv);
      }
      profile.textContainer = makeHtmlElement("div");
      document.body.appendChild(profile.textContainer);
      if (profile.fontPixels)
        profile.labelStyle += "font-size:" + profile.fontPixels + "px;"
    },

    initCharts: function() {
      this.numPoints = this.features.length;
      this.lastRecord = this.features[this.numPoints-1].attributes;
      this.profileLength = this.lastRecord["IntervalEndX_m"];
      this.vertProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 12]);
      this.bbProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      this.substrateProfile.viewBox = replaceFromArray(viewBoxTemplate, [this.profileLength, 100]);
      for (p of [this.vertProfile, this.bbProfile, this.substrateProfile]) {
        p.svgCode =  '<svg width="100%" height="100%" preserveAspectRatio="none" viewBox="' + p.viewBox + '">';
        p.textContainer.innerHTML = '';
      }
    },

    addBarLabels: function(profile) {
      let lastLabel = '';
      for (f=1; f<this.features.length; f++) {
        let attributes = this.features[f].attributes;
        let label = attributes[profile.labelField];
        if (label !== lastLabel) {
          let id = profile.labelField + f;
          let description = attributes[profile.descrField];
          let barNode = getEl(id);
          let ofs = $(barNode).offset();
          ofs.top += (profile.div.offsetHeight-profile.labelStyle.font_size)/2;
//          ofs.top += (profile.div.offsetHeight-profile.fontPixels)/2;
          let style = 'position:absolute;top:' + ofs.top + 'px;left:' + ofs.left + 'px;' + ObjToCss(profile.labelStyle);
          let labelEl = makeHtmlElement("div",null,/*"svgLabelText"*/null,style,label);
          labelEl.setAttribute("title", description);
          profile.textContainer.appendChild(labelEl);
        }
        lastLabel = label;
      }
    },

    makeBarChart: function(profile) {
      console.log("makeBarChart");
      for (f=1; f<this.features.length; f++) {
        let attributes = this.features[f].attributes;
        let id = profile.labelField + f;
        let x = attributes[profile.xField];
        let width = attributes[profile.widthField];
        let color = attributes[profile.colorField];
        profile.svgCode += '<rect id="' + id + '" x="' + x + '" y="0" width="' + width + '" height="100" style="fill:' + color + '"></rect>';
/*
        profile.svgCode += '<svg x="' + x + '" y="0" width="50" height="100" preserveAspectRatio="xMidYMax meet">';
        profile.svgCode += '<text x="' + x + '" y="50" fill="white" font-family="sans-serif" font-size="20">' + attributes[profile.labelField] + '</text></svg>';
*/
      }
      profile.svgCode += '</svg>';
      profile.div.innerHTML = profile.svgCode;
      profile.svgNode = profile.div.children[0];
      this.addBarLabels(profile);
    },

/*
    makeBar: function(profile, x, width, style ) {
      let barEl = document.createElement("rect");
      barEl.setAttribute("x", x);
      barEl.setAttribute("y", "0");
      barEl.setAttribute("width", width);
      barEl.setAttribute("height", "50%");
      barEl.setAttribute("style", style);
      profile.svgNode.appendChild(barEl);
    }
*/


  });
});

