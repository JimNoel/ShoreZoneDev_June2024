
/**
 * Class FaSsQuery
 *
 * Module for querying Fish Atlas and Shore Station tables
 */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "esri/layers/MapImageLayer",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask"
], function(declare, lang, MapImageLayer, Query, QueryTask) {
/*
  function getSubLayerID(mapImageLayer, layerPathArray) {
    // finds sublayer ID recursively
    var li = mapImageLayer.sublayers;
    var layerName = layerPathArray[0];
    for (var i=0; i<li.length; i++) {
      if (li.items[i].title==layerName) {
        if (layerPathArray.length == 1)
          return li.items[i].id;
        else
          return getSubLayerID(li.items[i], layerPathArray.slice(1));
      }
    }
    return -1;
  }
*/

  function makeLayerIDsObject(serviceUrl) {
    // CAN I GET TABLES, OR JUST SUBLAYERS?
    var sublayerIDs = new Object();
    var layer = new MapImageLayer({ url: serviceUrl});
    layer.load();
    layer.watch("loaded", function(){
      // CAN I GET TABLES, OR JUST SUBLAYERS?
      var sublayers = layer.allSublayers;
      for (L in sublayers.items) {
        console.log("makeLayerIDsObject");
      }
      return sublayerIDs;
    });
  }

  return declare(null, {

    constructor: function(serviceUrl/*kwArgs*/) {
      //lang.mixin(this, kwArgs);
      this.serviceUrl = serviceUrl;
      //this.layerIDs = makeLayerIDsObject(this.serviceUrl);
      console.log("FaSsQuery object created.");
    },     // end of constructor

    submitQuery: function(tableID, whereClause, handler) {
      this.queryTask = new QueryTask(this.serviceUrl + "/" + tableID);
      this.query = new Query();
      with (this.query) {
        outFields =  ["*"];
        //orderByFields = [];
        if (whereClause)
          where = whereClause;
        else
          where = "1=1";
      }
      this.queryTask.execute(this.query).then(function(results){
        //alert("Query execution complete.");
        handler(results);
      });

      console.log("submitQuery");
    }

});   // end of return clause

});   // end of define clause