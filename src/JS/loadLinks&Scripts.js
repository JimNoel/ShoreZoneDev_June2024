/**
 *   Sets ESRI SDK version
 *   loads Dojo, ESRI & NOAA CSS files
 *   loads ESRI SDK
 *   Loads page layout (via layout.js module)
 */


let esriVersion = "4.31";     // Latest version is 4.33, 6/2025
/*
current devel version of site uses 4.31
4.32 adds more vertical spacing to the LayerList
4.33 (https://developers.arcgis.com/javascript/latest/release-notes):
  New CDN endpoints
  No longer using "require", now using "$arcgis.import()"
 */

// Function to load style sheet specified by path
function loadCSS(path) {
  // Get document <head> section
  let head = document.getElementsByTagName('head')[0]

  // Create link element for style sheet
  let style = document.createElement('link')
  style.href = path
  style.type = 'text/css'
  style.rel = 'stylesheet'

  // Append to the document
  head.append(style);
}

// Defines namespaces for Dojo, ESRI and NOAA packages
window.dojoConfig = {
  packages: [
    {
      name: "dojo",
      location: "https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dojo"
    },
    {
      name: "dijit",
      location: "https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dijit"
    },
    {
      name: "dojox",
      location: "https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dojox"
    },
    {
      name: "dgrid",
      location: "https://unpkg.com/dgrid@1.3.3/"      // latest version: 1.3.3 (November 2023)    // 1.1.0
    },
    {
      name: "dstore",
      location: "https://unpkg.com/dojo-dstore@1.2.1/"      // latest version: 1.2.1 (November 2023)    // 1.1.1
    },
    {
      name: "esri",
      location: "https://js.arcgis.com/" + esriVersion + "/esri",
    },
    {
      name: "noaa",
      location: "modules"
    },
  ],
  has: { "esri-promise-compatibility": 1 },
  parseOnLoad: true,
  tlmSiblingOfDojo: false,
  baseUrl: "./"
};

// Call loadCSS several times, to load specified style sheets
loadCSS("https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dijit/themes/claro/claro.css");
loadCSS("https://js.arcgis.com/" + esriVersion + "/esri/css/main.css");
loadCSS("https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dojox/layout/resources/ExpandoPane.css");
loadCSS("https://unpkg.com/dgrid@1.3.3/css/dgrid.css");
loadCSS("SZ_wLayout.css");

// Load ArcGIS JS API, using esriVersion
// On loading this, a handler function loads various Dojo modules, as well as the NOAA MapStuffWidget and layout widgets
jQuery.getScript("https://js.arcgis.com/" + esriVersion + "/", function() {

  // "require" statement runs after the ESRI SDK has finished loading
  require([
    "dojo/on",
    "dojo/dom",
    "dijit/registry",
    "dijit/layout/BorderContainer",
    "dijit/layout/ContentPane",
    "dijit/layout/TabContainer",
    "noaa/noaaExpandoPane",
    "dojox/layout/FloatingPane",
    "noaa/MapStuffWidget",
    "noaa/layout",
    "dojo/domReady!"
  ], function(on, dom, registry, BorderContainer, ContentPane, TabContainer, ExpandoPane, FloatingPane, MapStuffWidget, Layout){

  });

});
