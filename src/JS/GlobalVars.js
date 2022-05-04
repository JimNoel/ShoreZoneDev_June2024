/**
 * Global variables and functions
 */

let test = false;    // For trying out things before comitting to code

let extentGraphic = null;
//let selExtent = null;

let justAK = false;

let csvDownloadFields = "R.SiteID,R.RawSite,R.Region,R.Location,R.Lat,R.Long,R.Habitat,R.EventID,R.RawEvent,R.Date,R.GearBasic,R.GearSpecific," +
  "R.SpCode,R.Sp_CommonName,R.Sp_ScientificName,R.Fam_CommonName,R.Fam_ScientificName,R.Unmeasured,R.Length_mm,R.LengthType,R.LifeStage," +
  "R.FMP,R.FMP_BSAI,R.FMP_GOA,R.FMP_Arctic,R.FMP_Salmon,R.Temp_C,R.Salinity,R.TidalStage,R.ProjectName,R.PointOfContact,R.PI,R.CiteID,R.doi";

let closeCode = "setVisible('siteInfoPanel', false)";
let siteInfoHtml = '<b class="bold1">Website Information</b><br><br><br>';
siteInfoHtml += '<b class="bold2">Most recent website update:  </b>' + document.lastModified.split(" ")[0] + '<br><br>';
siteInfoHtml += '<b class="bold2">Fish Atlas database updates:</b><br>';
siteInfoHtml += 'April 2022:  Added data from 1572 sites throughout Alaska';
siteInfoHtml += '<br><br><br><br><button style="position:absolute; right:5px; bottom: 5px" onclick="' + closeCode + '">Close</button>';


let altSzMediaServer = "https://alaskafisheries.noaa.gov/mapping/shorezonedata/";
let mainSzMediaServer = "https://maps.psmfc.org/shorezonedata/";
let ssPhotoServer = "https://alaskafisheries.noaa.gov/mapping/shorestationdata/compress75/";
let faPhotoServer = "https://alaskafisheries.noaa.gov/mapping/FishAtlasData/SitePhotos_ReducedSize/";
let szVideoServer = altSzMediaServer;
let szPhotoServer = mainSzMediaServer;

let faRestServiceURL = "https://alaskafisheries.noaa.gov/mapping/faREST/sql";

let showPopupsDefault = true;
let showPopups = showPopupsDefault;
//let popupsDocked = false;

/* Initial basemap.  Can be one of:
      streets, satellite, hybrid, topo, gray, dark-gray, oceans, national-geographic, terrain, osm,
      dark-gray-vector, gray-vector, streets-vector, topo-vector, streets-night-vector, streets-relief-vector, streets-navigation-vector     */
let startBasemap = "oceans";


// SZ video parameters
let minVideoLOD = 12;
let maxSZFeatures = 6000;    // More than 2000 causes the browser to slow significantly  (for example, 5000 points causes 10-minute hang-up)
let maxExtentWidth = 100;     // maximal extent in kilometers for video   -- dropped back from 100 because it's too slow
let highlightSize = 15;
let avg1sDist = 70;           // rough average distance between 1s points, in meters;
let videoFeatureSpacing = 100;     // Minimum number of pixels (horizontal) between video features

let gpUrlTemplate = "https://alaskafisheries.noaa.gov/arcgis/rest/services/{0}/GPServer/{0}";     // URL for GroupDataExtract GP service
let extractGpName = "SZDataExtract";
let gpUrl_extract = gpUrlTemplate.replace(/\{0\}/g, extractGpName);

let gpUrl_offlineExtract = gpUrlTemplate.replace(/\{0\}/g, "SZofflineDataExtract");
//*temp*/ let offlineAppURL = "https://alaskafisheries.noaa.gov/mapping/szOffline_test/index.html";
let offlineAppURL = "https://alaskafisheries.noaa.gov/mapping/szOffline/index.html";
let dlDataDialog = "";

//Map service URLs

let serverNames = ["ps", "noaa"];
let dfltServerNum = 0;    // Default value, sets default server to item in serverNames.
let currServerNum = dfltServerNum;
                      // TODO: If server fails, change this value and rebuild service URLs

let serverUrls = {
  noaa:  "alaskafisheries.noaa.gov",
  ps: "maps.psmfc.org"
}

let svcPathTemplate = {
  noaa:  {
    service:  "/arcgis/rest/services/{name}/MapServer",
    media:  "/mapping/{name}/"
  },
  ps:  {
    service:  "/server/rest/services/NOAA/{name}/MapServer",
    media:  "/{name}/"
  }
};

let fa2020msgShown = false;

function makeServiceUrls(type, name) {
  // Makes URLs for a map service or virtual directory
  let serviceUrls = [];
  for (let s=0; s<serverNames.length; s++) {
    let serverName = serverNames[s];
    let url = "https://" + serverUrls[serverName];
    let svcTemplate = svcPathTemplate[serverName][type];
    url += svcTemplate.replace("{name}", name);
    serviceUrls[s] = url;
  }
  return serviceUrls;
}


// Set server URLs (2-item arrays, containing NOAA and PS URLs)
let szMapServiceLayerURLs = makeServiceUrls("service", "ShoreZone");
//let szMapServiceLayerURLs = makeServiceUrls("service", "sz_dev");
//let szMapServiceLayerURLs = makeServiceUrls("service", "ShoreZone_w1000mVideo");
let ssMapServiceLayerURLs = makeServiceUrls("service", "ShoreStation_2019");
let faMapServiceLayerURLs = makeServiceUrls("service", "FishAtlas_v2020");
//let faMapServiceLayerURLs = makeServiceUrls("service", "dev/FishAtlas_v2020_dev");
//let faMapServiceLayerURLs = makeServiceUrls("service", "FishAtlas_wViews");
let sslMapServiceLayerURLs = makeServiceUrls("service", "Ports_SSL");

let szSublayerIDs = {};


/* Sublayer display settings.
     "listMode" (default "show") determines whether the sublayer shows up in the LayerList
     "visible"  (default "true") determines whether the sublayer is currently visible in the map
*/

/*
let szDisplayInfo = [
  {title: "AK_UNIT_LINES_WATTRS", visible: false, listMode: "hide"},
  {title: "AK_UNIT_LINES_WATTRS_wXSHR", visible: false, listMode: "hide"},
];
*/

let faDisplayInfo = [
  {title: "Regions", visible: false, listMode: "show"},
  {title: "Sites_background", visible: true},     //, listMode: "hide"},
  {title: "Sites", visible: false},
/*
  {title: "vw_CatchStats_RegionsGear", visible: false, listMode: "hide"},
  {title: "vw_CatchStats_Sites", visible: false, listMode: "hide"},
  {title: "vw_CatchStats_SitesGear", visible: false, listMode: "hide"},
  {title: "vw_CatchStats_SitesHabitats", visible: false, listMode: "hide"},
  {title: "vw_CatchStats_SitesSpecies", visible: false, listMode: "hide"},
  {title: "vw_CatchStats_SitesHabitatsSpecies", visible: false, listMode: "hide"},
*/
  {title: "vw_FishCounts_flat", visible: false, listMode: "hide"}
];

let ssDisplayInfo = [
  {title: "Regions"},
  {title: "Field Stations", visible: false, listMode: "show"},
  {title: "vw_StationPoints_", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_Biobands", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_SpeciesGroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_SpeciesSubgroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_SpGroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_SpSubgroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_Species", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_BiobandsSpeciesGroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_BiobandsSpeciesSubgroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_BiobandsSpGroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_BiobandsSpSubgroups", visible: false, listMode: "hide"},
  {title: "vw_StationPoints_BiobandsSpecies", visible: false, listMode: "hide"}
];

let gearDDtemplate = "SELECT GearBasic, GearBasic AS GearBasic2 FROM vw_FishCounts_flat {W} GROUP BY GearBasic ORDER BY GearBasic";
let pocDDtemplate = "SELECT POC_LastName FROM vw_FishCounts_flat {W} GROUP BY POC_LastName ORDER BY POC_LastName";

let lastSZExtent = null;
let bhDiff = window.outerHeight - window.innerHeight;
// Used to detect possible appearance/disappearance of file downloads bar.  (May also be affected by browser maximize, or appearance/disappearance of other browser elements.)
// At start of refresh code, new value is calculated.  If this differs from current bhDiff, features are not refreshed, and bhDiff is updated with new value

let videoClipURLs = "";    // For download of video clips for current extent

let zoomInTemplate = "<img src='assets/images/i_zoomin.png' onclick='mapStuff.gotoExtent({args})' class='actionIcon' alt='' title='Zoom to this {area}'>";
let spTableTemplate = "<img src='assets/images/table.png' onclick='mapStuff.openSpeciesTable({args})' class='actionIcon' alt='' title='Show species table'>";
let gotoSubareasTemplate = "<img src='assets/images/start.png' onclick='mapStuff.selectAndZoom({args})' class='actionIcon'  alt='' title='Go to {area}'>";

let initialExtentThumbnail = null;

let settings = {
  autoRefresh: true,
  photoGap: 50,
  magViewWidth: 10,
//  DEVELOPMENT OPTIONS
  showingExtentBox: true,     // If true, show area being queried for video points
  showMapCoords: false,         // If true, show map coordinates in meters instead of Lat & Lon
  allZoomLevels: false    // If true, will query on smaller part of current extent when zoomed out
};

function changeSetting() {
  let S = "";
  for (p in settings) {
    if (S !== "")
      S += "&";
    S += p + ":" + settings[p];
  }
  let T = "S";
  let settingPairs = prompt("Change property values:", S).split("&");
  for (i=0; i<settingPairs.length; i++) {
    let pair = settingPairs[i].split(":");
    let parName = pair[0];
    let par = settings[parName];
    let v = pair[1];
    if (typeof par === "number")
      v = Number(v);
    if (typeof par === "boolean") {
      if (v.toLowerCase() === "true")
        v = true;
      else
        v = false;
    }
    settings[parName] = v;
  }
};

let settingsHtml = '<h3>Settings</h3>';
settingsHtml += '<h4>ShoreZone video/photo/unit marker settings:</h4>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="automatic" onchange="autoRefreshInputHandler(true)" checked>Generate markers whenever the map extent changes<br>';
settingsHtml += '<input type="radio" name="szMarkerGen" value="manual" onchange="autoRefreshInputHandler(false)">Manually generate markers<br>';
settingsHtml += '<h4>Minimum distance in pixels between photo markers: <input type="number" id="input_photoGap" style="width: 6ch" onchange="photoGapInputHandler()" value="' + settings.photoGap + '"></h4>';
settingsHtml += '<h4>Map magnifier width in km: <input type="number" id="input_magViewWidth" style="width: 6ch" onchange="magViewWidthInputHandler()" value="' + settings.magViewWidth + '"></h4>';
settingsHtml += '<h4><input type="checkbox" id="cb_showVideoMarkers" onClick="cbShowMediaHandler(szVideoWidget,false)">Show video markers<br>';
settingsHtml += '<input type="checkbox" id="cb_showPhotoMarkers" checked onClick="cbShowMediaHandler(szPhotoWidget,true)">Show photo markers</h4>';
settingsHtml += '<button id="rawSettingsButton" onclick="changeSetting()">Raw Settings</button>';

let csvDownloadWidget = null;

function setRawFilename(isRaw) {    // Adds/removes "Raw " to/from file name, depending on "radio_downloadTable" radio button selection
  let textBox = getEl("text_dlFileName");
  let v = textBox.value;
  let startRaw = (v.slice(0,4) === "Raw ");
  if (isRaw && !startRaw)
    v = "Raw " + v;
  else if (!isRaw && startRaw)
    v = v.slice(4);
  textBox.value = v;
}


// The next 3 functions are in support of searchable dropdowns

function searchableDD_expand(startId, showAll) {
  let dd = document.getElementById(startId + "_Dropdown");
  if (showAll) {
    searchableDD_Filter(startId);
    //dd.size = dd.length;
  }
  else
    dd.size = 0;
}

function searchableDD_Filter(startId) {
  let input = document.getElementById(startId + "_Text");
  let filter = input.value.toUpperCase();
  let dd = document.getElementById(startId + "_Dropdown");
  let numOptions = 0;
  for (let i = 0; i < dd.length; i++) {
    txtValue = dd[i].textContent || dd[i].innerText;
    if (txtValue.toUpperCase().indexOf(filter) > -1) {
      dd[i].style.display = "";
      numOptions += 1;
    } else {
      dd[i].style.display = "none";
    }
  }
  if (filter === "")
    dd.size = 0;
  else
    dd.size = 5;      // numOptions;
/*
  if (numOptions === 0)
    dd.size = 1;
    else if (numOptions <= 5)
      dd.size = numOptions;
*/
}




let tableDownloadHtml = '<strong>Data download</strong><br><br>'
    + '<div id="downloadTypeDiv" style="visibility: hidden">'
    + '<input type="radio" id="radio_downloadTable" name="radio_download" value="table" onclick="setRawFilename(false)" checked>Download the table<br>'
    + '<input type="radio" id="radio_downloadRaw" name="radio_download" value="raw" onclick="setRawFilename(true)">Download raw data associated with the table<br><br>'
    + '</div>'
    + '<label for="text_dlFileName">Download file name: </label><input type="text" id="text_dlFileName" style="width: 310px"><br><br>'
    + '&emsp; <button onclick="doTableDownload()">Download</button>&emsp;<button onclick="doTableDownload(true)">Cancel</button><br><br>'
    + '<i>The current table will be downloaded as a comma-delimited (CSV) file.<br>'
    + 'The associated geometry is not included.<br>'
    + 'If you need geometry data, the entire geodatabase may be downloaded <a href="szapps.htm" target="_blank"><strong>here</strong></a>.</i>'
    + '<h4 id="dlWaitMsg" style="color: currentcolor ;display: none">Download is in progress.  Depending on how much data you are <br>downloading, this can take a few minutes.  Please wait...</h4>';

let ssSpeciesDropdownHtml = '{Group}<br><br>';
ssSpeciesDropdownHtml += '{Subgroup}<br><br>';
ssSpeciesDropdownHtml += '{Species}<br><br>';
ssSpeciesDropdownHtml += '<input type="radio" id="radio_ssComFirst" name="ssCommSciOrder" value="common" checked onclick="ssWidget.filterDropdown(\'Species\',null,\'com\')">Common Name<br>';
ssSpeciesDropdownHtml += '<input type="radio" id="radio_ssSciFirst" name="ssCommSciOrder" value="sci" onclick="ssWidget.filterDropdown(\'Species\',null,\'sci\')">Scientific Name<br>';
ssSpeciesDropdownHtml += '<button id="ssSpeciesPanel_closeButton" class="closeButton" onclick="expandDropdownPanel(\'ssSpeciesPanel\',false,ssWidget,\'SpeciesPanel\')">Close</button>';

let faSpeciesDropdownHtml = '<div>';
faSpeciesDropdownHtml += '<input type="radio" id="radio_fmp" name="fishTypes" value="FMP" onclick="faWidget.filterDropdown(\'Species\',null,null,1)">federally managed species<br>';
faSpeciesDropdownHtml += '<input type="radio" id="radio_allFishTypes" name="fishTypes" value="all" checked  onclick="faWidget.filterDropdown(\'Species\',null,null,-1)">All Fish<br><br>';
faSpeciesDropdownHtml += '</div><div style="position:absolute; top:5px; left:250px">';
faSpeciesDropdownHtml += '<input type="radio" id="radio_faComFirst" name="faCommSciOrder" value="common" checked onclick="faWidget.filterDropdown(\'Species\',null,\'com\')">Common Name<br>';
faSpeciesDropdownHtml += '<input type="radio" id="radio_faSciFirst" name="faCommSciOrder" value="sci" onclick="faWidget.filterDropdown(\'Species\',null,\'sci\')">Scientific Name<br>';
faSpeciesDropdownHtml += '</div><div style="position:absolute; top:5px; right:10px">';
faSpeciesDropdownHtml += '<button id="faSpeciesPanel_closeButton" onclick="expandDropdownPanel(\'faSpeciesPanel\', false, faWidget,\'SpeciesPanel\',\'radio_fmp\')">Go</button>';
faSpeciesDropdownHtml += '&emsp;<button onclick="expandDropdownPanel(\'faSpeciesPanel\', false)">Close</button>';
faSpeciesDropdownHtml += '</div>';
faSpeciesDropdownHtml += '&emsp;&emsp;<b>Search dropdown:</b>  <input type="text" id="faSpecies_Text" autocomplete="off" onclick="searchableDD_expand(\'faSpecies\',true)" onkeyup="searchableDD_Filter(\'faSpecies\')"><br><br>';
faSpeciesDropdownHtml +=  '{Species}<br><br>';

let lastInnerHeight = window.innerHeight;
let innerHeight_noFileDownloadBar = lastInnerHeight;
let innerHeight_withFileDownloadBar = null;

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
let initExpandoCollapsed = false;

const legendFilters = [
  {serviceName: "ShoreZone", fieldName: "HabClass", layerTitle: "Habitat Class", delimiter: ","},
  {serviceName: "ShoreZone", fieldName: "BC_CLASS", layerTitle: "Coastal Class", delimiter: ","},
//  {serviceName: "ShoreZone", fieldName: "SHORETYPE", layerTitle: "Coastal Class", delimiter: ","},     // to eventually replace "BC_CLASS"
  {serviceName: "ShoreZone", fieldName: "ESI", layerTitle: "Environmental Sensitivity Index (ESI)", delimiter: ","}
];

let nonNullList = null;

function expandDropdownPanel(panelId, expand, w, ddName, radioId) {
  let className = "dropdown-content";
  let searchTextBox = getEl(panelId.replace("Panel","") + "_Text");
  if (expand)
    className = "dropdown-content-visible";
  else if (searchTextBox) {
    searchTextBox.value = "";
    getEl(panelId.replace("Panel","") + "_Dropdown").size = 0;
  }
  getEl(panelId + "_Content").setAttribute("class", className);
  if (w) {
    let ddInfo = w.getddItem(ddName);

    ddInfo.booleanWhere = "";
    if (radioId) {    // radioId holds the ID of a radio button with info on a "boolean" field to be filtered on where the field value is TRUE
      let radioEl = getEl(radioId);
      if (radioEl.checked)
        ddInfo.booleanWhere = radioEl.value + "=1";      // radioEl.value will be the name of a "boolean" field, so this sets a WHERE clause with the field as TRUE
    }
    w.filterDropdown('Species');
    if (!expand) {      // i.e. if closing the panel
/*
      let buttonLabel = "[All]";
      for (let d=0; d<ddInfo.subDropDowns.length; d++) {
        // buttonLabel defaults to "[All]" -- If any subDropdowns have a selection, then buttonLabel takes on the value of the last selected subDropdown
        let subDdItem = w.getddItem(ddInfo.subDropDowns[d]);
        let subDdElement = getEl(subDdItem.ddId);
        let selOption = subDdElement.options[subDdElement.selectedIndex];
        if (selOption.value !== "All")
          buttonLabel = selOption.label;
      }
      if (ddInfo.booleanWhere!=="" && buttonLabel==="[All]")
        buttonLabel = ddInfo.booleanWhereLabel;    // Value of buttonLabel if .booleanWhere is non-empty string and nothing selected from subDropdowns
      getEl(ddInfo.uniqueName + "_Button").innerHTML = buttonLabel;
*/

      setDropdownPanelButtonLabel(w, ddInfo);
      w.runQuery(view.extent);      // DON'T NEED THIS ANYMORE?
    }
  }
}

function setDropdownPanelButtonLabel(w, ddInfo) {
  let buttonLabel = "[All]";
  for (let d=0; d<ddInfo.subDropDowns.length; d++) {
    // buttonLabel defaults to "[All]" -- If any subDropdowns have a selection, then buttonLabel takes on the value of the last selected subDropdown
    let subDdItem = w.getddItem(ddInfo.subDropDowns[d]);
    let subDdElement = getEl(subDdItem.ddId);
    let selOption = subDdElement.options[subDdElement.selectedIndex];
    if (selOption.value !== "All")
      buttonLabel = selOption.label;
  }
  if (ddInfo.booleanWhere!=="" && buttonLabel==="[All]")
    buttonLabel = ddInfo.booleanWhereLabel;    // Value of buttonLabel if .booleanWhere is non-empty string and nothing selected from subDropdowns
  getEl(ddInfo.uniqueName + "_Button").innerHTML = buttonLabel;
}

function removeFromWhereClause(theWhere, rmvStr) {
  let A = theWhere.split(" AND ");
  for (let i=0; i<A.length; i++) {
    if (A[i].indexOf(rmvStr) !== -1)
      A.splice(i,1);    // remove one item at position i
  }
  return A.join(" AND ");
}

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

  // If parameters contains "dev=1", then use NOAA server,
  //   and (later) modify the FA URL to use the development (complete) version of the map service
  let addDev = false;
  if (sitePars["dev"]) {
    sitePars["server"] = "noaa";
    //getEl("rawSettingsButton").style.visibility = "visible";
    addDev = true;
  }

  if (sitePars["server"]) {
    currServerNum = serverNames.indexOf(sitePars["server"]);
    if (currServerNum !== -1) {
      dfltServerNum = currServerNum;
      alert("Using " + serverNames[currServerNum] + " map services");
    }
    else
      currServerNum = dfltServerNum;
    if (addDev)
      faMapServiceLayerURLs[currServerNum] = faMapServiceLayerURLs[currServerNum].replace("services/","services/dev/").replace("/MapServer","_dev/MapServer");
  }

  // Use alternate offline app URL, if present in parameters
  if (sitePars["olurl"])
    offlineAppURL = sitePars["olurl"];

  if (sitePars["layout"])
    layoutCode = sitePars["layout"];

  if (sitePars["tab"]) {
    initTab = sitePars["tab"];
    if (initTab === "szsimple") {
      initTab = "sz";
      initExpandoCollapsed = true;
    }
    initTab += "Tab";
  }

}

makeSublayerIdTable(szMapServiceLayerURLs[currServerNum], szSublayerIDs);
let ssSublayerIDs = {};
makeSublayerIdTable(ssMapServiceLayerURLs[currServerNum], ssSublayerIDs);
let faSublayerIDs = {};
makeSublayerIdTable(faMapServiceLayerURLs[currServerNum], faSublayerIDs);

let VIDEO_FOLDER = "video/";
let videoSnippetDownloadFolder = altSzMediaServer + VIDEO_FOLDER + "midres_mp4";
let youtubeAspectRatio = 16/9;
let photoAspectRatio = 4/3;

let serviceLayers = null;
let llServiceLayers = null;
let extentDependentWidgets = [];
let photoWidgets = [];

let stateNavigator = null;

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

let dfltNoSelOption = { label: "[All]", value: "All", buttonLabel: "[All]" };
let dfltNoSelOption_extraField = { label: "[All]", value: "All", buttonLabel: "[Combined]" };
let dfltShowColumnOption =  { label: "[Show column]", value: "showCol", buttonLabel: "[Show column]" } ;


let gearDD = {
  ddName: "Gear",
  ddOutFields: ["GearBasic", "GearBasic2"],
  customRestService: {
    serviceUrl: faRestServiceURL,
    sqlTemplate: gearDDtemplate
  },
  showColumnOption: dfltShowColumnOption,
  noSelOption: dfltNoSelOption_extraField,
  SelectedOption: "All",
  columnField: "GearBasic",
  groupField: "GearBasic",
  whereField: "GearBasic",
  liveUpdate: true,
  isAlpha: true
};

/*
let gearDD_showColSel = JSON.parse(JSON.stringify(gearDD));
gearDD_showColSel.SelectedOption = "showCol"
*/

//  JSON.parse(JSON.stringify(pocDD)),


let pocDD = {
  ddName: "POC",
  ddOutFields: ["POC_LastName"],
  customRestService: {
    serviceUrl: faRestServiceURL,
    sqlTemplate: pocDDtemplate
  },
  showColumnOption: dfltShowColumnOption,
  noSelOption: dfltNoSelOption_extraField,
  SelectedOption: "All",
  columnField: "POC_Concat",
  groupField: "POC_LastName",
  whereField: "POC_LastName",
  liveUpdate: true,
  isAlpha: true
  };


let HabitatColumnFormat = {
  colWidth: 30,
  //nullDisplay: "[unspecified]"
};
let GearColumnFormat = {
  title: "Gear",
  colWidth: 30
};


let gp = null;      // for Geoprocessor
let llExpand = null;
let layerListWidget = null;
//let listItem_1s_legendHtml = null;
let listItem_10s_legendHtml = null;
let listItem_VideoFlightline = null;
let legendInfo = {};

let searchWidget = null;
let searchLocal = false;

let olExpand = null;

//  When a graphic is hovered over, these point to the graphic and the widget controlling the graphic
let minHoverTime = 500;     // Minimum hover time (ms) over a graphic before a new popup opens up
let currentHoveredGraphic = null;
let currentWidgetController = null;
let hoverTimeout;

//  When a region of the map is hovered over, queries on SZ data for hovered location are started
let minMapHoverTime = 1000;     // Minimum hover time (ms) before queries on hovered location are started
let mapHoverTimeout = null;
let mapHoverRadius = 1000;    // "radius" of square centered at current mouse position (in meters)

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

function waitAndSelectChild() {
  let t = setTimeout(function() {
    stateNavigator.selectChild(initTab);
  }, 500)
}

function photoGapInputHandler() {
  settings.photoGap = parseInt(getEl("input_photoGap").value);
  szPhotoWidget.clickableSymbolGap = settings.photoGap;
  //refreshSzFeatures();
}

function magViewWidthInputHandler() {
  settings.magViewWidth = parseInt(getEl("input_magViewWidth").value);
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

function setMessage(elName, text, /*visible,*/ fade) {
  // Show message (including HTML) in "elName"
  let el = getEl(elName);
  if (!el)
    return;
/*
  if (visible === undefined)
    visible = true;
  if (visible)
    el.style.visibility = "inherit";
  else
    el.style.visibility = "hidden";
*/
  if (text)
    el.innerHTML = text;     //.innerHTML = text;
  if (image_message_timeout) clearTimeout(image_message_timeout);
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

function toggleVisibility(id) {
  // toggle visibility of HTML element
  setVisible(id,!isVisible(id));
}

function setVisible(id, value) {
  // Show/hide HTML element
  el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  let visibility = "hidden";
  if (value)
    visibility = "inherit";
  el.style.visibility = visibility;
}

function isVisible(id) {
  // Returns visibility of HTML element
  el = getEl(id);
  if (!el)
    return false;
  if (el.style.visibility==="visible" || el.style.visibility==="inherit")
    return true;
  else
    return false;
}

function showEnabledDisabled(panelNames, show, disabledMsg) {
  /*
   Shows or hides the contents of a panel.
   To use, there must be a DIV named:    "panelEnabled_" + name
   and another DIV named:                "panelDisabled_" + name
   When "show" is true, the "disabled" DIV is displayed and the "enabled" DIV is hidden
   */
  let names = panelNames.split(",");
  for (let i=0; i<names.length; i++) {
    setVisible("panelDisabled_" + names[i], !show);
    setVisible("panelEnabled_" + names[i], show);
    if (!show && disabledMsg)
      getEl(disabledMsgName).innerHTML = disabledMsg;
  }
}


/* Click Handlers */

function dlClipImage_clickHandler() {
  let theUrl = videoClipURLs.split(";")[1];
}

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
  let ddDom = getEl(ddInfo.ddId);
  ddDom.value = value;
  ddInfo.SelectedOption = value;
}

function radioSelectHandler(w, where) {
  w.radioFilterInfo.where = where;
  w.runQuery(view.extent);  //, {theWhere: where});
}

function cbCheckedHandler(w) {
  w.runQuery(view.extent);  //, {theWhere: where});
}

function whereFromDDInfo(ddInfo, prefix="") {
  let ddElement = getEl(ddInfo.ddId);
  let selOption = ddInfo.options[ddElement.selectedIndex];
  if (["All", "showCol"].includes(selOption.buttonLabel))
    return "";
  let theWhere = selOption.value;
  if (ddInfo.isAlpha)
    theWhere = "'" + theWhere + "'";
  theWhere = ddInfo.whereField + "=" + theWhere;
  return prefix + theWhere;
}

function dropdownSelectHandler(w, index) {
  let ddInfo = index;     // allows using actual ddInfo object for "index", rather than numeric index
  if (typeof index !== "object")
    ddInfo = w.dropDownInfo[index];
  let ddElement = getEl(ddInfo.ddId);
  ddInfo.SelectedOption = ddElement.value;
  let selOption = ddInfo.options[ddElement.selectedIndex];

  // This is the text that will be displayed on the button, to indicate what is currently selected
  //let buttonText = selOption.label.split(" - ")[0];     // If the label contains " - ", set buttonText to everything to the left of that.  This handles Species dropdowns,
                                                                // where labels are expressed as "[common name] - [scientific name]" or vice-versa

  let newExtent = ddInfo.options[ddElement.selectedIndex]["extent"];
  ddElement.size =1;      // In case dropdown has been "expanded" to show search results, reset to default
  if (newExtent)
    mapStuff.gotoExtent(newExtent);
  ddInfo.excludedNames = "";
  if (selOption.buttonLabel === "[All]")
    ddInfo.excludedNames = ddInfo.layerSubNames;

  if (ddInfo.expandPanelId) {
    let expandPanel = w.getddItem(ddInfo.expandPanelId);
    if (selOption.buttonLabel === "[All]") {
      //buttonText = "[All species]";
      if (ddInfo.parentDropdown) {      // Fall back to higher category, call function again recursively
        let parentDdInfo = w.getddItem(ddInfo.parentDropdown);
        dropdownSelectHandler(w, parentDdInfo);
        return;
      } else {       // "All" selected at highest category, so no layer name add-on
        //expandPanel.excludedNames = expandPanel.layerSubNames;
        //expandPanel.LayerNameAddOn = "";
      }
    }

/*
    let buttonLabel = selOption.buttonLabel;
    if (ddInfo.booleanWhere!=="" && ddInfo.SelectedOption==="All")
      buttonLabel = expandPanel.booleanWhereLabel;
    getEl(expandPanel.uniqueName + "_Button").innerHTML = buttonLabel;
*/
    setDropdownPanelButtonLabel(w, expandPanel);

    if (!ddInfo.dependentDropdowns)
      expandDropdownPanel(expandPanel.uniqueName, false);     // No widget specified, so query is not run

    let whereValue = ddInfo.SelectedOption;
    if (whereValue === "All") {
      expandPanel.panelWhere = "";
    } else {
      if (ddInfo.isAlpha)
        whereValue = "'" + whereValue + "'";
      expandPanel.panelWhere = ddInfo.whereField + "=" + whereValue;
    }
    expandPanel.panelWhereChanged = true;
    getEl(expandPanel.uniqueName + "_closeButton").innerText = "Go";
  }

  if (ddInfo.dependentDropdowns) {      // This is not in the expandPanelId section, because might use for dropdowns outside of dropdown panels
    w.handleDependentDropdowns(ddInfo);
    return;
  }

  w.runQuery(view.extent);
  //w.upDateDropdown(ddInfo, w.baseWhere);
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

function checkbox_showPopups_clickHandler() {
  showPopups = getEl("showPopupsCheckbox").checked;
  if (!showPopups) {
    view.popup.close();
  }
}

/*    // old Tristan code for speed slider
function findAndChangePlaybackSpeed() {
  changePlaybackSpeed(document.getElementById('playback_speed_range').value);
}
*/

function nudgePlaybackSpeed(incr) {
  if (!youtube_id)
    return;
  let currSpeed = youtube_player.getPlaybackRate();
  let avail_rates = youtube_player.getAvailablePlaybackRates();
  let i = avail_rates.indexOf(currSpeed) + incr;
  let newSpeed = currSpeed;
  if (i>=0 && i<avail_rates.length) {
    newSpeed = avail_rates[i];
    youtube_player.setPlaybackRate(newSpeed);
    updatePlaybackSpeedMarker(newSpeed, i>0, i<(avail_rates.length-1));
  }
}

function updatePlaybackSpeedMarker(newSpeed, showMinus, showPlus) {
  getEl("speedSpan").innerText = newSpeed + "X";
  setVisible(("speedDecrIcon"), showMinus);
  setVisible(("speedIncrIcon"), showPlus);
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
  else
    template = status;
  widgets.forEach(function(w, index, array) {
    if (w.disabledMsgDivName) {
      let msg = template.replace(/\{1\}/g, w.disabledMsgInfix);
      //getEl(w.disabledMsgDivName).innerHTML = msg;     //.innerHTML = msg;
      getEl(w.disabledMsgName).innerHTML = msg;
      showEnabledDisabled(w.baseName, msg==="");
      //setMessage(w.disabledMsgDivName, msg);
    }
  });
  //setDisplay("showUnitsDiv", false);      // Hide secondary unit features checkbox
}

function refreshSzFeatures() {
  resetCurrentFeatures();
  mapLoading = true;
  if (szFeatureRefreshDue) {    // newExtent.width/1000 < maxExtentWidth
    lastSZExtent = view.extent;
    if (szVideoWidget) {
      szVideoWidget.noMarkers = szVideoWidget.preQueryMarkers;
      szVideoWidget.runQuery(view.extent);         // 3D: use extent3d?
    }
    if (szUnitsWidget && (view.extent.width/1000 < maxExtentWidth))
      szUnitsWidget.runQuery(view.extent);         // 3D: use extent3d?
  } else {
    updateNoFeaturesMsg(extentDependentWidgets, "zoomin");
  }
  setRefreshButtonVisibility(false);
}

function resetCurrentFeatures() {
  setDisabled("offlineAppButton", true);    // This is directly setting the "disabled" attribute of the button in the OfflineAppLink widget
  //showEnabledDisabled("video,photo,units", false);
  extentDependentWidgets.forEach(function(w, index, array) {
    w.clearGraphics();
  });
  setContent("offlineAppPanel", download_notZoomedInEnoughContent);
}

function showCurrentFeatures() {
  setDisabled("offlineAppButton", false);   // This is directly setting the "disabled" attribute of the button in the OfflineAppLink widget
  //showEnabledDisabled("video,photo,units", true);
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

/*
function makeSublayerIdTable(serviceUrls, idTable) {
  queryServer(serviceUrls[currServerNum], true, function(R) {
    if (R.error) {
      console.log("Map service error:  " + R.error.message);
      return;
    }
    console.log("Map service:  " + serviceUrls[currServerNum]);
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
*/

function updateSublayerArgs(displayInfo, sublayerIDs) {    // Make arguments for specifying sublayers of map service layer
  for (let i=0; i<displayInfo.length; i++) {
    let obj = displayInfo[i];
    obj.id = sublayerIDs[obj.title];
  }
  return displayInfo;
}

function makeClassArrayVisibilityObject(obj) {  // On function call, "obj" should be siteTabs
  // Using an array of css class names, manages the display of all HTML elements that have been assigned one of the classes in the array.
  // Calling .promoteClass with "newClassName" will make "newClassName" elements visible, and hide elements using any of the other class names in the array.
  // This is done by creating a style sheet element using the class names, and setting css "display" values for these

  obj.promoteClass = function(newClassName) {
    let cNames = this.tabs;
    let s = "";
    for (c in cNames) {
      s += "." + cNames[c] + " {display: ";
      if (cNames[c]===newClassName)
        s += "inherit";
      else s += "none";
      s += "}  ";
    }
    this.styleSheet.innerHTML = s;
    this.currTab = newClassName;
  }

  obj.styleSheet = document.createElement('style');
  document.body.appendChild(obj.styleSheet);
  obj.promoteClass(obj.currTab);
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

let szFeatureRefreshDue = false;      // True if extent has changed and new features have not been generated yet
let refreshFeaturesHtml = "<img id='btn_refresh' class='btn_refresh_inactive' src='assets/images/refresh24x24.png' onclick='refreshSzFeatures()' height='32px' width='32px' title='Click to refresh features' />";

let toggleMagnifierHtml = "<img id='toggleMagnifierDiv' src='assets/images/MapMagnifier.png' class='mapWidget_Hidden' onclick='toggleMapWidgetVisibility(\"MagnifierDiv\")' height='24px' width='24px' title='Click for detailed view at mouse position' />";

let unitsCb2_Id = "unitsCheckbox2_showFeatures";
let showUnitsCheckbox2 = '<input id="' + unitsCb2_Id  + '" type="checkbox" onclick="checkbox_showFeatures_clickHandler(szUnitsWidget,unitsCheckbox2_showFeatures)"><span style="background-color: #ff6060; opacity: 0.25">&emsp;&emsp;</span>'
let showUnitsDiv = document.createElement("DIV");
showUnitsDiv.innerHTML = showUnitsCheckbox2;

let popupsCb_Id = "showPopupsCheckbox";
let showPopupsCheckbox = '<input id="' + popupsCb_Id  + '" type="checkbox" checked onclick="checkbox_showPopups_clickHandler()"><span class="mapCheckboxText" >Show popups</span>'

/* For pan/zoom-to-rectangle toggle */
let panning = true;      // If not panning, then zooms to drawn rectangle
let panZoomHtml = "<div class='iconDiv'><img id='btn_pan' src='assets/images/i_pan.png' onclick='togglePanZoom(true)' height='24px' width='24px' title='Click to enable panning' class='icon_Active' /></div>";
panZoomHtml += "<div class='iconDiv'><img id='btn_zoomRect' src='assets/images/selRect_24x24.png' onclick='togglePanZoom(false)' height='24px' width='24px' title='Click to enable selection/zoom tool' class='icon_Inactive' /></div>";

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
let currentBookmark = null;
let extentIsBookmarked = false;
let drawingZoomRectangle = false;
let extentChanged = true;

function gotoSavedExtent(offset) {
  if (!currentBookmark)
    return;
  let l = savedExtentsWidget.bookmarks.length;
  let n = currentBookmark.index + offset;
  if (n>=0 && n<l) {
    extentIsBookmarked = true;
    currentBookmark = savedExtentsWidget.bookmarks.items[n];
    savedExtentsWidget.goTo(currentBookmark, {animate: false});
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
  let s = inStr.replace(/&nbsp;/g,"");      // Remove any "&nbsp;" strings  (Used to make numeric columns [as strings] sortable)
  let p1 = s.indexOf("<");
  while (p1 !== -1) {
    let p2 = s.indexOf(">");
    s = s.slice(0,p1) + s.slice(p2+1);
    p1 = s.indexOf("<");
  }
  return s;
}

function siteLoadedHandler() {
}

function browserResizeHandler(e) {
  //console.log("browserResizeHandler");
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

function padString(str, len, mode, chars) {
  // "mode" can be "left", "right" or "both"
  if (!chars)
    chars = " "
  let outstr = str;
  let leftSide = false;
  if (mode==="left")
    leftSide = true;
  let l = len - str.length;
  let padStr = "";
  if (l > 0)
    padStr = chars.repeat(l);
  if (leftSide)
    outstr = padStr + str;
  else
    outstr = str + padStr;
  return outstr;
}

function relOffset(el, tgtDiv) {
  el = getEl(el);
  tgtDiv = getEl(tgtDiv);
  let ofs = $(el).offset();    // This is the left & top coords of el, relative to the browser window
  let tgtDivOfs = $(tgtDiv).offset();
  ofs.left -= tgtDivOfs.left;
  ofs.top -= tgtDivOfs.top;
  return ofs;
}

function cbSearchExtentHandler() {
  searchLocal = getEl("cbLimitSearchToExtent").checked;
}

// On right-click of SZ photo, bypasses default context menu and allows download of original resolution photo
function downloadOrigRes(e) {
  let imgSrc = this.getElementsByTagName("IMG")[0].src;
  let lowResInsert = "_lowres/280_";
  let midResInsert = "_midres/560_";
  let origResSrc = imgSrc.replace(lowResInsert,"/").replace(midResInsert,"/");
  if (confirm("Do you want to download this photo?")) {
    /*    // Still can't get it to download straight to file file rather than open in new tab.
              let theStyle = "position: absolute; left:" + e.clientX + "px; top:" + e.clientY + "px; width:200px; height:50px; z-index: 10; background-color: white";
              let theContent = '<a href="' + origResSrc + '" download>Download image</a>';
              document.body.appendChild(makeHtmlElement("DIV",null,null, theStyle,theContent));
    */
    window.open(origResSrc);
  }
  return false;
}

function logPoperties(obj) {
  for (p in obj)
    console.log(p + ":  " + (typeof obj[p]));
}

function makeDownloadPanel() {
  let downloadPanel = makeHtmlElement("div", "downloadPanel", "dropdown-content-visible", "top:200px;left:200px;", tableDownloadHtml);
  document.body.appendChild(downloadPanel);
  setVisible("downloadPanel", false);
  var hiddenElement = document.createElement('a');
  hiddenElement.id = "hidden_downloadTable";
  hiddenElement.target = '_blank';
  document.body.appendChild(hiddenElement);
}

function downloadCsv(csv, headerCsv) {
  if (headerCsv)
    csv = headerCsv + csv;
  let hiddenElement = getEl("hidden_downloadTable");
  // Using encodeURIComponent instead of encodeURI to ensure that # and other special characters are encoded
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);

  let fileName = getEl("text_dlFileName").value.split(".")[0] + ".csv";     // ensure the name has ".csv" extension
  hiddenElement.download = fileName;
  hiddenElement.click();
}

function makeSiteInfoPanel() {
  let siteInfoPanel = makeHtmlElement("div", "siteInfoPanel", "dropdown-content-visible", "top:200px;right:200px;padding:10px", siteInfoHtml);
  document.body.appendChild(siteInfoPanel);
  setVisible("siteInfoPanel", false);
}


let rectActionHtml = '<strong>Action:</strong><br><br>'
  + '<input type="checkbox" id="cb_zoomToRect" value="table" checked>Zoom to drawn rectangle<br>'
  + '<input type="checkbox" id="cb_selectInRect" value="raw">Select features within drawn rectangle<br><br>'
  + '&emsp; <button onclick="doRectAction(false,false)">OK</button>&emsp;<button onclick="doRectAction(true,false)">Cancel</button>&emsp;&emsp;<button onclick="doRectAction(false,true)">Clear Selection</button><br><br>';

function makeRectActionPanel() {
  let rectActionPanel = makeHtmlElement("div", "rectActionPanel", "dropdown-content-visible", "top:200px;left:200px;", rectActionHtml);
  document.body.appendChild(rectActionPanel);
  setVisible("rectActionPanel", false);
}

// Symbol for selection rectangle
let selRectSymbol = {
  type: "simple-fill", // autocasts as new SimpleFillSymbol()
  color: [0, 0, 227, 0.0],
  outline: { // autocasts as new SimpleLineSymbol()
    color: [255, 255, 0],
    width: 2
  }
};

function doRectAction(cancel, clear) {
  let w = faWidget;
  setVisible("rectActionPanel", false);
  if (cancel) {
    view.graphics.remove(extentGraphic);
    return;
  }
  let T = w.tabInfo[w.currTab];
  if (clear) {
    view.graphics.removeAll();
    w.selExtent = null;
    T.spatialWhere = null;
    w.runQuery(/*extentGraphic.geometry.extent*/);
    return;
  }
  if (getEl("cb_zoomToRect").checked)
    view.goTo(extentGraphic, {animate: false});
  if (getEl("cb_selectInRect").checked) {
    let selExtentGraphic = extentGraphic.clone();
    w.selExtent = selExtentGraphic.geometry.extent;
    selExtentGraphic.symbol = selRectSymbol;
    w.selExtentGraphic = selExtentGraphic;
    T.spatialWhere = null;
    if (T.clickableSymbolType==="point") {
      T.spatialWhere = "(S.Shape.STX>" + Math.floor(w.selExtent.xmin);
      T.spatialWhere += ") AND (S.Shape.STX<" + Math.ceil(w.selExtent.xmax);
      T.spatialWhere += ") AND (S.Shape.STY>" + Math.floor(w.selExtent.ymin);
      T.spatialWhere += ") AND (S.Shape.STY<" + Math.ceil(w.selExtent.ymax) + ")";
    }
    view.graphics.removeAll();
    view.graphics.add(selExtentGraphic);
    w.runQuery();
  }
  view.graphics.remove(extentGraphic);      // If not selecting, then remove the rectangle
}

function doTableDownload(cancel) {
  if (cancel) {
    setVisible("downloadPanel", false);
    return;
  }

  if (document.getElementById("radio_downloadRaw").checked) {
    csvDownloadWidget.queryCsvData();
    setDisplay("dlWaitMsg", true);
    return;
  }
  setVisible("downloadPanel", false);
  let csv = csvDownloadWidget.getCsvFromTable();
  downloadCsv(csv, csvDownloadWidget.makeHeaderCsv());
}

/*
function download_csv(csv, dfltFileName, rawDownloadOption) {
  let fileNameEl = getEl("text_dlFileName");
  fileNameEl.value = dfltFileName;
  let fileName = dfltFileName.split(".")[0] + ".csv";     // ensure the name has ".csv" extension
  let downloadPanel = getEl("downloadPanel");
  downloadPanel.value = dfltFileName;
  setVisible("downloadTypeDiv", rawDownloadOption);
  setVisible(downloadPanel, true);
  let hiddenElement = getEl("hidden_downloadTable");
  // Using encodeURIComponent instead of encodeURI to ensure that # and other special characters are encoded
  hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
}
*/

function addToWhere(where, newWhere, rmvAlias) {
  if (!newWhere || newWhere==="")
    return where;
  if (rmvAlias)
    newWhere = newWhere.replace(/S\./g,"");       // Get rid of "S." in newWhere
  if (where !== "")
    where += " AND ";
  where += newWhere;
  return where;
}


function toggleMapWidgetVisibility(widgetID) {
  let newStatus = !isVisible(widgetID);
  setVisible(widgetID, newStatus);
  let theClass = "mapWidget_";
  if (newStatus === true)
    theClass += "Visible";
  else
    theClass += "Hidden";
  getEl("toggle" + widgetID).className = theClass;
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

*/
