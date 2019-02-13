/**
 * Created by Jim on 4/15/2016.
 */

var debug_mode = "console";     // Possible values:  null (no debug message), "alert" (use alert dialog), [anything else] (use console)
var justAK = false;

var popupsDocked = false;

/* Initial basemap.  Can be one of:
      streets, satellite, hybrid, topo, gray, dark-gray, oceans, national-geographic, terrain, osm,
      dark-gray-vector, gray-vector, streets-vector, topo-vector, streets-night-vector, streets-relief-vector, streets-navigation-vector     */
var startBasemap = "oceans";


// SZ video parameters
var minVideoLOD = 12;
var maxSZFeatures = 1000;    // get from query?     see UnitsPanelWidget, line 107, for an example.  Get value from  A.maxRecordCount
var maxExtentWidth = 100;     // maximal extent in kilometers for video

var aoosPhotosBaseUrl = "https://servomatic9000.axiomalaska.com/photo-server/";

var gpUrl = "https://alaskafisheries.noaa.gov/arcgis/rest/services/GroupDataExtract_new/GPServer/GroupDataExtract_new";     // URL for GroupDataExtract GP service

var offlineAppURL = "https://alaskafisheries.noaa.gov/mapping/szOffline/index.html";

//Map service URLs
// Pacific States server URLs
var szServerURLps = "https://geo.psmfc.org";
var szRestServicesURLps = szServerURLps + "/arcgis/rest/services";
var szMapServiceLayerURLps = szRestServicesURLps + "/NOAA/ShoreZoneFlexMapService/MapServer";

// NOAA server URLs
var szServerURLnoaa = "https://alaskafisheries.noaa.gov";
var szRestServicesURLnoaa = szServerURLnoaa + "/arcgis/rest/services";
var szMapServiceLayerURLnoaa = szRestServicesURLnoaa + "/ShoreZoneFlexMapService/MapServer";
var szMapServiceLayerURLnoaaNew = szRestServicesURLnoaa + "/ShoreZone/MapServer";
//var szMapServiceLayerURLnoaaNew = szRestServicesURLnoaa + "/ShoreZoneMapService/MapServer";

// Set default server URLs
var szServerURL = szServerURLnoaa;
var szRestServicesURL = szRestServicesURLnoaa;
var szMapServiceLayerURL = szMapServiceLayerURLnoaaNew;
var szSublayerIDs = {};
makeSublayerIdTable(szMapServiceLayerURL, szSublayerIDs);


var ssMapServiceLayerURL = szRestServicesURLnoaa + "/ShoreStation_wViews/MapServer";        // ShoreStation gives CORS error for some reason
var ssSublayerIDs = {};
makeSublayerIdTable(ssMapServiceLayerURL, ssSublayerIDs);

var faMapServiceLayerURL = szRestServicesURLnoaa + "/FishAtlas_wViews/MapServer";
var faSublayerIDs = {};
makeSublayerIdTable(faMapServiceLayerURL, faSublayerIDs);


var locateIconLayer;     // GraphicsLayer for displaying user location.  Used by Locate widget.
var layoutCode = "h2";     // default layout
var initTab = "szTab";

//var mapStuff;

//* process site parameters
var siteParsJSON = location.search.slice(1);
if (siteParsJSON !== "") {
  siteParsJSON = siteParsJSON.toLowerCase().replace(/&/g,'","').replace(/=/g,'":"');
  siteParsJSON = '{"' + siteParsJSON + '"}';
  var sitePars = JSON.parse(siteParsJSON);

  // for comparing performance of old and new SZ map services
  if (sitePars["db"] === "sql") {
    szMapServiceLayerURL = szMapServiceLayerURLnoaaNew;
    alert("Switching to SqlServer-based map service");
  }
  else if (sitePars["db"] === "sde") {
    szMapServiceLayerURL = szMapServiceLayerURLnoaa;
    alert("Switching to old map service");
  }
  else if (sitePars["db"] === "ps") {
    szMapServiceLayerURL = szMapServiceLayerURLps;
    alert("Switching to PSMFC map service");
  }

  // Use alternate offline app URL, if present in parameters
  if (sitePars["olurl"])
    offlineAppURL = sitePars["olurl"];

  if (sitePars["layout"])
    layoutCode = sitePars["layout"];

  if (sitePars["tab"])
    initTab = sitePars["tab"] + "Tab";
}


var sslMapServiceLayerURL = szRestServicesURL + "/Ports_SSL/MapServer";

var altMediaServer = "https://alaskafisheries.noaa.gov/mapping/shorezonedata/";
var VIDEO_SERVER = altMediaServer;
var PHOTO_SERVER = altMediaServer;
var VIDEO_FOLDER = "video/";

var current_photo_sub = "stillphotos_lowres";
var current_photo_prefix = "280_";
var current_video_file_prefix = "360_";
var current_video_path_prefix = "midres_";

var videoSnippetDownloadFolder = altMediaServer + VIDEO_FOLDER + "midres_mp4";
var youtubeAspectRatio = 16/9;
var photoAspectRatio = 4/3;

var extentDependentWidgets = [];
var szVideoWidget = null;
var szPhotoWidget = null;
var szUnitsWidget = null;
var faWidget = null;
var ssWidget = null;
var offLineLink = null;
var gp = null;      // for Geoprocessor

//  When a graphic is hovered over, these point to the graphic and the widget controlling the graphic
var minHoverTime = 500;     // Minimum hover time (ms) over a graphic before a new popup opens up
//var hitTestStartTime = null;
//var candidateGraphic = null;
var currentHoveredGraphic = null;
var currentWidgetController = null;
var hoverTimeout;

var image_message_timeout = false;

var sync_photos = true;
var lock_points = false;

// width was 20, trying larger values for iPad Mini
var playbackControlTemplate = '<img id="{0}" class="playbackControl" title="{1}" src="assets/images/{2} " width="24" onclick="mediaControl_clickHandler({3},\'{4}\')" />';

var settings = {
  autoRefresh: true,
  photoGap: 100
};
var settingsHtml = '<h3>Settings</h3>';
settingsHtml += '<h4>ShoreZone video/photo/unit marker settings:</h4>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="automatic" onchange="autoRefreshInputHandler(true)" checked>Generate markers whenever the map extent changes<br>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="manual" onchange="autoRefreshInputHandler(false)">Manually generate markers<br>';
settingsHtml += '<h4>Minimum distance in pixels between photo markers: <input type="number" id="input_photoGap" style="width: 6ch" onchange="photoGapInputHandler()" value="' + settings.photoGap + '"></h4>';

function autoRefreshInputHandler(isAutoRefresh) {
  settings.autoRefresh = isAutoRefresh;
  if (isAutoRefresh)
    setRefreshButtonVisibility(false);
}

function setRefreshButtonVisibility(isVisible) {
  var btnClass = "btn_refresh_inactive";
  if (isVisible)
    btnClass = "btn_refresh_active";
  getEl("btn_refresh").setAttribute("class", btnClass)
}

function photoGapInputHandler() {
  settings.photoGap = parseInt(getEl("input_photoGap").value);
  szPhotoWidget.clickableSymbolGap = settings.photoGap;
  //refreshFeatures();
}

// Returns string identifying the device type
function getDeviceType() {
  var agent = navigator.userAgent;
  if (agent.match(/Android/i))
    return "Android";
  if (agent.match(/BlackBerry/i))
    return "BlackBerry";
  if (agent.match(/iPhone|iPad|iPod/i))
    return "iOS";
  if (agent.match(/Opera Mini/i))
    return "Opera";
  if (agent.match(/IEMobile/i))
    return "WindowsMobile";
  if (agent.match(/Windows/i))
    return "Windows";
  if (agent.match(/Macintosh/i))
    return "OSX";
  return "UNKNOWN";
};

var deviceType = getDeviceType();
//debug("Device: " + deviceType);


/* General utilities */

function debug(txt, append, br, key_counter) {
  /*!
   * Debugging helper
   * \param string txt Text to display
   * \param bool append Append to text output
   * \param bool br Break lines
   */
  if (!debug_mode) return;      // No debug message if null

  if (typeof append === "undefined") append = true;
  if (typeof br === "undefined") br = true;
  if (typeof key_counter === "undefined") key_counter = 0;

  if (debug_mode==="alert")
    alert(txt);
  else if (window.console) {
    console.log(txt)
  } else { // emulate debug console on older browsers
    if ($("#debug").size() === 0) {
      $("body").append("<div id='debug' style='position:absolute; bottom: 5px; right: 5px; background-color: #FFF; opacity: 0.7; padding: 5px; max-height: 250px; overflow: auto; width: 300px; text-align: left;'></div>");
    }

    if (!append) $("#debug").html("");

    if (typeof txt === "object") {
      $.each(txt, function( key, value ) {
        debug(key + ": ", true, true, key_counter+1); debug(value, true, true, key_counter+1);
      });

      if (key_counter === 0) $("#debug").append("<br>");
    } else {
      $("#debug").append(txt + (br ? "<br>":" "));
    }

    $("#debug").scrollTop($("#debug")[0].scrollHeight);
  }
}

function asyncLoader(scriptName) {
  //  Javascript loader.
  var d=document,
    h=d.getElementsByTagName('head')[0],
    s=d.createElement('script');
  s.type='text/javascript';
  s.async=true;
  s.src = scriptName;
  h.appendChild(s);
}

function decDeg_to_DegMinSec(decDeg, axis) {
// axis is either "NS" for Lat or "EW" for Lon
  var dir = (decDeg<0 ? axis[0] : axis[1]);
  decDeg = Math.abs(decDeg);
  var d = Math.floor(decDeg);
  var decMin = 60*(decDeg - d);
  var m = Math.floor(decMin);
  var s = Math.round(60*(decMin - m));
  return ( d + "&deg;" + m + "' " + s + "\" " + dir);
}

function decDegCoords_to_DegMinSec(decLon, decLat) {
  return "Location: " +  decDeg_to_DegMinSec(decLat,"SN")  + ",  " + decDeg_to_DegMinSec(decLon,"WE");
  //return "Latitude: " +  decDeg_to_DegMinSec(decLat,"SN")  + ",  Longitude: " + decDeg_to_DegMinSec(decLon,"WE");
}


function makeHtmlFromTemplate(theTemplate, parameters) {
  var outHTML = '';
  for (var i=0; i<parameters.length; i++) {
    var A = parameters[i];
    var S = theTemplate;
    for (var j=0; j<A.length; j++) {
      var srch = '{' + j + '}';
      S = S.replace(srch, A[j]);
    }
    outHTML += S;
  }
  return outHTML;
}

function setContent(elName, text, append) {
  var el = getEl(elName);
  if (!el)
    return;
  var newContent = "";
  if (append)
    newContent = el.innerHTML;
  newContent += text;
  el.innerHTML = newContent;
}

function setMessage(elName, text, visible, fade) {
  // Show message in "elName"
  var el = getEl(elName);
  if (!el)
    return;
  if (visible === undefined)
    visible = true;
  if (image_message_timeout) clearTimeout(image_message_timeout);
  if (visible)
    el.style.visibility = "visible";
  else
    el.style.visibility = "hidden";
  if (text)
    el.innerHTML = text;
  if (fade)
    image_message_timeout = setTimeout(function() {el.style.visibility = "hidden";}, fade);
}


function setMessage_Mario(elName, params) {
  // Show message in "elName"   param hash message & visibility

  if (!params) params={"visible": false, "text": "..."}

  if (image_message_timeout) clearTimeout(image_message_timeout);

  if (params["visible"] === true)
    $("#"+elName).show()
  else if (params["visible"] === false)
    $("#"+elName).hide();

  if (params["text"])
    $("#"+elName).html(params["text"]);

  if (params["fade"]) {
    image_message_timeout = setTimeout(function() {$("#"+elName).hide();}, params["fade"]);
  }

}


/* Element display */

function setDisabled(id, value) {
  // Disable/enable (grey-out) HTML input element
  el = getEl(id);
  if (el)
    el.disabled = value;
}

function setVisible(id, value) {
  // Show/hide HTML element
  el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  var visibility = "hidden";
  if (value)
    visibility = "visible";
  el.style.visibility = visibility;
}

function isVisible(id) {
  // Show/hide HTML element
  el = getEl(id);
  if (!el)
    return false;
  if (el.style.visibility === "visible")
    return true;
  else
    return false;
}

function getEl(id) {
  return document.getElementById(id);
}

function showPanelContents(panelNames, show, disabledMsg) {
  /*
   Shows or hides the contents of a panel.
   To use, there must be a DIV named:    "panelEnabled_" + name
   and another DIV named:                "panelDisabled_" + name
   When "show" is true, the "disabled" DIV is displayed and the "enabled" DIV is hidden
   */
  var names = panelNames.split(",");
  for (var i=0; i<names.length; i++) {
    var panelDisabledDiv = getEl("panelDisabled_" + names[i]);
    var panelEnabledDiv = getEl("panelEnabled_" + names[i]);
    if (!panelDisabledDiv || !panelEnabledDiv)
      return;
    var panelDisabledDivStyle =panelDisabledDiv.style;
    var panelEnabledDivStyle = panelEnabledDiv.style;
    if (show) {
      panelDisabledDivStyle.visibility = "hidden";
      panelEnabledDivStyle.visibility = "visible";
    } else {
      panelDisabledDivStyle.visibility = "visible";
      panelEnabledDivStyle.visibility = "hidden";
      if (disabledMsg)
        getEl("disabledMsg_" + names[i]).innerText = "Hello!";
    }
  }
}


/* Click Handlers */

function lockImage_clickHandler() {
  szVideoWidget.setLockPoints(!lock_points);
}

function linkImage_clickHandler() {
   szVideoWidget.setSyncPhotos(!sync_photos);
}

function mediaControl_clickHandler(theWidget, action) {
  theWidget.playerControl(action);
}

function sliderHandler(divID) {
  document.getElementById(divID + "_content").style.opacity = document.getElementById(divID + "_slider").value/100;
}

function dropdownSelectHandler(w, index, ddElement) {
  var ddInfo = w.dropDownInfo[index];
  ddInfo.SelectedOption = ddElement.value;
  var newExtent = ddInfo.options[ddElement.selectedIndex]["extent"];
  if (newExtent)
    mapStuff.gotoExtent(newExtent);
  w.runQuery(view.extent);
}

function checkbox_showFeatures_clickHandler(clickableLayer, cb) {
  clickableLayer.visible = cb.checked;
}

function findAndChangePlaybackSpeed() {
  changePlaybackSpeed(document.getElementById('playback_speed_range').value);
}


// If parentObject has property indicated in propertyChain, returns the value of that property.  Otherwise, returns null
function getIfExists(parentObject, propertyChain) {
  var props = propertyChain.split(".");
  var lastIndex = props.length-1;
  var obj = parentObject;
  for (var p=0; p<lastIndex; p++) {
    obj = obj[props[p]];
    if (typeof(obj) !== "object")
      return null;
  }
  obj = obj[props[lastIndex]];
  if (typeof(obj) === "undefined")
    return null;
  else
    return obj;
}


/* Global SZ functions */

function makeMediaPlaybackHtml(controlsTemplate, controlsParameters, id, style) {
  if (id === undefined)
    id = ""
  if (style === undefined)
    style = ""
  var outHTML = '';
  outHTML += '';
  outHTML += '<div class="playbackControlContainer" id="' + id +'" style="' + style + '">';
  outHTML += makeHtmlFromTemplate(controlsTemplate, controlsParameters);
  outHTML += '</div>';
  return outHTML;
}

function clearGraphicFeatures() {
}

function updateNoFeaturesMsg(widgets, status) {
  // Sets messages to display in panels when no content is available to display.  Messages will be visible whenever zoomed out or zoomed in too far, or when waiting on query results
  var template = "";
  if (status === "zoomin")
    template = "Zoom in further to see {1}";
  else if (status === "querying")
    template = "Looking for {1} ...";
  else if (status === "zoomout")
    template = "No {1} in this view.<br><br>Zoom out or pan to see {1}.";
  widgets.forEach(function(w, index, array) {
    setMessage(w.disabledMsgDivName, template.replace(/\{1\}/g, w.disabledMsgInfix));
  });
}

function refreshFeatures() {
  resetCurrentFeatures();
  mapLoading = true;
  if (featureRefreshDue) {    // newExtent.width/1000 < maxExtentWidth
    updateNoFeaturesMsg(extentDependentWidgets, "querying");
    if (szVideoWidget)
      szVideoWidget.runQuery(view.extent);         // 3D: use extent3d?
    if (szUnitsWidget)
      szUnitsWidget.runQuery(view.extent);         // 3D: use extent3d?
  } else {
    updateNoFeaturesMsg(extentDependentWidgets, "zoomin");
  }
  setRefreshButtonVisibility(false);
}

function resetCurrentFeatures() {
  //locateIconLayer.removeAll();
  setDisabled("offlineAppButton", true);    // This is directly setting the "disabled" attribute of the button in the OfflineAppLink widget
  showPanelContents("video,photo,units", false);
  extentDependentWidgets.forEach(function(w, index, array) {
    w.clearGraphics();
  });
  //locateIconLayer.removeAll();
  setContent("offlineAppPanel", download_notZoomedInEnoughContent);
  //getEl("offlineAppPanel").innerHTML = download_notZoomedInEnoughContent;
}

function showCurrentFeatures() {
  setDisabled("offlineAppButton", false);   // This is directly setting the "disabled" attribute of the button in the OfflineAppLink widget
  showPanelContents("video,photo,units", true);
}


// Recursive function that determines the highest ancestor of the given sublayer (modified from TS)
function layerFirstAncestorName(mapService, layer ) {
  if ( layer.parent.title === mapService.title ) {
    return layer.title;
  }
  else {
    return layerFirstAncestorName(mapService, layer.parent )
  }
}


function queryServer(url, returnJson, responseHandler/*, pars*/) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      var R = this.responseText;
      if (returnJson)
        R = JSON.parse(R);
      responseHandler(R);
    }
  };
  var completeUrl = url;
  if (returnJson)
    completeUrl += "?f=pjson"
  xmlhttp.open("GET", completeUrl, true);
  xmlhttp.send();
}

function makeSublayerIdTable(serviceUrl, idTable) {
  queryServer(serviceUrl, true, function(R) {
    for (l in R.layers) {
      var o = R.layers[l];
      idTable[o.name] = o.id.toString();
    }
    for (t in R.tables) {
      var o = R.tables[t];
      idTable[o.name] = o.id.toString();
    }
  });
}

function makeClassArrayVisibilityObject(/*Object*/ obj) {  // Initialize obj with "classNames" array and "currClassName".  For example:  {classNames: ["sz", "fa", "ss"], currClassName: "sz"}
  // Using an array of css class names, manages the display of all HTML elements that have been assigned one of the classes in the array.
  // Calling .promoteClass with "newClassName" will make "newClassName" elements visible, and hide elements using any of the other class names in the array.
  // This is done by creating a style sheet element using the class names, and setting css "display" values for these

  obj.promoteClass = function(newClassName) {
    with (this) {
      var s = "";
      for (c in classNames) {
        s += "." + classNames[c] + " {display: ";
        if (classNames[c]===newClassName)
          s += "block";
        else s += "none";
        s += "}  ";
      }
      styleSheet.innerHTML = s;
      currClassName = newClassName;
    }
  }

  obj.styleSheet = document.createElement('style');
  document.body.appendChild(obj.styleSheet);
  obj.promoteClass(obj.currClassName);
  return(obj);
}

function openNewTab(url) {
  window.open(url);
}

function makeHtmlElement(tagName, theId, theClass, theStyle, theContent) {
  var el = document.createElement(tagName);
  if (theId)
    el.setAttribute("id", theId);
  if (theClass)
    el.setAttribute("class", theClass);
  if (theStyle)
    el.setAttribute("style", theStyle);
  if (theContent)
    el.innerHTML = theContent;
  return el;
}

var featureRefreshDue = false;      // True if extent has changed and new features have not been generated yet
var refreshFeaturesHtml = "<img id='btn_refresh' class='btn_refresh_inactive' src='assets/images/refresh24x24.png' onclick='refreshFeatures()' height='32px' width='32px' title='Click to refresh features' />";


/* For pan/zoom-to-rectangle toggle */
var panning = true;      // If not panning, then zooms to drawn rectangle
var panZoomHtml = "<img id='btn_pan' src='assets/images/i_pan.png' onclick='togglePanZoom(true)' height='32px' width='32px' title='Click to enable panning' /><hr>";
panZoomHtml += "<img id='btn_zoomRect' src='assets/images/i_zoomin.png' onclick='togglePanZoom(false)' height='32px' width='32px' title='Click to enable zoom-in to drawn rectangle' style='opacity: 0.2' />";

function togglePanZoom(mode) {
  panning = mode;
  var panningOpacity = 1;
  var zoomingOpacity = 1;
  if (panning)
    zoomingOpacity = 0.2;
  else
    panningOpacity = 0.2;
  getEl("btn_pan").style.opacity = panningOpacity;
  getEl("btn_zoomRect").style.opacity = zoomingOpacity;

}
/* For pan/zoom-to-rectangle toggle */

/* For extent history and prev/next extent navigation*/
var prevNextBtnsHtml = "<img id='btn_prevExtent' src='assets/images/backward.png' onclick='gotoSavedExtent(-1)' title='Click to go to previous extent' height='32px' width='32px' /><hr>";
prevNextBtnsHtml += "<img id='btn_nextExtent' src='assets/images/forward.png' onclick='gotoSavedExtent(1)' title='Click to go to next extent in history' height='32px' width='32px' style='opacity: 0.2' />";

var savedExtentsWidget = null;
var bookmarkSelected = false;
var currentBookmarkNumber = -1;

function gotoSavedExtent(offset) {
  var l = savedExtentsWidget.bookmarks.length;
  if (currentBookmarkNumber === -1)
    currentBookmarkNumber = l - 1;
  var n = currentBookmarkNumber + offset;
  if (n>=0 && n<l) {
    //TODO: handle this:  Uncaught Error: li had a span child removed, but there is now more than one. You must add unique key properties to make them distinguishable.
    //savedExtentsWidget.bookmarks.items[currentBookmarkNumber].thumbnail = "";
    //savedExtentsWidget.bookmarks.items[n].thumbnail = "assets/images/w_right_green.png";
    var currentBookmark = savedExtentsWidget.bookmarks.items[n];
    //currentBookmark.thumbnail.url = "assets/images/w_right_green.png";
    savedExtentsWidget.goTo(currentBookmark);
    var prevButton = getEl("btn_prevExtent");
    var nextButton = getEl("btn_nextExtent");
    prevButton.style.opacity = 1;
    nextButton.style.opacity = 1;
    if (n === 0)
      prevButton.style.opacity = 0.2;
    if (n === l - 1)
      nextButton.style.opacity = 0.2;
    currentBookmarkNumber = n;
  }
}
/* For extent history and prev/next extent navigation*/


function simulateMouseEvent(el, evType) {
  var event = new MouseEvent(evType, {
    view: window,
    bubbles: true,
    cancelable: true
  });
  var cancelled = !el.dispatchEvent(event);
  if (cancelled) {
    // A handler called preventDefault.
    console.log("cancelled");
  } else {
    // None of the handlers called preventDefault.
    console.log("not cancelled");
  }
}

function isInViewport(el, scrollWindow) {
  var elementTop = $(el).offset().top;
  var elementBottom = elementTop + $(el).outerHeight();
  var viewportTop = $(scrollWindow).offset().top;
  var viewportBottom = viewportTop + $(scrollWindow).height();
  return elementTop >= viewportTop && elementBottom <= viewportBottom;
};

var mapStuff;

// For debug purposes
function test() {
  //map.layers.reorder(labelsLayer, map.layers.items.length-1);
  alert("This is a test.");
}




/* Unused functions

 function distinct(theArray) {
 var L = "/";
 for (var i=0; i<theArray.length; i++) {
 var S = theArray[i];
 if (L.indexOf("/" + S + "/") === -1)
 L += S + "/";
 }
 if (L === "/")
 L = "";
 else
 L = L.slice(1,L.length-1);
 return L.split("/");
 }

 function padString(str, len, mode) {
 // "mode" can be "left", "right" or "both"
 var outstr = str;
 var leftSide = false;
 if (mode==="left")
 leftSide = true;
 while (outstr.length < len) {
 if (mode==="both")
 leftSide = !leftSide;
 if (leftSide)
 outstr = " " + outstr;
 else
 outstr = outstr + " ";
 }
 return outstr;
 }

function getSubLayerID(mapImageLayer, subLayerName) {
  var li = mapImageLayer.allSublayers;
  for (var i=0; i<li.length; i++) {
    //if (li.items[i].title.indexOf(subLayerName) !== -1)      // option to find when layer has DB prefixes
    if (li.items[i].title === subLayerName)
      return li.items[i].id;
  }
  return -1;
}

function getSubLayerUrl(mapImageLayer, subLayerName) {
  return this.mapServiceLayer.url + "/" + getSubLayerID(mapImageLayer, subLayerName).toString();
}

*/
