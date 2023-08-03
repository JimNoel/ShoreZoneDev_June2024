/**
 * Class noaaExpandoPane
 *
 * Subclass of Dojo ExpandoPane, with modifications
 *
*/

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojox/layout/ExpandoPane",
], function(declare, lang, ExpandoPane){


  return declare(ExpandoPane, {


    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

    },

    toggle: function() {
      this.inherited(arguments);
      window.setTimeout(panelResizeHandler, 500);
    },

    expanded: function() {
      return this._showing;
    }


  });
});

