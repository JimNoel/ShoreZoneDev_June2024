/**
 * Class UnitsPanelWidget
 *
 * Widget for unit display
 *   subclass of QueryBasedTablePanelWidget
 *
 * Constructor arguments:
 *    mapServiceLayer: MapImageLayer
 *    layerName: String     name of a sublayer of mapServiceLayer
 *    panel: ContentPane    panel where processed query results are displayed
 *    -- perhaps other args for outFields and where clause?
 */

/*
function getFieldInfo(id) {
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      let A = JSON.parse(this.responseText);
      //window.open(offlineAppURL + "?" + A.jobId, "Shorezone Offline");
    }
  };
  let baseURL = "https://alaskafisheries.noaa.gov/arcgis/rest/services/ShoreZoneFlexMapService/MapServer/"
  xmlhttp.open("GET", baseURL + id + "?f=pjson", true);
  xmlhttp.send();
};
*/

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dgrid/Grid",
  "noaa/QueryBasedTablePanelWidget"
], function(declare, lang, Grid, QueryBasedTablePanelWidget){


  return declare(QueryBasedTablePanelWidget, {


    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);
      
      this.UnitAttrsInfo = [];

      this.tableColumns = [];
      let colPos = 1;     // Used to place columns in proper order.  Starts with 1, because PHY_IDENT is already in the array at position 0
      let subLayers = szMapServiceLayer.allSublayers.items;
      for (let i=subLayers.length-1; i>0; i--) {
        if (!subLayers[i].sublayers) {
          let pTitle = layerFirstAncestorName(szMapServiceLayer, subLayers[i]);      // subLayers[i].parent.title;
          if (pTitle==="Derived ShoreZone Attributes" || pTitle==="Response Attributes" || pTitle==="Biological Attributes") {
            if (subLayers[i].title !=="Salt Marsh (all regions)") {     // This sublayer is created in the map file, hence not available in AK_Unit_Lines_wAttrs
              this.getUnitAttrInfo(subLayers[i].id, this, colPos);
              colPos += 1;
            }
          }
        }
      }


      this.findAttrInfoObj = function(a) {
        for (let i=0; i<this.UnitAttrsInfo.length; i++) {
          if (this.UnitAttrsInfo[i] && this.UnitAttrsInfo[i].field1 === a)
            return this.UnitAttrsInfo[i];
        }
        return null;
      };

      // This method overrides the original method in QueryBasedPanelWidget.js
      this.attrName = function(a) {
        let o = this.findAttrInfoObj(a);
        if (o) {
          return o.name;
        } else {
          return a;
        }
      };

      // This method overrides the original method in QueryBasedPanelWidget.js
      this.attrValDescription = function(attrName, attrValue) {
        let o = this.findAttrInfoObj(attrName);
        if (o) {
          return o.descrLookup[attrValue];
        } else {
          return attrValue;
        }
      };

/*
      this.attrValDescription = function(a, attrs) {
        let o = this.findAttrInfoObj(a);
        if (o) {
          return o.descrLookup[attrs[a]];
        } else {
          return attrs[a];
        }
      };

*/

    },

    getUnitAttrInfo: function (id, w, colPos) {
      let xmlhttp = new XMLHttpRequest();
      xmlhttp.onreadystatechange = function() {
        if (this.readyState === 4 && this.status === 200) {
          let A = JSON.parse(this.responseText);
          let o = new Object();
          o.id = id;
          o.name = A.name;
          let r = A.drawingInfo.renderer;
          o.field1 = r.field1;
          o.field2 = r.field2;

          let valueInfos = r.uniqueValueInfos;
          let descrLookup = new Object();
          for (vi in valueInfos) {
            let value = valueInfos[vi].value;
            if (o.field2)
              value = value.split(",")[0];
            descrLookup[value] = valueInfos[vi].label;
          }
          o.descrLookup = descrLookup;

          w.UnitAttrsInfo[id] = o;
          if (o.field1)
            w.featureOutFields[colPos] = o.field1;
          else
            console.log("Bad rendering definition for layer '" + o.name + "' in map service.")
          //unitAttrsInfo[id] = o;
        }
      };      //.bind(unitAttrsInfo);
      let baseURL = szMapServiceLayerURL + "/";
      xmlhttp.open("GET", baseURL + id + "?f=pjson", true);
      xmlhttp.send();
    }

  });
});

