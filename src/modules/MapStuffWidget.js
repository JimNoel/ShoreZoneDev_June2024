/**
 * Widget version of MapStuff code
 * Modified from JS/MapStuff.js
 * Currently, this is only minimally "widgetized", to ensure that the MapStuff code runs only after the Dojo DOM has been constructed (in code)
 */



let map;
let view;

let szMapServiceLayer;
let faMapServiceLayer;
let ssMapServiceLayer;
let sslMapServiceLayer;

let siteTabs = new Object({tabs: ["sz", "fa", "ss"], currTab: "sz"});
siteTabs.sz = {};
siteTabs.fa = {};
siteTabs.ss = {};

let mapLoading = false;

define([
  "dojo/_base/declare",
  "esri/Basemap",
  "esri/core/watchUtils",
  "esri/Map",
  "esri/views/MapView",
  //"esri/views/SceneView",
  // SceneView produces this error:  GET http://localhost:63342/FDFA6052-1C12-4655-B658-0DBF2414422D/253/aHR0cDovL2pzLmFyY2dpcy5jb20vNC4zL2Vzcmkvd29ya2Vycy9tdXRhYmxlV29ya2VyLmpz 404 (Not Found)
  "esri/layers/MapImageLayer",
  "esri/portal/PortalItem",
  "esri/webmap/Bookmark",
  "esri/widgets/Bookmarks",
  "esri/widgets/Expand",
   "esri/widgets/LayerList",
  "esri/widgets/Legend",
  "esri/widgets/Search",
  "esri/widgets/BasemapGallery",
  "esri/widgets/Home",
  "esri/widgets/Locate",
  "esri/widgets/Popup",
  "esri/widgets/ScaleBar",
  "esri/tasks/Geoprocessor",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
//  "esri/widgets/Print",
  "noaa/VideoPanelWidget",
  "noaa/PhotoPlaybackWidget",
  "noaa/UnitsPanelWidget",
  "noaa/QueryBasedTablePanelWidget",
  "noaa/ChartPanelWidget",
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/geometry/Polygon",
  "esri/geometry/support/webMercatorUtils",
  "esri/layers/GraphicsLayer",
  "esri/renderers/SimpleRenderer",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/Graphic",
  "dojo/dom",
  "esri/core/Collection",
  "esri/core/Accessor",
  "dojo/domReady!"
], function(declare, Basemap, watchUtils, Map, View, MapImageLayer, PortalItem, Bookmark, Bookmarks, Expand, LayerList, Legend, Search, BasemapGallery, Home, Locate, Popup, ScaleBar, Geoprocessor, Query, QueryTask,
              //Print,
            VideoPanelWidget, PhotoPlaybackWidget, UnitsPanelWidget, QueryBasedTablePanelWidget, ChartPanelWidget,
            Extent, Point, Polygon, webMercatorUtils, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, Graphic, dom, Collection, Accessor) {

    function makeSzWidgets() {
      szPhotoWidget = new PhotoPlaybackWidget({
        objName: "szPhotoWidget",
        panelName: "szPhotosPanel",
        panelType: "media",
        contentPaneId: "photoDiv",
        baseName: "photo",
        headerDivName:  "photoHeaderDiv",
        disabledMsgInfix: "photo points",
        disabledMsgDivName: "disabledMsg_photo",
        mapServiceLayer: null,
        noQuery: true,
        trackingSymbolInfo: "assets/images/Camera24X24.png:24:24",
        clickableSymbolType: "point",
        clickableSymbolInfo: {"style":"square", "color":[0,0,255,1], "size":8,     // invisible if 4th value in "color" is 0
          "outline": {color: [ 0, 0, 255, 0 ] }},
        popupTitle: "Photo Point",
        clickableMsg: "Move camera to this location",
        sync_photos: true,
        photoServer: szPhotoServer,
        photoResInsert: "stillphotos_lowres/280_",
        relPathField: "RelPath",
        fileNameField: "StillPhoto_FileName",
        controlData: [
          ['szPhoto_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'toStart'],
          ['szPhoto_backwardButton', 'Play Backwards', 'w_left.png', 'playBackward'],
          ['szPhoto_pauseButton', 'Pause', 'w_close_red.png', 'pause'],
          ['szPhoto_ForwardButton', 'Play Forwards', 'w_right.png', 'playForward'],
          ['szPhoto_resetForwardButton', 'Reset to End', 'w_collapse.png', 'toEnd']
        ],
        customContextMenu: downloadOrigRes,
        map: map,
        view: view
      });
      extentDependentWidgets.push(szPhotoWidget);
      szPhotoWidget.resizeImg();
      photoWidgets.push(szPhotoWidget);

      szVideoWidget = new VideoPanelWidget({
        objName: "szVideoWidget",
        panelName: "szVideoPanel",
        sublayerIDs: szSublayerIDs,
        panelType: "media",
        contentPaneId: "videoDiv",
        baseName: "video",
        headerDivName:  "videoHeaderDiv",
        disabledMsgInfix: "video points",
        disabledMsgDivName: "disabledMsg_video",
        //displayDivName: "#videoImageContainer",
        mapServiceLayer: szMapServiceLayer,
        layerName: "1s",
        layerPath: "Video Flightline/1s",

        // TODO:  Set up filter to query subset of points, when full set is greater than the service limit
        //initWhere:  "DateTime_str like '%0'",    // example:  "n*(MP4_Seconds/n)=MP4_Seconds" returns just multiples of n

        spatialRelationship: "contains",
        featureOutFields: ["*"],
        orderByFields: ["Date_Time"],
        trackingSymbolInfo: "assets/images/video24X24.png:24:24",
        clickableSymbolType: "point",
        clickableSymbolInfo: {"style":"circle", "color":[255,255,0,1], "size":3,      //  invisible if 4th value in "color" is 0
          "outline": {color: [ 128, 128, 128, 0 ] }},
        popupTitle: "Video Point",
        clickableMsg: "Move camera to this location",
        syncTo: szPhotoWidget,
        controlData: [
          ['video_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'toStart'],
          ['video_backwardButton', 'Play Backwards', 'w_left.png', 'playBackward'],
          ['video_pauseButton', 'Pause', 'w_close_red.png', 'pause'],
          ['video_ForwardButton', 'Play Forwards', 'w_right.png', 'playForward'],
          ['video_resetForwardButton', 'Reset to End', 'w_collapse.png', 'toEnd']
        ],
        map: map,
        view: view
      });
      extentDependentWidgets.push(szVideoWidget);

      szUnitsWidget = new UnitsPanelWidget({
        objName: "szUnitsWidget",
        widgetName: "szUnitsWidget",    // for reference to instance
        tabName: "Units",
        panelType: "table",
        columnsHideable: true,
        sublayerIDs: szSublayerIDs,
        panelName: "szUnitsPanel",
        contentPaneId: "unitsDiv",
        baseName: "units",
        headerDivName:  "unitsHeaderDiv",
        displayDivName: "unitsContainer",
        disabledMsgInfix: "units",
        disabledMsgDivName: "disabledMsg_units",
        mapServiceLayer: szMapServiceLayer,
        layerName: "Mapped Shoreline",      // "AK_Unit_lines_wAttrs",
        layerPath: "Mapped Shoreline",      // "AK_Unit_lines_wAttrs",
        spatialRelationship: "contains",
        idField: "PHY_IDENT",
        featureOutFields:  ["PHY_IDENT"],     // Other fields will be added based on queries of map service layers
        downloadExcludeFields: [],
        orderByFields: ["PHY_IDENT"],
        extraOutFields:  ["CMECS_1", "CMECS_2", "CMECS_3", "LENGTH_M", "Slope_calc", "SHORE_PROB", "LOST_SHORE", "Fetch_max", "Wave_Dissipation", "Orient_dir", "Tidal_height", "CVI_Rank"],
        specialFormatting: {      // Special HTML formatting for field values
          PHY_IDENT: { colWidth: 100 },
          HabClass: { colWidth: 100 },
          BC_CLASS: { colWidth: 100 },
          EXP_BIO: { colWidth: 80 },
          LENGTH_M: { colWidth: 80, numDecimals: 0 },   // TODO: Handle 0 value for numDecimals
          CMECS_1: { colWidth: 130 },
          CMECS_2: { colWidth: 130 },
          CMECS_3: { colWidth: 130 }
        },

        showFieldsInPopup: "*",
        //trackingSymbolInfo: "assets/images/video24X24.png:24:24",
        hideMarkersAtStart: true,
        clickableSymbolType: "extent",
        clickableSymbolInfo: {
          color: [ 255, 96, 96, 0.25 ],
          style: "solid",
          outline: null
        },
        highlightSymbolType: "polyline",
        highlightSymbolInfo: {
          color: "red",
          style: "solid",
          width: "4px"
        },
        popupTitle: "ShoreZone Unit",
        clickableMsg: null,
        map: map,
        view: view
      });
      extentDependentWidgets.push(szUnitsWidget);

      showPanelContents("video,photo,units", false);
      siteTabs.sz.widgets = [szPhotoWidget, szVideoWidget, szUnitsWidget];
    }

    function addServiceLayers() {
      szMapServiceLayer =  new MapImageLayer(szMapServiceLayerURLs[currServerNum],  {id: "szOpLayer", "opacity" : 1.0});
      szMapServiceLayer.when(function() {
        makeSzWidgets();

    }, function(error){
        console.log("szMapServiceLayer failed to load:  " + error);
/*
        szMapServiceLayerURL = makeServiceUrl(1-currServerNum, "service", "ShoreZone");
        let altSzMapServiceLayer =  new MapImageLayer(szMapServiceLayerURL,  {id: "szOpLayer2", "opacity" : 1.0});
        altSzMapServiceLayer.when(function() {
          makeSzWidgets();
        }, function(error) {
          console.log("altSzMapServiceLayer failed to load AGAIN:  " + error);
        });
*/
      });

      ssMapServiceLayer = new MapImageLayer(ssMapServiceLayerURLs[currServerNum],  {id: "ssOpLayer", opacity: 1.0, listMode: "show"});
      ssMapServiceLayer.when(function() {
        ssMapServiceLayer.sublayers = updateSublayerArgs(ssDisplayInfo, ssSublayerIDs);
        ssMapServiceLayer.visible = false;

        /*  ssWidget def */
        ssWidget = new QueryBasedTablePanelWidget({
          objName: "ssWidget",
          //gotoFlexMsg: "Sorry, Shore Stations has not been implemented yet on this site.  If you would like to open @ on the older Flex site, click 'OK'.",
          title: "Shore Stations",
          sublayerIDs: ssSublayerIDs,
          panelName: "ssPanel",
          panelType: "table",
          contentPaneId: "ssDiv",
          baseName: "ss",
          headerDivName:  "ssHeaderDiv",
          //footerDivName:  "ssFooterDiv",
          tableHeaderTitle: "All Regions",
          displayDivName: "ssContainer",
          disabledMsgDivName: "disabledMsg_ss",
          mapServiceLayer: ssMapServiceLayer,
          dynamicLayerName: true,
          dropDownInfo: [
            { ddName: "Region",
              LayerNameAddOn: "",
              subLayerName: "Regions",
              ddOutFields: ["Region", "RegionalID", "Envelope"],
              orderByFields: ["Region"],
              initialOption: [ { label: "[All Alaska regions]", value: "All", extent: "-19224680, 6821327, -14019624, 11811136" } ],
              SelectedOption: "All",
              whereField: "RegionalID",
              isAlpha: true
            },
            { ddName: "Bioband",
              LayerNameAddOn: "Biobands",
              subLayerName: "vw_AlaskaBiobands",
              ddOutFields: ["BiobandName", "BiobandCode"],
              orderByFields: ["BiobandName"],
              initialOption: [ { label: "[All]", value: "All" }],
              SelectedOption: "All",
              whereField: "BiobandCode",
              isAlpha: true
            },
            { ddName: "Group",
              expandPanelId: "SpeciesPanel",
              LayerNameAddOn: "SpeciesGroups",
              subLayerName: "vw_AlaskaSpeciesGroups",     // table for generating dropdown items
              ddOutFields: ["Group_", "GroupID"],
              orderByFields: ["Group_"],
              initialOption: [ { label: "[All]", value: "All" } ],
              SelectedOption: "All",
              whereField: "GroupID",
              isAlpha: false,
              dependentDropdowns: ["Subgroup", "Species"]
            },
            { ddName: "Subgroup",
              expandPanelId: "SpeciesPanel",
              LayerNameAddOn: "SpeciesSubgroups",
              subLayerName: "vw_AlaskaSpeciesSubgroups",     // table for generating dropdown items
              ddOutFields: ["Subgroup", "SubgroupID"],
              orderByFields: ["Subgroup"],
              initialOption: [ { label: "[All]", value: "All" } ],
              SelectedOption: "All",
              whereField: "SubgroupID",
              isAlpha: false,
              parentDropdown: "Group",
              dependentDropdowns: ["Species"]
            },
            { ddName: "Species",
              expandPanelId: "SpeciesPanel",
              LayerNameAddOn: "Species",
              subLayerName: "vw_AlaskaSpecies",     // table for generating dropdown items
              ddOutFields: ["Common_name", "SppTxtCode", "SppName"],
              labelTemplate: "*Common_name, - ,*SppName",
              orderByFields: ["Common_name"],
              comSci: "com",
              comSciSettings: {
                com: {
                  labelTemplate: "*Common_name, - ,*SppName",
                  orderByFields: ["Common_name"]
                },
                sci: {
                  labelTemplate: "*SppName, - ,*Common_name",
                  orderByFields: ["SppName"]
                }
              },
              initialOption: [ { label: "[All]", value: "All" } ],
              SelectedOption: "All",
              whereField: "SppTxtCode",
              isAlpha: true,
              parentDropdown: "Subgroup",
            },
            { ddName: "SpeciesPanel",
              ddTitle: "Species Filter",
              htmlTemplate: '<button id="ssSpeciesPanel_Button" onclick="expandDropdownPanel(\'ssSpeciesPanel\', true)">Species Filter</button><div id="ssSpeciesPanel_Content" class="dropdown-content" >' + ssSpeciesDropdownHtml + '</div>',
              SelectedOption: "All",
              LayerNameAddOn: "",
              where: ""
            }
          ],
          speciesTableInfo : {
            iconLabel: 'Total Species Data',
            args: 'ssSpTableWidget,"vw_AlaskaSpecies",null,"","All Regions",null,0'
          },
          currTab: 0,
          tabInfo: [
            {
              tabName: 'Regions',
              tabTitle: 'ShoreStation Regions',
              popupTitle: "ShoreStation Region",
              LayerNameAddOn: 'Regions',
              parentAreaType: '',
              visibleHeaderElements: ['ssTableDownload', 'ssTableHeaderTitle', 'ssLabelSpan_featureCount', 'ssCheckboxSpan_showFeatures', 'ssIconSpeciesTable'],
              dropdownElements: [],
              featureOutFields: ["Envelope", "RegionNumID", "RegionalID", "Region"],
              downloadExcludeFields: ["Envelope", "SpTableBtn", "SelRegionBtn"],
              orderByFields: ["Region"],
              calcFields:  [{name: "SpTableBtn", afterField: "Region"}, {name: "SelRegionBtn", afterField: "SpTableBtn"}],
              specialFormatting: {      // Special HTML formatting for field values
                Envelope: {
                  title:  "",
                  colWidth:  5,
                  plugInFields: ["Envelope"],
                  args: '"{0}"',
                  html:  zoomInTemplate.replace("{area}", "Region")
                },
                RegionNumID: {
                  title:  "Region Id",
                  colWidth:  20
                },
                RegionalID: {
                  title:  "Regional Id",
                  colWidth:  20
                },
                Region: {
                  title:  "Region Name"
                  //colWidth:  15
                },
                SpTableBtn: {
                  title:  "Species Data",
                  colWidth:  20,
                  plugInFields: ["RegionalID", "Region"],
                  args: 'ssSpTableWidget,"vw_RegionSpecies",null,"RegionalID=&#039;{0}&#039;","{1}",null,1',
                  html:   spTableTemplate
                },
                SelRegionBtn: {
                  title:  "Stations",
                  colWidth:  15,
                  plugInFields: ["RegionalID", "Envelope"],
                  args: 'ssWidget,"{0}","{1}"',
                  html: gotoSubareasTemplate.replace("{area}", "stations for this region")
                }
              },
              idField: 'Region',
              subTableDD: "Region",
              backgroundLayers: ["Field Stations"],
              filterBgLayer: "Regions",
              clickableSymbolType: "extent",
              clickableSymbolInfo: {
                color: [ 51,51, 204, 0.1 ],
                style: "solid",
                width: "2px"
              },
              //textOverlayPars: null     // IMPORTANT:  Otherwise, will retain previous text overlay settings on tab switch
            },
            {
              tabName: 'Stations',
              subWidgetInfo: ["ssPhotoWidget:station:hasPhotos:string", "ssProfileWidget:station:hasProfile:string"],
              // name of subwidget : filter field : column to check before running query : (optional) "string" if it's a string field
              tabTitle: 'ShoreStation Stations',
              popupTitle: "ShoreStation Stations",
              popupExcludeCols: ["Photos", "Profile"],
              LayerNameAddOn: "vw_StationPoints_",        //'Field Stations',
              parentAreaType: 'Regions',
              visibleHeaderElements: ['ssTableDownload', 'ssRegion_ddWrapper', 'ssBioband_ddWrapper', 'ssSpeciesPanel_ddWrapper', 'ssTableHeaderTitle', 'ssLabelSpan_featureCount', 'ssCheckboxSpan_showFeatures'],
              dropdownElements: ['ssRegion_ddWrapper', 'ssBioband_ddWrapper', 'ssSpecies_ddWrapper', 'ssGroup_ddWrapper', 'ssSubgroup_ddWrapper', 'ssSpeciesPanel_ddWrapper'],
              featureOutFields: ["LocaleConcat", "station", "ExpBio", "CoastalClass", "date_", "hasPhotos", "hasSpecies", "hasProfile"],
              downloadExcludeFields: ["Envelope", "hasPhotos", "hasSpecies", "hasProfile"],
              orderByFields: ["station"],
              calcFields:  [{name: "Envelope", afterField: null}],
              specialFormatting: {      // Special HTML formatting for field values
                Envelope: {
                  title:  "",
                  colWidth:  5,
                  plugInFields: ["x", "y"],
                  args: '"{0},{1},1000"',
                  html: zoomInTemplate.replace("{area}", "Station")
                },
                LocaleConcat: {
                  title:  "Geographic Name",
                  //colWidth:  50
                },
                station: {
                  title:  "Station Id",
                  colWidth:  35
                },
                ExpBio: {
                  title:  "EXP BIO",
                  colWidth:  25
                },
                CoastalClass: {
                  title:  "Coastal Class",
                  colWidth:  60,
                  longValue: {
                    lookupColName: "BC_CLASS",
                    widget: "szUnitsWidget",
                    removeUpTo: ","
                  }
                },
                date_: {
                  title:  "Date Sampled",
                  colWidth:  35,
                  dateFormat: true
                },
                hasPhotos: {
                  title:  "Photos",
                  colWidth:  20,
                  html:   "<img src='assets/images/Camera24X24.png' class='actionIcon' alt=''>",
                  showWhen: "1"
                },
                hasSpecies: {
                  title:  "Species",
                  colWidth:  20,
                  plugInFields: ["station", "station"],
                  args: 'ssSpTableWidget,"vw_StationSpecies",null,"station=&#039;{0}&#039;","{1}",ssSpTableWidget.optionalFieldInfo,2',
                  html:   spTableTemplate,
                  showWhen: "1"
                },
                hasProfile: {
                  title:  "Profile",
                  colWidth:  20,
                  html:   "<img src='assets/images/graph.png' class='actionIcon' alt=''>",
                  showWhen: "1"
                },
              },
              idField: 'station',
              backgroundLayers: ["Regions"],
              //filterBgLayer: "Regions",
              clickableSymbolType: "point",
              clickableSymbolInfo: {
                "style":"circle",
                "color":[255,255,255,0.0],
                outline: {  // autocasts as new SimpleLineSymbol()
                  color: [ 0, 0, 0, 0.0 ],
                  width: "0.5px"
                },
                "size":4
              },
            }

          ],

          layerBaseName: "",      // Blank for Shore Stations, since there are no group queries
          // All layers queried for data tables will have names that start with this.  The QueryBasedPanelWidget method runQuery generates the full name
          //   using the current panel info and dropdown info for any dropdowns that have something selected.

          spatialRelationship: null,      // Using null as a flag to not filter spatially
          showFieldsInPopup: "*",

          // TODO: Remove, and use something like setActiveTab in constructor
          clickableSymbolType: "extent",
          clickableSymbolInfo: {
            color: [ 51,51, 204, 0.1 ],
            style: "solid",
            width: "2px"
          },

          hasTextOverlayLayer: true,
          clickableMsg: null
        });
        /* end szWidget def*/

        ssSpTableWidget = new QueryBasedTablePanelWidget({
          objName: "ssSpTableWidget",
          title: "Species Data",       // "Shore Stations",
          sublayerIDs: ssSublayerIDs,
          panelName: "ssSpTablePanel",
          panelType: "table",
          draggablePanelId: "ssSpTableDiv",
          contentPaneId: "ssSpTableDiv_content",
          baseName: "ssSpTable",
          headerDivName:  "ssSpTableHeaderDiv",
          //footerDivName:  "ssSpTableFooterDiv",
          visibleHeaderElements: ['ssSpTableTableDownload', 'ssSpTableRadioFilter', 'ssSpTableLabelSpan_featureCount'],
          dropdownElements: [],
          featureOutFields: ["SppNameHtml", "Common_name"],
          downloadExcludeFields: [],
          tableHeaderTitle: "All Regions",
          displayDivName: "ssSpTableContainer",
          mapServiceLayer: ssMapServiceLayer,
          dynamicLayerName: true,
            /*add for "tabbed" Species table */
          layerNameTemplate: "vw_{0}Species",
          tableHeaderTitleTemplate: "Species Data for {0}",
            /*add for "tabbed" Species table */
          radioFilterInfo: {
            buttons: ["Benthic marine algae:3", "Marine invertebrates:4", "All Species"],
            whereField: "GroupID",
            where: "",
            checked: 2
          },
          optionalFieldInfo: {
            checkboxId: 'cbBiobands',
            headerElName: 'ssSpTableExtra',
            headerTemplate: '<input type="checkbox" id="{0}" onclick="cbCheckedHandler({w})"><label for="{0}"> Show Biobands</label>',
            tableNames: [     // [statewide, region, station]
              [
                'vw_AlaskaSpecies'
              ],
              [
                'vw_RegionSpecies'
              ],
              [
              'vw_StationSpecies',
              'vw_StationPoints_BiobandsSpecies'
              ]
            ],
            fields: [       // [statewide, region, station]
              [[]],
              [[]],
              [
                ["abundance"],
                ["BandOrder", "BiobandName", "abundance"]
              ]
            ],
            order: [
              [],
              ["BandOrder"]
            ],
          },
          currTab: 0,     // No actual tabs, but 0=statewide, 1=region, and 2=station
          tabsHidden: true,
          //tabName: 'Species',     // No tabs, actually, but this provides a name for feature counts

          tabInfo: [
            {
              tabName: 'Statewide',
              tabTitle: 'All Regions',
              LayerNameAddOn: 'Alaska',
              //featureOutFields: [],
              //orderByFields: [],
            },
            {
              tabName: 'Region',
              tabTitle: 'All Regions',
              LayerNameAddOn: 'Alaska',
              //featureOutFields: [],
              //orderByFields: [],
            },
            {
              tabName: 'Station',
              tabTitle: 'All Regions',
              LayerNameAddOn: 'Alaska',
              //featureOutFields: [],
              //orderByFields: [],
            }
          ],

          orderByFields: ["SppNameHtml"],
          specialFormatting: {      // Special HTML formatting for field values
            SppNameHtml: {
              title: "Species",
              colWidth: 150
            },
            Common_name: {
              title: "Common Name",
              colWidth: 150
            },
            abundance: {
              title: "Abundance",
              colWidth: 60,
              longValue: {
                R: "Rare",
                F: "Few",
                C: "Common",
                A: "Abundant"
              }
            },
            BandOrder: {
              title: "Band #",
              colWidth: 60
            },
            BiobandName: {
              title: "Bioband",
              colWidth: 80
            },
          },
          layerBaseName: "vw_CatchStats_",
          // All layers queried for data tables will have names that start with this.
          // The QueryBasedPanelWidget method runQuery generates the full name
          //   using the current panel info and dropdown info for any dropdowns that have something selected.

          spatialRelationship: null,      // Using null as a flag to not filter spatially
          noGeometry: true
        });

        // Shore Station photos
        ssPhotoWidget = new PhotoPlaybackWidget({
          objName: "ssPhotoWidget",
          sublayerIDs: ssSublayerIDs,
          panelName: "ssPhotosPanel",
          panelType: "media",
          contentPaneId: "ssPhotosDiv",
          baseName: "ssPhoto",
          headerDivName:  "ssPhotoHeaderDiv",
          //displayDivName: "ssPhotoContainer",
          disabledMsgInfix: "photo points",
          disabledMsgDivName: "disabledMsg_ssPhoto",
          defaultDisabledMsg: 'Station photos can be seen by going to the "ShoreStation Stations" tab and clicking on a row having a "photo" icon in the Photos column.',
          noDataMsg: "No photos available for this station.",
          mapServiceLayer: ssMapServiceLayer,
          layerName: "GVDATA_STNPHOTOS",
          featureOutFields: ["*"],
          photoServer: ssPhotoServer,
          relPathField: "FileLocation",
          fileNameField: "ImageFileName",
          captionFields: ["CaptionText", "Description"],
          noGeometry: true,
          controlData: [
            ['ssPhoto_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'toStart'],
            ['ssPhoto_backwardButton', 'Previous Photo', 'backward.png', 'playBackward'],
            ['ssPhoto_pauseButton', 'Pause', 'w_close_red.png', 'pause'],
            ['ssPhoto_ForwardButton', 'Next Photo', 'forward.png', 'playForward'],
            ['ssPhoto_resetForwardButton', 'Reset to End', 'w_collapse.png', 'toEnd']
          ]
        });
        ssPhotoWidget.resizeImg();
        photoWidgets.push(ssPhotoWidget);

        // Shore Station profiles
        ssProfileWidget = new ChartPanelWidget({
          objName: "ssProfileWidget",
          sublayerIDs: ssSublayerIDs,
          panelName: "ssProfilesPanel",
          panelType: "chart",
          contentPaneId: "ssChartsDiv",
          baseName: "ssProfile",
          headerDivName:  "ssProfileHeaderDiv",
          displayDivName: "ssProfileContainer",
          disabledMsgInfix: "profiles",
          disabledMsgDivName: "disabledMsg_ssProfile",
          defaultDisabledMsg: 'Station profiles can be seen by going to the "ShoreStation Stations" tab and clicking on a row having a "graph" icon in the Profiles column.',
          noDataMsg: "No profile available for this station.",
          mapServiceLayer: ssMapServiceLayer,
          layerName: "SHORESTATIONS_STATIONPROFILE_FLAT",
          featureOutFields: ["*"],
          orderByFields: ["Point"],
          titleTemplate: "Shore Station: {0}",
          titleField: "station",
          noGeometry: true,
        });

        siteTabs.ss.widgets = [ssWidget, ssPhotoWidget, ssProfileWidget];

        if (initTab === "ssTab")
          waitAndSelectChild();

        }, function(error){
        console.log("Shore Station MapServiceLayer failed to load:  " + error);
      });

      faMapServiceLayer = new MapImageLayer(faMapServiceLayerURLs[currServerNum],  {id: "faOpLayer", opacity: 1.0, listMode: "show"});
      faMapServiceLayer.when(function() {
        faMapServiceLayer.sublayers = updateSublayerArgs(faDisplayInfo, faSublayerIDs);
        faMapServiceLayer.visible = false;

        faWidget = new QueryBasedTablePanelWidget({
          objName: "faWidget",
          title: "Fish Atlas",
          sublayerIDs: faSublayerIDs,
          panelName: "faPanel",
          panelType: "table",
          contentPaneId: "faDiv",
          baseName: "fa",
          headerDivName:  "faHeaderDiv",
          footerDivName:  "faFooterDiv",
          totalOutFields: ["Hauls", "Species", "Catch"],
          tableHeaderTitle: "All Regions",
          displayDivName: "faContainer",
          disabledMsgDivName: "disabledMsg_fa",
          mapServiceLayer: faMapServiceLayer,
          mapServiceSublayers: ["Regions", /*"Locales",*/ "Sites"],
          dynamicLayerName: true,
          dropDownInfo: [
            { ddName: "Region",
              LayerNameAddOn: "",
              totalsLayerNameAddOn: "Regions",
              subLayerName: "Regions",
              ddOutFields: ["RegionName", "RegionID", "Envelope"],
              orderByFields: ["RegionName"],
              initialOption: [ { label: "[All Alaska regions]", value: "All", extent: "-19224680, 6821327, -14019624, 11811136" } ],
              SelectedOption: "All",
              whereField: "RegionID"
            },
/*  // dropped from FA2020
            { ddName: "Locale",
              LayerNameAddOn: "",
              totalsLayerNameAddOn: "Locales",
              subLayerName: "vw_CatchStats_Locales",    //"Locales (area)",
              ddOutFields: ["Locale", "LocaleID", "Envelope"],
              orderByFields: ["Locale"],
              initialOption: [ { label: "[All]", value: "All" } ],
              SelectedOption: "All",
              whereField: "LocaleID"
            },
*/
            { ddName: "Habitat",
              LayerNameAddOn: "Habitats",
              totalsLayerNameAddOn: "Habitats",
              options: [
                { label: "All", value: "All" },
                { label: "Bedrock", value: "Bedrock" },
                { label: "Eelgrass", value: "Eelgrass" },
                { label: "Kelp", value: "Kelp" },
                { label: "Sand-Gravel", value: "Sand-Gravel" }
              ],
              SelectedOption: "All",
              whereField: "Habitat",
              isAlpha: true
            },

            // The next 2 items may be removed in favor of 1 common habitat dropdown, if it is decided not to keep
            //    habitat selection independent between Region/Locale/Site tabs
/*  // dropped from FA2020
            { ddName: "LocaleHabitat",
              ddTitle: "Habitat",     // Title text if it is not ddName value
              LayerNameAddOn: "Habitats",
              totalsLayerNameAddOn: "Habitats",
              options: [
                { label: "All", value: "All" },
                { label: "Bedrock", value: "Bedrock" },
                { label: "Eelgrass", value: "Eelgrass" },
                { label: "Kelp", value: "Kelp" },
                { label: "Sand-Gravel", value: "Sand-Gravel" }
              ],
              SelectedOption: "All",
              whereField: "Habitat",
              isAlpha: true
            },
*/
            { ddName: "SiteHabitat",
              ddTitle: "Habitat",     // Title text if it is not ddName value
              LayerNameAddOn: "Habitats",
              totalsLayerNameAddOn: "Habitats",
              options: [
                { label: "All", value: "All" },
                { label: "Bedrock", value: "Bedrock" },
                { label: "Eelgrass", value: "Eelgrass" },
                { label: "Kelp", value: "Kelp" },
                { label: "Sand-Gravel", value: "Sand-Gravel" }
              ],
              SelectedOption: "All",
              whereField: "Habitat",
              isAlpha: true
            },

            { ddName: "Species",
              expandPanelId: "SpeciesPanel",
              LayerNameAddOn: "Species",
              totalsLayerNameAddOn: "Species",
              subLayerName: "vw_CatchStats_Species",
              ddOutFields: ["Sp_CommonName", "SpCode", "Sp_ScientificName"],
              labelTemplate: "*Sp_CommonName, - ,*Sp_ScientificName",
              orderByFields: ["Sp_CommonName"],
              comSci: "com",
              comSciSettings: {
                com: {
                  labelTemplate: "*Sp_CommonName, - ,*Sp_ScientificName",
                  orderByFields: ["Sp_CommonName"]
                },
                sci: {
                  labelTemplate: "*Sp_ScientificName, - ,*Sp_CommonName",
                  orderByFields: ["Sp_ScientificName"]
                }
              },
              initialOption: [ { label: "[All]", value: "All" } ],
              SelectedOption: "All",
              whereField: "SpCode",
              isAlpha: true
            },
            { ddName: "SpeciesPanel",
              ddTitle: "Species Filter",
              htmlTemplate: '<button id="faSpeciesPanel_Button" onclick="expandDropdownPanel(\'faSpeciesPanel\', true)">Species Filter</button><div id="faSpeciesPanel_Content" class="dropdown-content" >' + faSpeciesDropdownHtml + '</div>',
              SelectedOption: "All",
              LayerNameAddOn: "Species",
              totalsLayerNameAddOn: "Species",
            }
          ],
          speciesTableInfo : {
            iconLabel: 'Total Fish Catch',
            args: 'faSpTableWidget,"vw_CatchStats_Species","vw_CatchStats_","","All Regions"'
          },
          currTab: 0,
          featureOutFields: ["Envelope", "Region", "Hauls", "Species", "Catch", "RegionID"],
          tabInfo: [

            {
              tabName: 'Regions',
              tabTitle: 'Fish Atlas Regions',
              popupTitle: "Fish Atlas Region",
              LayerNameAddOn: 'Regions',
              parentAreaType: '',
              // TODO: Have 'faTableDownload' added in code, if downloadExcludeFields is present
              visibleHeaderElements: ['faTableDownload', 'faTableHeaderTitle', 'faHabitat_ddWrapper', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures', 'faIconSpeciesTable'],
              dropdownElements: ['faHabitat_ddWrapper'],
              featureOutFields: ["Envelope", "Region", "Hauls", "Species", "Catch", "RegionID"],
              downloadExcludeFields: ["Envelope", "RegionID", "SelRegionBtn"],
              calcFields:  [{name: "SelRegionBtn", afterField: "RegionID"}],
              orderByFields: ["Region"],
              specialFormatting: {      // Special HTML formatting for field values
                Envelope: {
                  title:  "",
                  colWidth:  5,
                  plugInFields: ["Envelope"],
                  args: '"{0}"',
                  html: zoomInTemplate.replace("{area}", "Region")
                },
                //Region: { colWidth: 10 },
                Hauls: {
                  colWidth: 10,
                  useCommas: true
                },
                Species: {
                  colWidth: 10,
                  useCommas: true
                },
                Catch: {
                  colWidth: 10,
                  useCommas: true
                },
                RegionID: {
                  title:  "Fish Catch",
                  colWidth:  10,
                  plugInFields: ["RegionID", "Region"],
                  args: 'faSpTableWidget,"vw_CatchStats_RegionsSpecies","vw_CatchStats_Regions","RegionID={0}","{1}"',
                  html:   spTableTemplate
                },
                SelRegionBtn: {
                  title:  "Sites",
                  colWidth:  5,
                  plugInFields: ["RegionID", "Envelope"],
                  args: 'faWidget,{0},"{1}"',
                  html:  gotoSubareasTemplate.replace("{area}", "Sites for this region")
                }
              },
              idField: 'Region',
              subTableDD: "Region",
              backgroundLayers: ["Sites"],
              filterBgLayer: "Regions",
              clickableSymbolType: "extent",
              clickableSymbolInfo: {
                color: [ 51,51, 204, 0.1 ],
                style: "solid",
                width: "2px"
              },
              mapServiceSublayerVisibility: [false, false, true]
              //textOverlayPars: null     // IMPORTANT:  Otherwise, will retain previous text overlay settings on tab switch
            },
/*
            {
              tabName: 'Locales',
              tabTitle: 'Fish Atlas Locales',
              popupTitle: "Fish Atlas Locale",
              LayerNameAddOn: 'Locales',
              parentAreaType: 'Regions',
              visibleHeaderElements: ['faTableDownload', 'faRegion_ddWrapper', 'faLocaleHabitat_ddWrapper', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures'],
              dropdownElements: ['faRegion_ddWrapper', 'faLocaleHabitat_ddWrapper'],
              featureOutFields: ["Envelope", "Region", "MapID", "Locale", "Hauls", "Species", "Catch", "LocaleID"],
              downloadExcludeFields: ["Envelope", "LocaleID", "SelLocaleBtn"],
              calcFields:  [{name: "SelLocaleBtn", afterField: "LocaleID"}],
              orderByFields: ["Region", "Locale"],
              specialFormatting: {      // Special HTML formatting for field values
                Envelope: {
                  title:  "",
                  colWidth:  5,
                  plugInFields: ["Envelope"],
                  args: '"{0}"',
                  html: zoomInTemplate.replace("{area}", "Locale")
                },
                Region: { colWidth: 30 },
                MapID: {
                  colWidth: 10                },
                Hauls: {
                  colWidth: 12,
                  useCommas: true
                },
                Species: {
                  colWidth: 12,
                  useCommas: true
                },
                Catch: {
                  colWidth: 12,
                  useCommas: true
                },
                LocaleID: {
                  title:  "Fish Catch",
                  colWidth:  12,
                  plugInFields: ["LocaleID", "Locale"],
                  args: 'faSpTableWidget,"vw_CatchStats_LocalesSpecies","vw_CatchStats_Locales","LocaleID={0}","{1}"',
                  html:   spTableTemplate     //"<img src='assets/images/table.png' onclick='mapStuff.openSpeciesTable({args})' class='actionIcon' alt=''>"
                },
                SelLocaleBtn: {
                  title:  "Sites",
                  colWidth:  8,
                  plugInFields: ["LocaleID", "Envelope"],
                  args: 'faWidget,{0},"{1}"',
                  html: gotoSubareasTemplate.replace("{area}", "sites for this locale")
                }
              },
              idField: 'Locale',
              subTableDD: "Locale",
              backgroundLayers: ["Regions"],
              filterBgLayer: "Locales_background",
              clickableSymbolType: "point",
              clickableSymbolInfo: {
                style:"square",
                color:[255,255,255,0.0],    //opacity was set at 1
                outline: {  // autocasts as new SimpleLineSymbol()
                  color: [ 128, 128, 128, 0.0 ],   //opacity was set at 1
                  width: "0.5px"
                },
                size:12
              },
            },
*/
            {
              tabName: 'Sites',
              subWidgetInfo: ["faPhotoWidget:SiteID:PhotoCount"],     // name of subwidget : filter field : column to check before running query
              tabTitle: 'Fish Atlas Sites',
              popupTitle: "Fish Atlas Site",
              popupExcludeCols: ["Photos"],
              LayerNameAddOn: 'Sites',
              parentAreaType: 'Regions',
              visibleHeaderElements: ['faTableDownload', 'faRegion_ddWrapper', /*'faLocale_ddWrapper',*/ 'faSiteHabitat_ddWrapper', 'faSpeciesPanel_ddWrapper', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures'],
              dropdownElements: ['faRegion_ddWrapper', 'faSiteHabitat_ddWrapper', 'faSpeciesPanel_ddWrapper'],
              featureOutFields: [/*"Envelope", */"Region", "Locale", "Site", "Latitude", "Longitude", "Habitat", "Hauls", "Species", "Catch", "SiteID", "PhotoCount"],
              downloadExcludeFields: ["Envelope", "SiteID", "PhotoCount", "FishCatch"],
              calcFields:  [{name: "Envelope", afterField: null}, {name: "FishCatch", afterField: "SiteID"}],
              orderByFields: ["Region", "Locale", "Site"],
              specialFormatting: {      // Special HTML formatting for field values
                Envelope: {
                  title:  "",
                  colWidth:  5,
                  plugInFields: ["x", "y"],
                  args: '"{0},{1},1000"',
                  html: zoomInTemplate.replace("{area}", "Site")
                },
                Region: { colWidth: 30 },
                Site: { colWidth: 15 },
                Latitude: {
                  colWidth: 20,
                  numDecimals: 4
                },
                Longitude: {
                  colWidth: 20,
                  numDecimals: 4
                },
                Habitat: { colWidth: 20 },
                Hauls: {
                  colWidth: 15,
                  useCommas: true
                },
                Species: {
                  colWidth: 15,
                  useCommas: true
                },
                Catch: {
                  colWidth: 15,
                  useCommas: true
                },
                FishCatch: {
                  title:  "Fish Catch",
                  colWidth:  20,
                  plugInFields: ["SiteID", "Site"],
                  args: 'faSpTableWidget,"vw_CatchStats_SitesSpecies","vw_CatchStats_Sites","SiteID={0}","{1}"',
                  html:   spTableTemplate
                },
                SiteID: {
                  hidden: true
                },
                PhotoCount: {
                  title:  "Photos",
                  colWidth:  12,
                  html:   "<img src='assets/images/Camera24X24.png' class='actionIcon' alt=''>",
                  showWhen: 1
                }
              },
              idField: 'SiteID',
              backgroundLayers: ["Regions"],
              filterBgLayer: "Sites_background",
              clickableSymbolType: "point",
              clickableSymbolInfo: {
                "style":"circle",
                "color":[255,255,255,0.0],
                outline: {  // autocasts as new SimpleLineSymbol()
                  color: [ 0, 0, 0, 0.0 ],
                  width: "0.5px"
                },
                "size":4
              },
/*
              renderingInfo: {
                field: "Habitat",
                uniqueColors: {
                  "Bedrock": "blue",
                  "Eelgrass": "green",
                  "Kelp": "red",
                  "Sand-Gravel": "yellow"
                },
              }
*/

            },
/*
            {
              tabName: 'Temperature',
              tabTitle: 'Temperature Data',
              notAvailableMsg: 'Sorry, temperature data is not available yet.  Coming soon!',
              popupTitle: "Thermograph",
              LayerNameAddOn: 'Temperature',
              featureOutFields: ["Region", "Hauls", "Species", "Catch"],
              idField: 'Region'
            },
            {
              tabName: 'Eelgrass',
              tabTitle: 'Eelgrass Data',
              notAvailableMsg: 'Sorry, eelgrass bed data is not available yet.  Coming soon!',
              popupTitle: "Eelgrass Bed",
              LayerNameAddOn: 'Eelgrass',
              featureOutFields: ["Region", "Hauls", "Species", "Catch"],
              idField: 'Region'
            }
*/
          ],
          layerBaseName: "vw_CatchStats_",      // All layers queried for data tables will have names that start with this.  The QueryBasedPanelWidget method runQuery generates the full name
                                                //   using the current panel info and dropdown info for any dropdowns that have something selected.
          spatialRelationship: null,      // Using null as a flag to not filter spatially
          showFieldsInPopup: "*",

          // TODO: Remove, and use something like setActiveTab in constructor
          clickableSymbolType: "extent",
          clickableSymbolInfo: {
            color: [ 51,51, 204, 0.1 ],
            style: "solid",
            width: "2px"
          },

          hasTextOverlayLayer: true,
          clickableMsg: null
        });

        faSpTableWidget = new QueryBasedTablePanelWidget({
          objName: "faSpTableWidget",
          title: "Fish Catch",
          sublayerIDs: faSublayerIDs,
          panelName: "faSpTablePanel",
          panelType: "table",
          draggablePanelId: "faSpTableDiv",
          contentPaneId: "faSpTableDiv_content",
          baseName: "faSpTable",
          headerDivName:  "faSpTableHeaderDiv",
          footerDivName:  "faSpTableFooterDiv",
          visibleHeaderElements: ['faSpTableTableDownload', 'faSpTableLabelSpan_featureCount'],
          dropdownElements: [],
          featureOutFields: ["Sp_CommonName", "Catch", "AvgFL", "Count_measured"],
          downloadExcludeFields: [],
          totalOutFields: ["Catch", "Count_measured"],
          tableHeaderTitle: "All Regions",
          displayDivName: "faSpTableContainer",
          mapServiceLayer: faMapServiceLayer,
          dynamicLayerName: true,
          currTab: 0,
          tabName: 'Species',     // No tabs, actually, but this provides a name for feature counts
          orderByFields: ["Catch DESC"],
          specialFormatting: {      // Special HTML formatting for field values
            Sp_CommonName: {
              title: "Species",
              colWidth: 200
            },
            Catch: {
              title: "Catch",
              colWidth: 80,
              useCommas: true
            },
            AvgFL: {
              title: "Average Length",
              colWidth: 120,
              numDecimals: 1
            },
            Count_measured: {
              title: "# Measured",
              colWidth: 120,
              useCommas: true
            },
          },
          layerBaseName: "vw_CatchStats_",
          // All layers queried for data tables will have names that start with this.
          // The QueryBasedPanelWidget method runQuery generates the full name
          //   using the current panel info and dropdown info for any dropdowns that have something selected.

          spatialRelationship: null,      // Using null as a flag to not filter spatially
          noGeometry: true
        });

        // Fish Atlas photos
        faPhotoWidget = new PhotoPlaybackWidget({
                    objName: "faPhotoWidget",
                    sublayerIDs: faSublayerIDs,
                    panelName: "faPhotosPanel",
                    panelType: "media",
                    contentPaneId: "faPhotosDiv",
                    baseName: "faPhoto",
                    headerDivName:  "faPhotoHeaderDiv",
                    disabledMsgInfix: "photo points",
                    disabledMsgDivName: "disabledMsg_faPhoto",
                    defaultDisabledMsg: 'Site photos can be seen by going to the "Fish Atlas Sites" tab and clicking on a row having a "photo" icon in the Photos column.',
                    noDataMsg: "No photos available for this site.",
                    mapServiceLayer: faMapServiceLayer,
                    layerName: "Photos_Sites",
                    featureOutFields: ["*"],
                    photoServer: faPhotoServer,
                    //relPathField: "FileLocation",
                    fileNameField: "SitePhoto1",
                    captionFields: ["GenericCaption"],
                    noGeometry: true,
                    controlData: [
                      ['faPhoto_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'toStart'],
                      ['faPhoto_backwardButton', 'Previous Photo', 'backward.png', 'playBackward'],
                      ['faPhoto_pauseButton', 'Pause', 'w_close_red.png', 'pause'],
                      ['faPhoto_ForwardButton', 'Next Photo', 'forward.png', 'playForward'],
                      ['faPhoto_resetForwardButton', 'Reset to End', 'w_collapse.png', 'toEnd']
                    ]
        });
        faPhotoWidget.resizeImg();
        photoWidgets.push(faPhotoWidget);
        siteTabs.fa.widgets = [faWidget, faPhotoWidget];

        if (initTab === "faTab")
          waitAndSelectChild();

      }, function(error){
        console.log("Fish Atlas MapServiceLayer failed to load:  " + error);
      });

      sslMapServiceLayer = new MapImageLayer(sslMapServiceLayerURLs[currServerNum], {id: "sslOpLayer", "opacity" : 0.5});

      serviceLayers = [sslMapServiceLayer, ssMapServiceLayer, faMapServiceLayer, szMapServiceLayer];

      // TODO:  Make this list of service names, so legend info can be generated independently of operational layers?
      llServiceLayers = [sslMapServiceLayer, ssMapServiceLayer, faMapServiceLayer, szMapServiceLayer];
    }


/*
//Might eventually use this function, if 3D option is added
  function sceneViewExtent(view, m) {
    // Calculate true extent of tilted 3D view
    // view is the SceneView being used
    // m is an optional margin, in pixels
    // Query.geometry can be a Polygon, so doesn't have to be a right-angled rectangle like extent?
    if (m === undefined)
      m = 0;
    //console.log(view.extent);
    let maxX = view.container.offsetWidth;
    let maxY = view.container.offsetHeight;
    let screenPoints = [[m,m], [maxX-m,m], [maxX-m,maxY-m], [m,maxY-m]];
    let mapPoints = [];
    for (let p=0; p<screenPoints.length; p++) {
      let screenPoint = new Point({x: screenPoints[p][0], y: screenPoints[p][1]});
      let mapPoint = view.toMap(screenPoint);     // These are the points I want to use to get true extent
      if (!mapPoint)
        return null;
      let geogPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
      mapPoints.push([mapPoint.x, mapPoint.y, mapPoint.z]);
    }
    mapPoints.push(mapPoints[0]);
    let newPolygon = new Polygon(mapPoints);
    return newPolygon;
  }
*/

  function handleExtentChange(newExtent) {
    // For 3D, change newExtent to Polygon of tilted view extent
    // If using MapView (2D), comment out these lines
    //let extent3d = sceneViewExtent(view, 200);
    //let extent3d_geog = webMercatorUtils.webMercatorToGeographic(extent3d);

/*  // Attempt at prequery for too many records
    //JN  Works, times out at 60s (~1M records).
      this.prequeryTask = new QueryTask(szMapServiceLayerURL + "/2");
      let maxNum = 6000;
      console.log(new Date() + ":  Getting count of video points...");
      this.prequeryTask.executeForCount({
        spatialRelationship: "contains",
        geometry: view.extent,
        num: maxNum
      }).then(function(results){
        console.log(new Date() + ":  Received response (video point count)");
        if (results===maxNum) {
          console.log(this.baseName + ":  max features (" + maxNum + ") returned.");
        } else {
          console.log(results + " features returned");
        }
      }.bind(this), function(error) {
        console.log(new Date() + ":  QueryTask failed.");
      }.bind(this));
*/

    szFeatureRefreshDue = (newExtent.width/1000 < maxExtentWidth);
    if (lock_points)      // If point set is locked,
      return;             //    then don't reset or query new points
    if (settings.autoRefresh) {
      if (extentChangeIsSmall())
        return;
      // Check if change might be due to file downloads panel appearing/disappearing (change in bhDiff).  If so, skip refresh.
      let newBhDiff = window.outerHeight - window.innerHeight;
      if (Math.abs(newBhDiff-bhDiff) < 5)
        refreshSzFeatures();
      else
        bhDiff = newBhDiff;
      
    } else {
        setRefreshButtonVisibility(szFeatureRefreshDue);
    }
  }

  function extentChangeIsSmall() {
    if (!lastSZExtent)
      return false;
    for (p of ['xmin', 'ymin', 'xmax', 'ymax']) {
      if (Math.abs(lastSZExtent[p]-view.extent[p] ) > 100)
        return false;
    }
    return true;
  }

  function bookmarkCurrentExtent(screenshot) {
    let newExtent = this.extent;
    let newViewpoint = this.viewpoint;
    let km = Math.round(newExtent.width/1000) + " km";
    if (savedExtentsWidget.bookmarks.items.length === 0)
      km = "Initial Extent";

    let bookmark = new Bookmark({name: km, extent: newExtent});
    //let bookmark = new Bookmark({name: km, viewpoint: newViewpoint});
/*
    TODO: Keep an eye on this.  Warning says:
      [esri.webmap.Bookmark] ������ DEPRECATED - Property: extent ������️ Replacement: viewpoint ⚙️ Version: 4.17
    However, when I use "viewpoint", jump to previous extent fails, and this message comes up:
      [esri.webmap.Bookmark]  e {name: "invalid-viewpoint", details: Object, message: "'viewpoint.targetGeometry' should be an extent"}
*/

    bookmark.index = savedExtentsWidget.bookmarks.length;
    if (screenshot)
      bookmark.thumbnail.url = screenshot.dataUrl;
    savedExtentsWidget.bookmarks.add(bookmark);
    currentBookmark = bookmark;
  }

  function addMapWatchers() {

/*
    view.on("layerview-create", function(event) {
      console.log(event.layerView.layer.title);
    });
*/

    view.when(function() {
      //searchWidget.activeSource.filter = {geometry: view.extent};
      //homeExtent = view.extent;
      map.basemap = startBasemap;   //HACK:  Because inital basemap setting of "oceans" messes up initial extent and zooming
      //let moveButtonAction = {title: "Move the camera", id: "move-camera"};
      let p = view.popup;     // new Popup();
      if (popupsDocked) {
        p.dockEnabled = true;
        p.dockOptions = {position: "bottom-right" };
      }
      //p.actions.removeAll();
      //p.actions.push(moveButtonAction);
      p.on("trigger-action", function(event){
        if (event.action.id === "move-camera") {
          if (currentWidgetController)
            currentWidgetController.moveButtonPressHandler(currentHoveredGraphic.attributes);
        }
      });
    });

    // TODO: use esri/core/watchUtils instead of the following "watch" calls?

    // When "stationary" property changes to True, there is a new extent, so handle the extent change
    view.watch("stationary", function(newValue, oldValue, property, object) {
      if (siteTabs.visManager.currClassName !== "sz")
        return;
      if (view.stationary) {
        let bypass = false;
        if (!bypass)
          handleExtentChange(view.extent);
      } else {
        if (!view.resizing)
          extentChanged = true;
      }
    });

    // When "updating" property changes to False, if extent is not changing and not drawing a zoom rectangle, then make a new bookmark (unless bookmark already exists)
    view.watch("updating", function() {
      if (view.updating || !extentChanged || !view.stationary || drawingZoomRectangle)
        return;
      if (extentIsBookmarked) {
        extentIsBookmarked = false;
      } else {
          view.takeScreenshot({width: 200, height: 200}).then(bookmarkCurrentExtent.bind(view));
          extentChanged = false;
      }
    });

    view.watch("resizing", function(isResizing, oldValue, property, object) {
      if (isResizing) {
        console.log("resizeWidgets");
        resizeWidgets();
      }
    });

    /* Suggestion for repositioning map popup
    view.popup.watch("visible", function() {
      setTimeout(function(){
        view.popup.reposition();
      }, 500);
    });
    */

    // Handle click events:  Check for mouse over graphic features
    // Create a symbol for rendering the graphic
    let zoomRectFillSymbol = {
      type: "simple-fill", // autocasts as new SimpleFillSymbol()
      color: [227, 0, 0, 0.2],
      outline: { // autocasts as new SimpleLineSymbol()
        color: [255, 0, 0],
        width: 1
      }
    };

    let extentGraphic = null;
    let origin = null;
    view.on('drag', [], function(e){
      if (panning)
        return;
      e.stopPropagation();
      if (e.action === 'start'){
        drawingZoomRectangle = true;
        if (extentGraphic) view.graphics.remove(extentGraphic)
        origin = view.toMap(e);
      } else if (e.action === 'update'){
        if (extentGraphic) view.graphics.remove(extentGraphic)
        let p = view.toMap(e);
        extentGraphic = new Graphic({
          geometry: new Extent({
            xmin: Math.min(p.x, origin.x),
            xmax: Math.max(p.x, origin.x),
            ymin: Math.min(p.y, origin.y),
            ymax: Math.max(p.y, origin.y),
            spatialReference: { wkid: 102100 }
          }),
          symbol: zoomRectFillSymbol
        })

        view.graphics.add(extentGraphic)
      } else if (e.action === 'end'){
        //extentIsBookmarked = true;
        view.graphics.remove(extentGraphic);
        drawingZoomRectangle = false;
        view.goTo(extentGraphic, {animate: false});
      }
    });

      // Handle click events:  Check for mouse over graphic features
    view.on('click', [], function(e){
      let screenPoint = {x: e.x, y: e.y};
      view.hitTest(screenPoint).then(handleGraphicHits);
    });


    // Handle mouse-move events:  Update map coordinate display, and check for mouse over graphic features
    view.on('pointer-move', [], function(e){
      let screenPoint = {x: e.x, y: e.y};
      let mapPoint = view.toMap(screenPoint);

      if (!mapPoint) {
        console.log("3D point is outside globe");
        return;
      }
      let geogPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);    //szVideoWidget._webMercatorToGeographic(mapPoint);
      dom.byId("coordinates").innerHTML = decDegCoords_to_DegMinSec(geogPoint.x, geogPoint.y);

      view.hitTest(screenPoint).then(handleGraphicHits);

    });
  }


  // If mouse if over a video/photo graphic, open popup allowing moving the "camera" to this point
  function handleGraphicHits(response) {
    if (response.results.length === 0) {
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
      return;
    }

    let i=0;      // Respond only to hits on "_Clickable" layers
    while (i<response.results.length && response.results[i].graphic.layer.id.slice(-10)!=="_Clickable")
      i++;
    if (i === response.results.length) {
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
      return;
    }

    if (response.results[i].graphic !== currentHoveredGraphic) {
      currentHoveredGraphic = response.results[i].graphic;
      currentWidgetController = currentHoveredGraphic.layer.widgetController;
      let dataRow = null;
      if (currentWidgetController.grid)
        dataRow = currentWidgetController.highlightAssociatedRow(currentHoveredGraphic)
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
        hoverTimeout = setTimeout(currentWidgetController.displayPlayButton(currentHoveredGraphic, dataRow), minHoverTime);       // delay popup
    }
  };

  function clearAllHoverGraphics() {
  }

  function getLegendHtml(n) {
    if (n === llServiceLayers.length) {
      makeLayerListWidget();
      return;
    };
    const serviceLayer = llServiceLayers[n];

    let legendQueryTimeout = setTimeout(function() {    // In case service is not running, this bypasses
      if (!legendInfo[this.title])
        getLegendHtml(n+1);
    }.bind({title: serviceLayer.title, n: n}), 5000);

    queryServer(serviceLayer.url + "/legend", true, function(R) {
      legendInfo[this.title] = R.layers;
      getLegendHtml(n+1);
    }.bind(serviceLayer));
  }

  function makeWidgetDiv(divID, placement, maxHeight, theClass) {
    if (placement === undefined)
      placement = "";
    let newDiv = document.createElement("div");
    newDiv.id = divID;
    if (theClass)
      newDiv.setAttribute("class", theClass);
    newDiv.style.position = "absolute";
    if (placement==="bottom")
      newDiv.style.bottom = "5px";
    if (placement==="right")
      newDiv.style.right = "5px";
    newDiv.draggable = true;
    newDiv.ondragstart = drag_start;
    newDiv.style.maxHeight = maxHeight;
    return newDiv;
  }

  function drag_start(event) {
    let style = window.getComputedStyle(event.target, null);
    let str = (parseInt(style.getPropertyValue("left")) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top")) - event.clientY)+ ',' + event.target.id;
    event.dataTransfer.setData("Text",str);
  }

  function drop(event) {
    let offset = event.dataTransfer.getData("Text").split(',');
    let dm = getEl(offset[2]);
    dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
    dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
    event.preventDefault();
    return false;
  }

  function drag_over(event) {
    event.preventDefault();
    return false;
  }

  function wrapperWithOpacitySlider(divNode, title) {
    // Inserts a panel (divNode) into a wrapper DIV with a slider controlling the panel's opacity
    // Returns a handle to the new wrapper DIV
    let divID = divNode.id;
    let newDiv = document.createElement("div");
    newDiv.id = divID + "_wrapper";
    let sliderDiv = document.createElement("div")
    sliderDiv.innerHTML = '<input type="range" value="90" oninput="sliderHandler(\'' + divID + '\')" id="' + divID + '_slider" >';
    sliderDiv.innerHTML += '<label style="position: absolute; top: 5px; left:20px; color: #76766e">' + title + '</label>';
    let contentDiv = document.createElement("div")
    contentDiv.id = divID + "_content";
    contentDiv.appendChild(divNode);
    newDiv.appendChild(sliderDiv);
    newDiv.appendChild(contentDiv);
    return newDiv;
  }


  function makeLayerListWidget() {
    // Add ESRI LayerList widget.  This goes in the "layerListDom" DIV, rather than the map
    // NOTE:  To prevent a layer from appearing in the LayerList, set the layer's "listMode" property to "hide"
    layerListWidget = new LayerList({
      //    container: "layerListDom",
      container: makeWidgetDiv("layerListDiv","right",(mapDiv.offsetHeight - 100) + "px", "nowrap_ScrollX"),     // Set max height of LayerListWidget to mapDiv height - 100
      view: view
    });


    layerListWidget.listItemCreatedFunction = function(event) {
      const item = event.item;

      // This option collapses groups when nothing under them is visible at the current extent
      item.open = item.visibleAtCurrentScale;
      item.watch("visibleAtCurrentScale", function() {
        item.open = item.visibleAtCurrentScale;
        if (item.panel)
          item.panel.open = (item.visible && item.visibleAtCurrentScale);
      });

      const serviceName = getSublayerServiceName(item);
      const layerId = item.layer.id;
      const svcLegendInfo = legendInfo[serviceName];
      let legendDivId = null;
      const l = svcLegendInfo.findIndex(obj => obj.layerId === layerId );
      if (l !== -1) {
        item.openable = true;
        const lTitle = svcLegendInfo[l].layerName;
        if (item.title === "")
          item.title = lTitle;
        let fInfo = null;
        const f = legendFilters.findIndex(obj => obj.layerTitle === lTitle);

        if (f !== -1) {
          fInfo = legendFilters[f];
          legendDivId = 'swatch_'  + serviceName + '_' + fInfo.fieldName;
        }

        const lInfo = svcLegendInfo[l].legend;
        let theContentHtml = '';
        for (let row=0; row<lInfo.length; row++) {
          let rowInfo = lInfo[row];
          const imgSrc = 'data:image/png;base64,' + rowInfo.imageData;
          const imgHtml = '<img src="' + imgSrc + '" border="0" width="' + rowInfo.width + '" height="' + rowInfo.height + '">';
          let idInsert = '';

          if (fInfo) {
            let value = rowInfo.values[0];      // label;
            if (fInfo.delimiter)
              value = value.split(fInfo.delimiter)[0];
            if (rowInfo.label !== '') {
              const swatchId = legendDivId + '_' + value;
              idInsert = ' id="' + swatchId + '"';
            }
          }

          theContentHtml += '<div' + idInsert + '>' + imgHtml + rowInfo.label + '</div>';     // + '<br>';
        }
        let contentDiv = makeHtmlElement("DIV",legendDivId,null,null,theContentHtml);
        if (fInfo)
          fInfo.contentDiv = contentDiv;
        item.panel = {
          content: contentDiv,
          open: (item.visible && item.visibleAtCurrentScale)
        };
      }

      item.watch("visible", function() {
        if (item.widget)
          item.widget.clickableLayer.visible = item.visible;    // Make associated clickableLayer visibility same as LayerList item visibility
        if (item.openable)
          item.panel.open = (item.visible && item.visibleAtCurrentScale);
      });

      if (item.layer.title === "Still Photos") {
        item.widget = szPhotoWidget;
      }
      if (item.layer.title === "Video Flightline") {
        listItem_VideoFlightline = item;
        item.widget = szVideoWidget;
      }
      if (item.layer.title === "10s") {
        listItem_10s_legendHtml = item.panel.content.innerHTML;
        modify_LayerListItem_VideoFlightline();
      }

    };

    llExpand.content = wrapperWithOpacitySlider(layerListWidget.domNode, "Layers");
  }


  function addMapWidgets() {

    view.container.ondragover = drag_over;
    view.container.ondrop = drop;

/*  Upper-left widgets  */

    let homeWidget = new Home({
      view: view
    });
    view.ui.add({ component: homeWidget, position: "top-left", index: 0});    // Specify index=0, so this widget appears before the (default) Zoom +/- widget

    let panZoomDiv = document.createElement("DIV");
    panZoomDiv.innerHTML = panZoomHtml;
    view.ui.add(panZoomDiv, "top-left");

    let prevNextBtnsDiv = document.createElement("DIV");
    prevNextBtnsDiv.innerHTML = prevNextBtnsHtml;
    view.ui.add(prevNextBtnsDiv, "top-left");

    savedExtentsWidget = new Bookmarks({
      view: view,
      bookmarks: new Collection(),      // In 4.12, needed to get past bug
      editingEnabled: true,
      visibleElements: {addBookmark: false}
    });
    let savedExtentsExpand = new Expand({
      expandIconClass: "esri-icon-collection",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
      expandTooltip: "Show extents history", // optional, defaults to "Expand" for English locale
      view: view,
      content: savedExtentsWidget
    });
    view.ui.add(savedExtentsExpand, {
      position: "top-left"
    });

    savedExtentsWidget.on("select-bookmark", function(event){
      extentIsBookmarked = true;
      currentBookmark = event.bookmark;      //parseInt(event.target.activeBookmark.name.split(":")[0]);
      let prevButton = getEl("btn_prevExtent");
      let nextButton = getEl("btn_nextExtent");
      // TODO: Place IMG inside BUTTON tag, and use "dsiable" attribute
      prevButton.style.opacity = 1;
      nextButton.style.opacity = 1;
      if (currentBookmark.index === 0)
        prevButton.style.opacity = 0.2;
      if (currentBookmark.index === (savedExtentsWidget.bookmarks.items.length-1))
        nextButton.style.opacity = 0.2;
    });

/*  Upper-left widgets  */


/*  Upper-right widgets  */

    //makeLayerListWidget();

    // place the LayerList in an Expand widget
    llExpand = new Expand({
      view: view,
      //content is added later, after querying server for legend info
      expandIconClass: "esri-icon-layer-list",
      expandTooltip: "Click here to view and select layers",
      collapseTooltip: "Hide layer list",
      expanded: true      // PUB: set to true
    });
    view.ui.add({ component: llExpand, position: "top-right", index: 0});

    // NOAA offline app link
    olExpand = new Expand({
      view: view,
      content: makeWidgetDiv("offlineAppPanel", "right")   ,
      expandIconClass: "esri-icon-download",
      expandTooltip: "Click here to download data in the current extent and use with the offline app",
      collapseTooltip: "Hide the offline app widget"
    });
    olExpand.content.innerHTML = download_notZoomedInEnoughContent;
    view.ui.add(olExpand, "top-right");


    // Settings widget
    let settingsExpand = new Expand({
      view: view,
      content: makeWidgetDiv("settingsPanel", "right")   ,
      expandIconClass: "esri-icon-settings",
      expandTooltip: "Click here to go to website settings.",
      collapseTooltip: "Hide settings widget"
    });
    settingsExpand.content.innerHTML = settingsHtml;
    view.ui.add(settingsExpand, "top-right");

    let refreshFeaturesDiv = document.createElement("DIV");
    refreshFeaturesDiv.innerHTML = refreshFeaturesHtml;
    view.ui.add(refreshFeaturesDiv, "top-right");


    /*  Upper-right widgets  */


/*  Bottom widgets  */
    let nauticalLayer = new MapImageLayer({
      url: "https://seamlessrnc.nauticalcharts.noaa.gov/ArcGIS/rest/services/RNC/NOAA_RNC/MapServer"
    });

    let nauticalBaseLayer = new Basemap({
      baseLayers: nauticalLayer,
      title: "NOAA Nautical Charts",
      id: "noaaNautical",
      thumbnailUrl:
        "assets/images/thumbnail_noaaNautical.png"
    });

    /*    Attempt to add USA Topo Maps to Basemap Gallery
        // https://www.arcgis.com/home/webmap/viewer.html?webmap=931d892ac7a843d7ba29d085e0433465
        let item = new PortalItem({
          id: "931d892ac7a843d7ba29d085e0433465"
        });

        let newBaseLayer = new Basemap({
          baseLayers: item
        });
    */


    let basemapSource = [nauticalBaseLayer];
    //basemapSource.push(newBaseLayer);
    for (bId of basemapIds) {
      basemapSource.push(Basemap.fromId(bId));
    }

    // Add ESRI basemap gallery widget to map, inside an Expand widget
    let basemapGallery = new BasemapGallery({
      view: view,
      source: basemapSource,
      container: makeWidgetDiv("basemapDiv", "bottom")    // document.createElement("div")
    });
    /*
        basemapGallery.on("selection-change", function(event){
          // event is the event handle returned after the event fires.
          console.log(event.mapPoint);
        });
    */
    let bgExpand = new Expand({
      view: view,
      content: wrapperWithOpacitySlider(basemapGallery.domNode, "Basemaps"),
      expandIconClass: "esri-icon-basemap",
      expandTooltip: "Click here to use a different base map!",
      collapseTooltip: "Hide base maps"
    });
    view.ui.add(bgExpand, "bottom-left");

    let showUnitsDiv = document.createElement("DIV");
    showUnitsDiv.innerHTML = showUnitsCheckbox2;
    view.ui.add(showUnitsDiv, "bottom-left");

    let showPopupsDiv = document.createElement("DIV");
    showPopupsDiv.innerHTML = showPopupsCheckbox;
    view.ui.add(showPopupsDiv, "bottom-left");

    let scaleBar = new ScaleBar({
      view: view,
      style: "ruler",
      unit: "metric"
    });
    view.ui.add(scaleBar, {
      position: "bottom-left"
    });

    // Add ESRI search widget to map
    searchWidget = new Search({ view: view, maxSuggestions: 4 });
    view.ui.add(searchWidget, "bottom-right");

    let cbCode = '<input type="checkbox" id="cbLimitSearchToExtent" onclick="cbSearchExtentHandler()">  Limit suggestions to current extent';
    searchWidget.container.appendChild(makeHtmlElement("DIV", "cbLimitToExtentDiv", null, null, cbCode));

    // Default source:  https://developers.arcgis.com/rest/geocode/api-reference/overview-world-geocoding-service.htm
    searchWidget.on("suggest-start", function(event){
      if (searchLocal)
        this.activeSource.filter = {
          geometry: view.extent     // limit suggestiong to current extent
        };
      else
        this.activeSource.filter = {
          geometry: szMapServiceLayer.fullExtent      // limit suggestiong to ShoreZone map service extent
        };
      this.activeSource.countryCode = "US";
      this.activeSource.categories = ["City", "Water Features", "Land Features"];
    });

/*
    searchWidget.on("suggest-complete", function(event){
      console.log(event);
    });
*/


      /*    // This filters search suggestions to initial extent
          searchWidget.watch("activeSource", function() {
            this.activeSource.filter = {
              geometry: view.extent
              //where: "name like '*Alaska*'"
            };
          });

          // Code to handle search results with improper extents
          searchWidget.goToOverride = function(view, goToParams) {
            let type =  this.results[0].results[0].feature.geometry.type;
            let tgt = goToParams.target.target;
            let goToTarget = tgt;
            return view.goTo({
              center: tgt.center,
              zoom: 8
            }, goToParams.options);
          };
      */

    /*  Bottom widgets  */


/*  Disabled widgets  *

        let locateWidget = new Locate({
          view: view,   // Attaches the Locate button to the view
          graphicsLayer: locateIconLayer  // The layer the locate graphic is assigned to
        });
        view.ui.add({ component: locateWidget, position: "top-left", index: 2});

        // ESRI Legend widget.  This goes in the "legendDom" DIV, rather than the map
        //let legendDom = document.createElement("div");
        //legendDom.style.backgroundColor = "blueviolet";     //.className = "noaaWidget";
        legend = new Legend({
          container: makeWidgetDiv("legendDiv", "right"),     // "legendDom",
          draggable: true,
          view: view,
          //declaredClass: "noaaWidget",
          layerInfos: [
            //{layer: szMapServiceLayer.sublayers.items[6], title: "stuff" }
            { layer: szMapServiceLayer, title: "ShoreZone layers" },
            { layer: faMapServiceLayer, title: "Fish Atlas layers" },
            { layer: ssMapServiceLayer, title: "Shore Station layers" },
            { layer: sslMapServiceLayer, title: "SSL layers" }
          ]
        });

        // place the Legend in an Expand widget
        let legendExpand = new Expand({
          view: view,
          content: wrapperWithOpacitySlider(legend.domNode, "Legend"),
          expandIconClass: "esri-icon-layers",
          expandTooltip: "Click here to see the legend",
          collapseTooltip: "Hide legend",
          expanded: false      // PUB: set to true
        });
        view.ui.add(legendExpand, "top-right");

/*  Disabled widgets  */

  };

  function initMap() {
//    getLegendHtml(0);     // Trying this here...  Move back to original spot if it goes wrong...
    gp = new Geoprocessor(gpUrl);
    addServiceLayers();
    map = new Map({
      basemap: "hybrid",
      //ground: "world-elevation",      // Used only with SceneView
      layers: serviceLayers     //  [sslMapServiceLayer, ssMapServiceLayer, faMapServiceLayer, szMapServiceLayer]
    });
    view = new View({
      container: "mapDiv",
      map: map,
      center: [-152, 62.5], // longitude, latitude
      constraints: {maxScale: 4000},
      zoom: 4               // MapView
      //scale: 50000000,     // SceneView:  Sets the initial scale
      //sliderOrientation : "horizontal",
      //sliderStyle: "large"
    });

    addMapWatchers();
    addMapWidgets();

    getLegendHtml(0);

    // This graphics layer will store the graphic used to display the user's location
    locateIconLayer = new GraphicsLayer();
    locateIconLayer.listMode = "hide";
    map.add(locateIconLayer);
  };


  return declare(null, {

    gotoExtent: function(extText) {
      let a = extText.split(",");
      let newExtent = null;
      if (a.length > 3)
        newExtent = new Extent({
          xmin: a[0],
          xmax: a[2],
          ymin: a[1],
          ymax: a[3],
          spatialReference: { wkid: 102100 }
        });
      else {
        let x = parseInt(a[0]);
        let y = parseInt(a[1]);
        let radius = parseInt(a[2]);
        newExtent = new Extent({
          xmin: (x - radius),
          xmax: (x + radius),
          ymin: (y - radius),
          ymax: (y + radius),
          spatialReference: { wkid: 102100 }
        });
      }
      //view.constraints.snapToZoom = false;    // Makes no difference?
      view.goTo(newExtent, {animate: false});
    },

    selectAndZoom: function(w, id, extText) {
      if (w.grid)
        w.grid = null;
      let newTab = parseInt(w.currTab) + 1;
      let currTabInfo = w.tabInfo[w.currTab];
      let ddName = currTabInfo.subTableDD;
      let ddInfo = w.getddItem(ddName);
      let ddDom = getEl(ddInfo.ddId);
      ddDom.value = id;
      ddInfo.SelectedOption = ddDom.value;
      w.setActiveTab(newTab);
      // TODO: Write function to get the ddItem for w.subTableDD, etc.
      this.gotoExtent(extText);
    },

    openSpeciesTable: function(w, tableName, totalsTableName, theWhere, headerText, extraFieldInfo, currTab) {
      w.setActiveTab(currTab);
      //if (currTab)
      //  w.currTab = currTab;
      w.totalsLayerName = totalsTableName;
      console.log("openSpeciesTable");
      let extraFields = null;
      let headerElName = null;
      if (extraFieldInfo) {
        let i = 0;
        extraFields = extraFieldInfo.fields[w.currTab][i];
        headerElName = extraFieldInfo.headerElName;
      }
      if (headerText)
        w.headerText = w.title + " for " + headerText;     //"Fish Catch for " + headerText;
      w.setHeaderItemVisibility(headerElName);
      setDisplay(w.draggablePanelId, true);
      w.runQuery(null);
//      w.runQuery(null, {tableName: tableName, totalsTableName: totalsTableName, theWhere: theWhere, header: headerText, extraFields: extraFields} );
    },

    constructor: function (kwArgs) {
      //lang.mixin(this, kwArgs);
      initMap();
      //console.log("MapStuff object created.");
    },     // end of constructor

  });

});


