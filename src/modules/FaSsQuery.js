
/**
 * Class FaSsQuery
 *
 * Module for querying Fish Atlas and Shore Station tables
 */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "esri/core/Collection",
  "esri/request",
  "esri/renderers/support/jsonUtils",
  "esri/layers/MapImageLayer",
  "esri/layers/FeatureLayer",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask"
], function(declare, lang, Collection, esriRequest, jsonUtil, MapImageLayer, FeatureLayer, Query, QueryTask) {

  return declare(null, {

    constructor: function(kwArgs) {
      lang.mixin(this, kwArgs);
      this.makeTableIdList(this);
      console.log("FaSsQuery object created.");
    },     // end of constructor


    makeTableIdList: function(w) {
      var theUrl = w.serviceUrl + "/layers?f=pjson";
      esriRequest(theUrl, {
        responseType: "json"
      }).when(function(response){
        var data = response.data;

        w.tableIDs = new Object();      // Make associative array of table IDs that can be accessed via w.tableIDs["<table name>"]
        for (i in data.tables) {
          var o = data.tables[i];
          w.tableIDs[o.name] = o.id;
        }

        w.sublayerIDs = new Object();      // Make associative array of sublayer IDs that can be accessed via w.sublayerIDs["<sublayer name>"]
        for (i in data.layers) {
          var o = data.layers[i];
          w.sublayerIDs[o.name] = o.id;
        }

        w.layers = new Object();
        for (var i=0; i< w.areaOptions.length; i++) {
          var a = w.areaOptions[i];
          if (w[a]) {
            var slName = w[a].subLayerName;
            var slId = w.sublayerIDs[slName];
            var slInfo = data.layers[slId];
            w[a].subLayerInfo = slInfo;
            var rend = jsonUtil.fromJSON(slInfo.drawingInfo.renderer);
            var graphics = new Collection();
            var f = new FeatureLayer({
              fields: slInfo.fields,
              objectIdField: w.getObjectIdField(slInfo.fields),
              geometryType: slInfo.geometryType,
              spatialReference: slInfo.extent.spatialReference,
              source: graphics,
              renderer: rend
            });
            w.layers[a] = f;
            w.map.add(w.layers[a]);
            console.log(a + " feature layer added");
          }
        };
      });
      },

    createLegend: function(layerInfo) {
      var rend = jsonUtil.fromJSON(layerInfo.drawingInfo.renderer);
    },

    queryAreaOptionInfo: function(w, areaOption) {
      if (!w[areaOption])
        return;                 // only run function if w has an areaOption property
      var theUrl = w.serviceUrl + "/" + w.sublayerIDs[w[areaOption].subLayerName] + "?f=pjson";

      esriRequest(theUrl, {
        //callbackParamName: 'callback',
        responseType: "json"
      }).when(w.createLegend);

      queryServer(theUrl, true, function(jsonResponse) {
        w[areaOption].subLayerInfo = jsonResponse;
        //w[areaOption].fields = jsonResponse.fields;
        var rend = jsonUtil.fromJSON(jsonResponse.drawingInfo.renderer);
        var sli = w[areaOption].subLayerInfo;
        var graphics = new Collection();
        w.layers[areaOption] = new FeatureLayer({
          fields: sli.fields,
          objectIdField: w.getObjectIdField(sli.fields),
          geometryType: sli.geometryType,
          spatialReference: sli.extent.spatialReference,
          source: graphics,
          renderer: rend    // sli.drawingInfo.renderer
        });
        w.map.add(w.layers[areaOption]);
        console.log(areaOption + " feature layer added");
      });
    },

    getObjectIdField: function(fields) {
      for(f in fields) {
        var field = fields[f];
        if (field.type == "esriFieldTypeOID")
          return field.name;
      }
      return null;
    },

    submitQuery: function(w, tableName, whereClause, handler) {
      this.queryTask = new QueryTask(this.serviceUrl + "/" + this.tableIDs[tableName]);
      this.query = new Query();
      with (this.query) {
        outFields =  ["*"];
        //orderByFields = [];
        if (whereClause)
          where = whereClause;
        else
          where = "1=1";
        returnGeometry = true;      // Returned geometry is null if query is on a table
      }

      this.queryTask.execute(this.query).when(function(results){
        if (handler)
          handler(results);
        else {
          alert("No handler");
        };
      }, function(error){
        console.error(error);
      });

      console.log("submitQuery");
    }

});   // end of return clause

});   // end of define clause