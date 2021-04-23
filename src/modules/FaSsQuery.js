
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

  return declare(null, {

    constructor: function(serviceUrl) {
      this.serviceUrl = serviceUrl;
    },

    submitQuery: function(tableID, whereClause, handler) {
      this.queryTask = new QueryTask(this.serviceUrl + "/" + tableID);
      this.query = new Query();
      with (this.query) {
        outFields =  ["*"];
        if (whereClause)
          where = whereClause;
        else
          where = "1=1";
      }
      this.queryTask.execute(this.query).then(function(results){
        handler(results);
      });

      console.log("submitQuery");
    }

  });

});