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


define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, QueryBasedPanelWidget){


  return declare(QueryBasedPanelWidget, {


    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);
      
      console.log("ChartPanelWidget created");

      this.processData = function(results) {
        console.log("ChartPanelWidget processData function");
        let features = results.features;
        this.features = features;
        if (this.noFeatures(features))
          return;
        console.log(features.length + " profile points");

      };



    }

  });
});

