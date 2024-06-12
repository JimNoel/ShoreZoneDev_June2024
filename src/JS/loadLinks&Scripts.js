/**
 *   Sets ESRI SDK version
 *   loads Dojo, ESRI & NOAA CSS files
 *   loads ESRI SDK
 *   Loads page layout (via layout.js module)
 */


let esriVersion = "4.28";     // Attempt to keep ESRI version in one place -- doesn't work with the HTML statements

function loadCSS(path) {
//  if(filesAdded.indexOf('styles.css') !== -1)
//    return

  let head = document.getElementsByTagName('head')[0]

  // Creating link element
  let style = document.createElement('link')
  style.href = path
  style.type = 'text/css'
  style.rel = 'stylesheet'
  head.append(style);

  // Adding the name of the file to keep record
//  filesAdded += ' styles.css'
}

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

loadCSS("https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dijit/themes/claro/claro.css");
loadCSS("https://js.arcgis.com/" + esriVersion + "/esri/css/main.css");
loadCSS("https://ajax.googleapis.com/ajax/libs/dojo/1.14.1/dojox/layout/resources/ExpandoPane.css");
loadCSS("https://unpkg.com/dgrid@1.3.3/css/dgrid.css");
loadCSS("SZ_wLayout.css");

// Load ArcGIS JS API, using esriVersion
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
