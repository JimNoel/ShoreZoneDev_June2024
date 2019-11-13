/**
 * Created by Jim on 4/15/2016.
 */

let debug_mode = "console";     // Possible values:  null (no debug message), "alert" (use alert dialog), [anything else] (use console)
let justAK = false;

let popupsDocked = false;

/* Initial basemap.  Can be one of:
      streets, satellite, hybrid, topo, gray, dark-gray, oceans, national-geographic, terrain, osm,
      dark-gray-vector, gray-vector, streets-vector, topo-vector, streets-night-vector, streets-relief-vector, streets-navigation-vector     */
let startBasemap = "oceans";


// SZ video parameters
let minVideoLOD = 12;
let maxSZFeatures = 6000;    // More than 2000 causes the browser to slow significantly  (for example, 5000 points causes 10-minute hang-up)
let maxExtentWidth = 100;     // maximal extent in kilometers for video   -- dropped back from 100 because it's too slow
let highlightSize = 15;

let aoosQueryBaseUrl = "https://servomatic9000.axiomalaska.com/spatial-imagery/alaska_shorezone/imageMetadata?callback=jQuery111107511455304335468_1552688607085&x={lon}&y={lat}&width=300&height=300&_=1552688607089";
let aoosPhotosBaseUrl = "https://servomatic9000.axiomalaska.com/photo-server/";

let gpUrl = "https://alaskafisheries.noaa.gov/arcgis/rest/services/GroupDataExtract_new/GPServer/GroupDataExtract_new";     // URL for GroupDataExtract GP service

let offlineAppURL = "https://alaskafisheries.noaa.gov/mapping/szOffline/index.html";

//Map service URLs
// Pacific States server URLs
let szServerURLps = "https://geo.psmfc.org";
let szRestServicesURLps = szServerURLps + "/arcgis/rest/services";
let szMapServiceLayerURLps = szRestServicesURLps + "/NOAA/ShoreZoneFlexMapService/MapServer";

// NOAA server URLs
let szServerURLnoaa = "https://alaskafisheries.noaa.gov";
let szRestServicesURLnoaa = szServerURLnoaa + "/arcgis/rest/services";
let szMapServiceLayerURLnoaa = szRestServicesURLnoaa + "/ShoreZoneFlexMapService/MapServer";
let szMapServiceLayerURLnoaaNew = szRestServicesURLnoaa + "/ShoreZone/MapServer";
//let szMapServiceLayerURLnoaaNew = szRestServicesURLnoaa + "/ShoreZoneMapService/MapServer";

// Set default server URLs
let szServerURL = szServerURLnoaa;
let szRestServicesURL = szRestServicesURLnoaa;
let szMapServiceLayerURL = szMapServiceLayerURLnoaaNew;
let szSublayerIDs = {};

let videoClipURLs = "";    // For download of video clips for currnt extent

let settings = {
  autoRefresh: true,
  photoGap: 50
};
let settingsHtml = '<h3>Settings</h3>';
settingsHtml += '<h4>ShoreZone video/photo/unit marker settings:</h4>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="automatic" onchange="autoRefreshInputHandler(true)" checked>Generate markers whenever the map extent changes<br>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="manual" onchange="autoRefreshInputHandler(false)">Manually generate markers<br>';
settingsHtml += '<h4>Minimum distance in pixels between photo markers: <input type="number" id="input_photoGap" style="width: 6ch" onchange="photoGapInputHandler()" value="' + settings.photoGap + '"></h4>';
settingsHtml += '<h4><input type="checkbox" id="cb_showVideoMarkers" onClick="cbShowMediaHandler(szVideoWidget,false)">Show video markers<br>';
settingsHtml += '<input type="checkbox" id="cb_showPhotoMarkers" checked onClick="cbShowMediaHandler(szPhotoWidget,true)">Show photo markers</h4>';

let ssMapServiceLayerURL = szRestServicesURLnoaa + "/ShoreStation_2019/MapServer";        // ShoreStation gives CORS error for some reason
let ssSublayerIDs = {};
makeSublayerIdTable(ssMapServiceLayerURL, ssSublayerIDs);

let faMapServiceLayerURL = szRestServicesURLnoaa + "/FishAtlas_wViews/MapServer";
let faSublayerIDs = {};
makeSublayerIdTable(faMapServiceLayerURL, faSublayerIDs);

let basemapIds = [
  "oceans",
  "satellite",
  "hybrid",
  "topo",
  //"topo-vector",
  "streets",
  //"streets-vector",
  "national-geographic",
  "osm",
  "terrain",
  "dark-gray",
  //"dark-gray-vector",
  "gray",
  //"gray-vector",
  "streets-navigation-vector",
  "streets-relief-vector",
  "streets-night-vector"
];

let locateIconLayer;     // GraphicsLayer for displaying user location.  Used by Locate widget.
let layoutCode = "h2";     // default layout
let initTab = "szTab";

const legendFilters = [
  {serviceName: "ShoreZone", fieldName: "HabClass", layerTitle: "Habitat Class", delimiter: ","},
  {serviceName: "ShoreZone", fieldName: "BC_CLASS", layerTitle: "Coastal Class", delimiter: ","},
  {serviceName: "ShoreZone", fieldName: "ESI", layerTitle: "Environmental Sensitivity Index (ESI)", delimiter: ","}
];

let nonNullList = null;

function filterLegend(serviceName, nonNullList) {
  if (!nonNullList)
    return;
  for (let i=0; i<legendFilters.length; i++) {
    let f = legendFilters[i];
    let fieldNonNulls = nonNullList[f.fieldName];
    if (f.serviceName === serviceName) {
      for (d of f.contentDiv.children) {
        let A = d.id.split("_");
        if (fieldNonNulls.includes(A[A.length-1]))
          d.style.display = "block";    // "inline";
        else
          d.style.display = "none";
      }
    }
  }
}


//* process site parameters
let siteParsJSON = location.search.slice(1);
if (siteParsJSON !== "") {
  siteParsJSON = siteParsJSON.toLowerCase().replace(/&/g,'","').replace(/=/g,'":"');
  siteParsJSON = '{"' + siteParsJSON + '"}';
  let sitePars = JSON.parse(siteParsJSON);

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

makeSublayerIdTable(szMapServiceLayerURL, szSublayerIDs);

let sslMapServiceLayerURL = szRestServicesURL + "/Ports_SSL/MapServer";

let altMediaServer = "https://alaskafisheries.noaa.gov/mapping/shorezonedata/";
let mainMediaServer = "https://maps.psmfc.org/shorezonedata/";
let VIDEO_SERVER = altMediaServer;
let PHOTO_SERVER = mainMediaServer;
console.log(PHOTO_SERVER);
let VIDEO_FOLDER = "video/";

let current_photo_sub = "stillphotos_lowres";
let current_photo_prefix = "280_";
let current_video_file_prefix = "360_";
let current_video_path_prefix = "midres_";

let videoSnippetDownloadFolder = altMediaServer + VIDEO_FOLDER + "midres_mp4";
let youtubeAspectRatio = 16/9;
let photoAspectRatio = 4/3;

let serviceLayers = null;
let llServiceLayers = null;
let extentDependentWidgets = [];
let photoWidgets = [];

// QueryBasedPanelWidget declarations
let szVideoWidget = null;
let szPhotoWidget = null;
let szUnitsWidget = null;
let faWidget = null;
let faSpTableWidget = null;
let ssWidget = null;
let ssSpTableWidget = null;
let ssPhotoWidget = null;
let ssProfileWidget = null;
let faPhotoWidget = null;

let gp = null;      // for Geoprocessor
let llExpand = null;
let layerListWidget = null;
//let listItem_1s_legendHtml = null;
let listItem_10s_legendHtml = null;
let listItem_VideoFlightline = null;
let legendInfo = {};

//  When a graphic is hovered over, these point to the graphic and the widget controlling the graphic
let minHoverTime = 500;     // Minimum hover time (ms) over a graphic before a new popup opens up
//let hitTestStartTime = null;
//let candidateGraphic = null;
let currentHoveredGraphic = null;
let currentWidgetController = null;
let hoverTimeout;

let image_message_timeout = false;

let lock_points = false;

// width was 20, trying larger values for iPad Mini
let playbackControlTemplate = '<img id="{0}" class="playbackControl" title="{1}" src="assets/images/{2} " width="24" onclick="mediaControl_clickHandler({w},\'{3}\')" />';

function autoRefreshInputHandler(isAutoRefresh) {
  settings.autoRefresh = isAutoRefresh;
  if (isAutoRefresh)
    setRefreshButtonVisibility(false);
}

function setRefreshButtonVisibility(isVisible) {
  let btnClass = "btn_refresh_inactive";
  if (isVisible)
    btnClass = "btn_refresh_active";
  getEl("btn_refresh").setAttribute("class", btnClass)
}

function photoGapInputHandler() {
  settings.photoGap = parseInt(getEl("input_photoGap").value);
  szPhotoWidget.clickableSymbolGap = settings.photoGap;
  //refreshFeatures();
}

function cbShowMediaHandler(w, isPhotos) {
  let cbId = "cb_showVideoMarkers";
  if (isPhotos)
    cbId = "cb_showPhotoMarkers";
  //let isChecked = getEl(cbId).checked;
  let a = 0;
  if (getEl(cbId).checked)
    a = 1;
  w.clickableSymbol.color.a = a;

}

// Returns string identifying the device type
function getDeviceType() {
  let agent = navigator.userAgent;
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

let deviceType = getDeviceType();


/* General utilities */

function asyncLoader(scriptName) {
  //  Javascript loader.
  let d=document,
    h=d.getElementsByTagName('head')[0],
    s=d.createElement('script');
  s.type='text/javascript';
  s.async=true;
  s.src = scriptName;
  h.appendChild(s);
}

function decDeg_to_DegMinSec(decDeg, axis) {
// axis is either "NS" for Lat or "EW" for Lon
  let dir = (decDeg<0 ? axis[0] : axis[1]);
  decDeg = Math.abs(decDeg);
  let d = Math.floor(decDeg);
  let decMin = 60*(decDeg - d);
  let m = Math.floor(decMin);
  let s = Math.round(60*(decMin - m));
  return ( d + "&deg;" + m + "' " + s + "\" " + dir);
}

function decDegCoords_to_DegMinSec(decLon, decLat) {
  return "Location: " +  decDeg_to_DegMinSec(decLat,"SN")  + ",  " + decDeg_to_DegMinSec(decLon,"WE");
  //return "Latitude: " +  decDeg_to_DegMinSec(decLat,"SN")  + ",  Longitude: " + decDeg_to_DegMinSec(decLon,"WE");
}


function replaceFromArray(theTemplate, A) {
  let S = theTemplate;
  for (let j=0; j<A.length; j++) {
    let srch = '{' + j + '}';
    S = S.replace(srch, A[j]);
  }
  return S;
}

function makeHtmlFromTemplate(theTemplate, parameters, widgetId) {
  let outHTML = '';
  for (let i=0; i<parameters.length; i++) {
    let A = parameters[i];
    let S = theTemplate;
    for (let j=0; j<A.length; j++) {
      let srch = '{' + j + '}';
      S = S.replace(srch, A[j]);
    }
    S = S.replace('{w}', widgetId);
    outHTML += S;
  }
  return outHTML;
}

function setContent(elName, text, append) {
  let el = getEl(elName);
  if (!el)
    return;
  let newContent = "";
  if (append)
    newContent = el.innerHTML;
  newContent += text;
  el.innerHTML = newContent;
}

function setMessage(elName, text, visible, fade) {
  // Show message in "elName"
  let el = getEl(elName);
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

function setDisplay(id, value) {
  // Show/hide HTML element   NOTE: If other visible elements are in the parent element, these will shift to fill the missing space
  let el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  let display = "none";
  if (value)
    display = "block";
  el.style.display = display;
}

function setVisible(id, value) {
  // Show/hide HTML element
  el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  let visibility = "hidden";
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
  // If the arguent is a string, returns the element whose id is equal to the argument
  // If not a string, assume the argument is already an element, and return it
  if ((typeof id) === "object")
    return id;
  else
    return document.getElementById(id);
}

function showPanelContents(panelNames, show, disabledMsg) {
  /*
   Shows or hides the contents of a panel.
   To use, there must be a DIV named:    "panelEnabled_" + name
   and another DIV named:                "panelDisabled_" + name
   When "show" is true, the "disabled" DIV is displayed and the "enabled" DIV is hidden
   */
  let names = panelNames.split(",");
  for (let i=0; i<names.length; i++) {
    let panelDisabledDiv = getEl("panelDisabled_" + names[i]);
    let panelEnabledDiv = getEl("panelEnabled_" + names[i]);
    if (!panelDisabledDiv || !panelEnabledDiv)
      return;
    let panelDisabledDivStyle =panelDisabledDiv.style;
    let panelEnabledDivStyle = panelEnabledDiv.style;
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
   szVideoWidget.setSyncPhotos(!szVideoWidget.syncTo.sync_photos);
}

function mediaControl_clickHandler(theWidget, action) {
  theWidget.playerControl(action);
}

function sliderHandler(divID) {
  document.getElementById(divID + "_content").style.opacity = document.getElementById(divID + "_slider").value/100;
}

function setDropdownValue(ddInfo, value) {
  let ddDom = getEl(ddInfo.domId);
  ddDom.value = value;
  ddInfo.SelectedOption = value;
}

function dropdownSelectHandler(w, index, ddElement) {
  let ddInfo = w.dropDownInfo[index];
  ddInfo.SelectedOption = ddElement.value;
  let newExtent = ddInfo.options[ddElement.selectedIndex]["extent"];
  if (newExtent)
    mapStuff.gotoExtent(newExtent);
  w.runQuery(view.extent);
}

// TODO:  Generalize, so not specific to szUnitsWidget
function checkbox_showFeatures_clickHandler(w, cb) {
  let isChecked = cb.checked;
  w.clickableLayer.visible = isChecked;
  if (w.highlightLayer)
    w.highlightLayer.visible = isChecked;
  if (w.objName === "szUnitsWidget") {   // If for SZ Units, ensure both boxes are checked the same
    unitsCheckbox_showFeatures.checked = isChecked;
    unitsCheckbox2_showFeatures.checked = isChecked;
  }
}

function findAndChangePlaybackSpeed() {
  changePlaybackSpeed(document.getElementById('playback_speed_range').value);
}


// If parentObject has property indicated in propertyChain, returns the value of that property.  Otherwise, returns null
function getIfExists(parentObject, propertyChain) {
  let props = propertyChain.split(".");
  let lastIndex = props.length-1;
  let obj = parentObject;
  for (let p=0; p<lastIndex; p++) {
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

function makeMediaPlaybackHtml(controlsTemplate, controlsParameters, id, style, widgetId) {
  if (id === undefined)
    id = ""
  if (style === undefined)
    style = ""
  let outHTML = '';
  outHTML += '';
  outHTML += '<div class="playbackControlContainer" id="' + id +'" style="' + style + '">';
  outHTML += makeHtmlFromTemplate(controlsTemplate, controlsParameters, widgetId);
  outHTML += '</div>';
  return outHTML;
}

function clearGraphicFeatures() {
}

function updateNoFeaturesMsg(widgets, status) {
  // Sets messages to display in panels when no content is available to display.  Messages will be visible whenever zoomed out or zoomed in too far, or when waiting on query results
  let template = "";
  if (status === "zoomin")
    template = "Zoom in further to see {1}";
  else if (status === "querying")
    template = "<b>Looking for {1} ...</b>";
  else if (status === "toomany")
    template = "<b>Too many points.  Zoom in further.</b>";
  else if (status === "zoomout")
    template = "No {1} in this view.<br><br>Zoom out or pan to see {1}.";
  widgets.forEach(function(w, index, array) {
    setMessage(w.disabledMsgDivName, template.replace(/\{1\}/g, w.disabledMsgInfix));
  });
  //setDisplay("showUnitsDiv", false);      // Hide secondary unit features checkbox
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

function getSublayerServiceName(sublayer) {
  let l = sublayer;
  while (l.parent !== null)
    l = l.parent;
  return l.title;
}

function getDescendentLayer(layer, name) {
  if (layer.title === name)
    return layer;
  if (layer.children !== null) {
    let items = layer.children.items;
    for (let i=0; i<items.length; i++) {
      let l = getDescendentLayer(items[i], name);
      if (l !== null)
        return l;
    }
    return null;
  }

  let l = layer;
  while (l.children !== null) {
    let items = l.children.items;
    for (let i=0; i<items.length; i++) {
      if (items[i].title === name)
        return items[i];
    }
  }
  return null;
}

function queryServer(url, returnJson, responseHandler) {
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      let R = this.responseText;
      if (returnJson)
        R = JSON.parse(R);
      responseHandler(R);
    } else {
    }
  };
  let completeUrl = url;
  if (returnJson)
    completeUrl += "?f=pjson"
  xmlhttp.open("GET", completeUrl, true);
  xmlhttp.send();
}

function makeSublayerIdTable(serviceUrl, idTable) {
  queryServer(serviceUrl, true, function(R) {
    for (let l in R.layers) {
      let o = R.layers[l];
      idTable[o.name] = o.id.toString();
    }
    for (let t in R.tables) {
      let o = R.tables[t];
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
      let s = "";
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
  let el = document.createElement(tagName);
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

let featureRefreshDue = false;      // True if extent has changed and new features have not been generated yet
let refreshFeaturesHtml = "<img id='btn_refresh' class='btn_refresh_inactive' src='assets/images/refresh24x24.png' onclick='refreshFeatures()' height='32px' width='32px' title='Click to refresh features' />";

let unitsCb2_Id = "unitsCheckbox2_showFeatures";
let showUnitsCheckbox2 = '<input id="' + unitsCb2_Id  + '" type="checkbox" onclick="checkbox_showFeatures_clickHandler(szUnitsWidget,unitsCheckbox2_showFeatures)"><span style="background-color: #ff6060; opacity: 0.25">&emsp;&emsp;</span>'

/* For pan/zoom-to-rectangle toggle */
let panning = true;      // If not panning, then zooms to drawn rectangle
let panZoomHtml = "<div class='iconDiv'><img id='btn_pan' src='assets/images/i_pan.png' onclick='togglePanZoom(true)' height='24px' width='24px' title='Click to enable panning' class='icon_Active' /></div>";
panZoomHtml += "<div class='iconDiv'><img id='btn_zoomRect' src='assets/images/i_zoomin.png' onclick='togglePanZoom(false)' height='24px' width='24px' title='Click to enable zoom-in to drawn rectangle' class='icon_Inactive' /></div>";

function togglePanZoom(mode) {
  panning = mode;
  let panningClass = "icon_Active";
  let zoomRectClass = "icon_Inactive";
  if (!panning) {
    panningClass = "icon_Inactive";
    zoomRectClass = "icon_Active";
  }
  getEl("btn_pan").className = panningClass;
  getEl("btn_zoomRect").className = zoomRectClass;
}
/* For pan/zoom-to-rectangle toggle */

/* For extent history and prev/next extent navigation*/
let prevNextBtnsHtml = "<div class='iconDiv'><img id='btn_prevExtent' src='assets/images/backward.png' onclick='gotoSavedExtent(-1)' title='Click to go to previous extent' height='24px' width='24px' /></div>";
prevNextBtnsHtml += "<div class='iconDiv'><img id='btn_nextExtent' src='assets/images/forward.png' onclick='gotoSavedExtent(1)' title='Click to go to next extent in history' height='24px' width='24px' style='opacity: 0.2' /></div>";

let savedExtentsWidget = null;
let bookmarkSelected = false;
let currentBookmarkNumber = -1;

function gotoSavedExtent(offset) {
  let l = savedExtentsWidget.bookmarks.length;
  if (currentBookmarkNumber === -1)
    currentBookmarkNumber = l - 1;
  let n = currentBookmarkNumber + offset;
  if (n>=0 && n<l) {
    //TODO: handle this:  Uncaught Error: li had a span child removed, but there is now more than one. You must add unique key properties to make them distinguishable.
    //savedExtentsWidget.bookmarks.items[currentBookmarkNumber].thumbnail = "";
    //savedExtentsWidget.bookmarks.items[n].thumbnail = "assets/images/w_right_green.png";
    let currentBookmark = savedExtentsWidget.bookmarks.items[n];
    //currentBookmark.thumbnail.url = "assets/images/w_right_green.png";
    savedExtentsWidget.goTo(currentBookmark);
    let prevButton = getEl("btn_prevExtent");
    let nextButton = getEl("btn_nextExtent");
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
  let event = new MouseEvent(evType, {
    view: window,
    bubbles: true,
    cancelable: true
  });
  let cancelled = !el.dispatchEvent(event);
  if (cancelled) {
    // A handler called preventDefault.
    console.log("cancelled");
  } else {
    // None of the handlers called preventDefault.
    console.log("not cancelled");
  }
}

function isInViewport(el, scrollWindow) {
  let elementTop = $(el).offset().top;
  let elementBottom = elementTop + $(el).outerHeight();
  let viewportTop = $(scrollWindow).offset().top;
  let viewportBottom = viewportTop + $(scrollWindow).height();
  return elementTop >= viewportTop && elementBottom <= viewportBottom;
}

function makeDraggablePanel(divID, headerText, hasOpacitySlider, theClass, theStyle, theContent) {
  let divClass = "draggableDiv";
  if (theClass)
    divClass = theClass;
  let newDiv = makeHtmlElement("div", divID, divClass, theStyle, theContent);
  if (headerText || hasOpacitySlider) {
    let headerDiv = makeHtmlElement("div", divID + "_header", "draggableDivHeader");
    headerDiv.title = headerText;
    headerDiv.innerHTML = '<b id="' + divID + '_headerText" style="position:absolute;left:10px; top:0px">' + headerText + '</b>';
    headerDiv.innerHTML += '<input type="range" value="90" class="opacitySlider" oninput="sliderHandler(\'' + divID + '\')" id="' + divID + '_slider" >';
    let onClickFunction = "setDisplay('" + divID + "',false);";
    headerDiv.innerHTML += '<span class="close" title="Close panel" onclick=' + onClickFunction + '>&times;</span>';
    newDiv.appendChild(headerDiv);
  }
  newDiv.draggable = true;
  newDiv.ondragstart = panel_drag_start;
  newDiv.ondragover = panel_drag_over;
  newDiv.ondrop = panel_drop;
  let contentDiv = makeHtmlElement("div", divID + "_content", "draggableDivContent");
  contentDiv.innerHTML = "";
  if (theContent)
    contentDiv.innerHTML = theContent;
  newDiv.appendChild(contentDiv);
  document.body.appendChild(newDiv);
  return newDiv;
}

function panel_drag_start(event) {
  let style = window.getComputedStyle(event.target, null);
  let str = (parseInt(style.getPropertyValue("left")) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top")) - event.clientY)+ ',' + event.target.id;
  event.dataTransfer.setData("Text",str);
}

function panel_drop(event) {
  let offset = event.dataTransfer.getData("Text").split(',');
  let dm = getEl(offset[2]);
  dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
  dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
  event.preventDefault();
  return false;
}

function panel_drag_over(event) {
  event.preventDefault();
  return false;
}

function formatNumber_Commas(num) {
  return num.toString().replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,')
}

function formatNumber_Date(num) {
  let dateStr = new Date(num).toDateString();
  return dateStr.split(" ").slice(1).join(" ");
}

function resizeWidgets() {
  layerListWidget.container.style.maxHeight = (mapDiv.offsetHeight - 120) + "px";
}

function stripHtml(inStr) {
  let s = inStr;
  let p1 = s.indexOf("<");
  while (p1 !== -1) {
    let p2 = s.indexOf(">");
    s = s.slice(0,p1) + s.slice(p2+1);
    p1 = s.indexOf("<");
  }
  return s;
}

function resizeMedia() {
  ssProfileWidget.resize();
  photoWidgets.forEach(function(w, index, array) {
    w.resizeImg();
  });
  if (!youtube_player)
    return;
  let vDims = szVideoWidget.mediaDimensions(youtubeAspectRatio);
  youtube_player.setSize(vDims.width, vDims.height);
}

function panelResizeHandler() {
  resizeWidgets();
  resizeMedia();
}

let mapStuff;

function modify_LayerListItem_VideoFlightline() {
  // A hack to hide the 1s & 10s layers in the LayerList
  let subLayers = listItem_VideoFlightline.children.items;
  listItem_VideoFlightline.children.removeAll();    //  This removes 1s and 10s from Video Flightline, but also passes the selector checkbox to Video Flightline!
  listItem_VideoFlightline.panel = {
    content: makeHtmlElement("DIV", "videoFlightlineDiv", null, null, listItem_10s_legendHtml),
    open: true    // (item.visible && item.visibleAtCurrentScale)
  };
}
  /*    // Code stub (for above function) for including legends for both 1s and 10s, and hiding one of them depending on current visibilities of these layers
    let current1sVisibility = listItem_1s.visibleAtCurrentScale;
    setDisplay(content_1s, current1sVisibility);
    setDisplay(content_10s, !current1sVisibility);

    listItem_1s.watch("visibleAtCurrentScale", function(newValue, oldValue, property, object) {
      alert("1s visibility has changed!");
    });
  */

function ObjToCss(obj) {
  let s = "";
  for (p in obj) {
    let name = p.replace(/_/g,'-');
    let objType = typeof obj[p];
    if (objType === "string") {
      s += name + ":" +  obj[p] + ";";
    } else if (objType === "number") {
      s += name + ":" +  obj[p] + "px;";
    }
  }
  return s;
}


// For debug purposes
function test() {
  alert("Website last modified on  " + document.lastModified);
}

function logPoperties(obj) {
  for (p in obj)
    console.log(p + ":  " + (typeof obj[p]));
}


/* Unused functions

 function distinct(theArray) {
 let L = "/";
 for (let i=0; i<theArray.length; i++) {
 let S = theArray[i];
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
 let outstr = str;
 let leftSide = false;
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
  let li = mapImageLayer.allSublayers;
  for (let i=0; i<li.length; i++) {
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
