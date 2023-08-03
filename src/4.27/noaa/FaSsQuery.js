
/**
 * Class FaSsQuery
 *
 * Module for querying Fish Atlas and Shore Station tables
 */

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "esri/layers/MapImageLayer",
  "esri/rest/Query",
  "esri/layers/graphics/sources/support/QueryTask"
], function(declare, lang, MapImageLayer, Query, QueryTask) {

  return declare(null, {

    constructor: function(serviceUrl) {
      this.serviceUrl = serviceUrl;
    },

    submitQuery: function(tableID, whereClause, handler) {
      this.queryTask = new QueryTask(this.serviceUrl + "/" + tableID);
      this.queryTask.url = this.serviceUrl + "/" + tableID;
      this.query = new Query();
      let q = this.query;
      q.outFields =  ["*"];
      if (whereClause)
        q.where = whereClause;
      else
        q.where = "1=1";
      this.queryTask.execute(this.query).then(function(results){
        handler(results);
      });
      console.log("submitQuery");
    }

  });

});