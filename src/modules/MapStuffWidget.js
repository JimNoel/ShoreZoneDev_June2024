/**
 * Widget version of MapStuff code
 * Modified from JS/MapStuff.js
 * Currently, this is only minimally "widgetized", to ensure that the MapStuff code runs only after the Dojo DOM has been constructed (in code)
 */



var map;
var view;

var szMapServiceLayer;
var faMapServiceLayer;
var ssMapServiceLayer;
var sslMapServiceLayer;

var siteTabs = new Object({tabs: ["sz", "fa", "ss"], currTab: "sz"});
siteTabs.sz = {};
siteTabs.fa = {};
siteTabs.ss = {};

var layerListWidget;

var mapLoading = false;

define([
  "dojo/_base/declare",
  "esri/core/watchUtils",
  "esri/Map",
  "esri/views/MapView",
  //"esri/views/SceneView",
  // SceneView produces this error:  GET http://localhost:63342/FDFA6052-1C12-4655-B658-0DBF2414422D/253/aHR0cDovL2pzLmFyY2dpcy5jb20vNC4zL2Vzcmkvd29ya2Vycy9tdXRhYmxlV29ya2VyLmpz 404 (Not Found)
  "esri/layers/MapImageLayer",
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
  "esri/tasks/Geoprocessor",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
//  "esri/widgets/Print",
  "noaa/VideoPanelWidget",
  "noaa/PhotoPlaybackWidget",
  "noaa/UnitsPanelWidget",
  "noaa/QueryBasedTablePanelWidget",
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
  "dojo/domReady!"
], function(declare, watchUtils, Map, View, MapImageLayer, Bookmark, Bookmarks, Expand, LayerList, Legend, Search, BasemapGallery, Home, Locate, Popup, Geoprocessor, Query, QueryTask,
              //Print,
            VideoPanelWidget, PhotoPlaybackWidget, UnitsPanelWidget, QueryBasedTablePanelWidget,
            Extent, Point, Polygon, webMercatorUtils, GraphicsLayer, SimpleRenderer, SimpleMarkerSymbol, Graphic, dom) {

    function addServiceLayers() {
    szMapServiceLayer =  new MapImageLayer(szMapServiceLayerURL,  {"opacity" : 0.5});
    szMapServiceLayer.when(function() {

      szPhotoWidget = new PhotoPlaybackWidget({
        panelName: "szPhotosPanel",
        panelType: "media",
        contentPaneId: "photoDiv",
        baseName: "photo",
        headerDivName:  "photoHeaderDiv",
        disabledMsgDivName: "disabledMsg_photo",
        dfltCaptionHTML: "<label style='color:red'>Zoom in further to see photos</label>",
        noFeaturesInViewHTML: "<label style='color:red'>No photo points in this view.<br><br>Zoom out or pan to see photo points.</label>",
        noQuery: true,
        trackingSymbolInfo: "assets/images/Camera24X24.png:24:24",
        clickableSymbolType: "point",
        clickableSymbolInfo: {"style":"square", "color":[0,0,255,1], "size":8},
        //  "outline": {color: [ 0, 0, 255, 1.0 ] }},
        popupTitle: "Photo Point",
        clickableMsg: "Move camera to this location",
        map: map,
        view: view
      });
      extentDependentWidgets.push(szPhotoWidget);

      szVideoWidget = new VideoPanelWidget({
        panelName: "szVideoPanel",
        sublayerIDs: szSublayerIDs,
        panelType: "media",
        contentPaneId: "videoDiv",
        baseName: "video",
        headerDivName:  "videoHeaderDiv",
        disabledMsgDivName: "disabledMsg_video",
        dfltCaptionHTML: "<label style='color:red'>Zoom in further to see video</label>",
        noFeaturesInViewHTML: "<label style='color:red'>No video points in this view.<br><br>Zoom out or pan to see video points.</label>",
        //displayDivName: "#videoImageContainer",
        mapServiceLayer: szMapServiceLayer,
        layerName: "1s",
        layerPath: "Video Flightline/1s",
        spatialRelationship: "contains",
        queryOutFields: ["*"],
        tableFields:  [],
        trackingSymbolInfo: "assets/images/video24X24.png:24:24",
        clickableSymbolType: "point",
        clickableSymbolInfo: {"style":"circle", "color":[255,255,0,0], "size":4,
          "outline": {color: [ 128, 128, 128, 0 ] }},
        popupTitle: "Video Point",
        clickableMsg: "Move camera to this location",
        map: map,
        view: view
      });
      extentDependentWidgets.push(szVideoWidget);

      szUnitsWidget = new UnitsPanelWidget({
        objName: "szUnitsWidget",
        widgetName: "szUnitsWidget",    // for reference to instance
        tabName: "Units",
        panelType: "table",
        sublayerIDs: szSublayerIDs,
        panelName: "szUnitsPanel",
        contentPaneId: "unitsDiv",
        baseName: "units",
        headerDivName:  "unitsHeaderDiv",
        displayDivName: "unitsContainer",
        disabledMsgDivName: "disabledMsg_units",
        dfltCaptionHTML: "<label style='color:red'>Zoom in further to see units</label>",
        noFeaturesInViewHTML: "<label style='color:red'>No units in this view.<br><br>Zoom out or pan to see units.</label>",
        mapServiceLayer: szMapServiceLayer,
        layerName: "Mapped Shoreline",      // "AK_Unit_lines_wAttrs",
        layerPath: "Mapped Shoreline",      // "AK_Unit_lines_wAttrs",
        spatialRelationship: "contains",
        queryOutFields:  ["PHY_IDENT","HabClass"],      //["*"],
        tableFields:  ["CMECS_1", "CMECS_2", "CMECS_3", "Length_M", "Slope_calc", "SHORE_PROB", "LOST_SHORE", "Fetch_max", "Wave_Dissipation", "Orient_dir", "Tidal_height", "CVI_Rank"],
        showFieldsInPopup: "*",
        //trackingSymbolInfo: "assets/images/video24X24.png:24:24",
        hideMarkersAtStart: true,
        clickableSymbolType: "extent",
        clickableSymbolInfo: {
          color: [ 51, 51, 204, 0.05 ],
          style: "solid"
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

      siteTabs.sz.widgets = [szPhotoWidget, szVideoWidget, szUnitsWidget];


      /*
      this.prequeryTask = new QueryTask(szMapServiceLayerURL + "/2");
      this.prequery = new Query();
      with (this.prequery) {
        returnGeometry = false;
        where = "1=1";
        returnCountOnly = true;
        num = 1000;
        start = 0;
      }
      */

      /*  TRY:  attempt to catch sublayer visibility change event
      var subLayers = szMapServiceLayer.allSublayers;
      alert(subLayers.length);
      for (var L=0; L<subLayers.length; L++) {
        subLayers.items[L].watch("visible", function(newValue, oldValue, property, subLayer) {
          alert(subLayer.title + " visibility changed");
        });
      };
      /**/

    }, function(error){
      debug("szMapServiceLayer failed to load:  " + error);
    });

    ssMapServiceLayer = new MapImageLayer(ssMapServiceLayerURL,  {"opacity" : 0.5});
    /*
        ssMapServiceLayer.when(function(resolvedVal) {
          console.log("Shore Station MapServiceLayer loaded.");
          ssMapServiceLayer.visible = false;
          ssWidget = new QueryBasedTablePanelWidget({
            panelName: "ssPanel",
            contentPaneId: "ssDiv",
            baseName: "ss",
            headerDivName:  "ssHeaderDiv",
            displayDivName: "ssContainer",
            disabledMsgDivName: "disabledMsg_ss",
            dfltCaptionHTML: "<label style='color:red'>Zoom in further to see Shore Station features</label>",
            noFeaturesInViewHTML: "<label style='color:red'>No features in this view.<br><br>Zoom out or pan to see features.</label>",
            mapServiceLayer: ssMapServiceLayer,
            layerName: "Regions",
            layerPath: "Regions",
            queryOutFields:  ["RegionNumID","RegionalID", "Region"],      //["*"],
            tableFields:  [],
            showFieldsInPopup: "*",
            //trackingSymbolInfo: "assets/images/video24X24.png:24:24",
            clickableSymbolType: "extent",
            clickableSymbolInfo: {
              color: [ 51,51, 204, 0.1 ],
              style: "solid",
              width: "2px"
            },
            popupTitle: "Shore Station Region",
            clickableMsg: null,
            map: map,
            view: view
          });

        }, function(error){
          debug("Shore Station MapServiceLayer failed to load:  " + error);
        });
    */

    faMapServiceLayer = new MapImageLayer(faMapServiceLayerURL,  {"opacity" : 0.5});
    faMapServiceLayer.when(function() {
      console.log("Fish Atlas MapServiceLayer loaded.");
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
        totalFields: ["Hauls", "Species", "Catch"],
        tableHeaderTitle: "All Regions",
        displayDivName: "faContainer",
        disabledMsgDivName: "disabledMsg_fa",
        dfltCaptionHTML: "<label style='color:red'>Zoom in further to see Fish Atlas features</label>",
        noFeaturesInViewHTML: "<label style='color:red'>No features in this view.<br><br>Zoom out or pan to see features.</label>",
        mapServiceLayer: faMapServiceLayer,
        dropDownInfo: [
          { ddName: "Region",
            LayerNameAddOn: "",
            totalsLayerNameAddOn: "Regions",
            subLayerName: "Regions",
            outFields: ["RegionName", "RegionID"],
            orderByFields: ["RegionName"],
            options: [ { label: "[All Alaska regions]", value: "All" } ],
            SelectedOption: "All",
            whereField: "RegionID"
          },
          { ddName: "Locale",
            LayerNameAddOn: "",
            totalsLayerNameAddOn: "Locales",
            subLayerName: "Locales (area)",
            outFields: ["Locale", "LocaleID"],
            orderByFields: ["Locale"],
            options: [ { label: "[All]", value: "All" } ],
            SelectedOption: "All",
            whereField: "LocaleID"
          },
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
          { ddName: "Species",
            LayerNameAddOn: "Species",
            totalsLayerNameAddOn: "Species",
            subLayerName: "vw_SpCatch_allAK",
            outFields: ["Sp_CommonName", "SpCode"],
            orderByFields: ["Sp_CommonName"],
            options: [ { label: "[All]", value: "All" } ],
            SelectedOption: "All",
            whereField: "SpCode",
            isAlpha: true
          }
        ],
        currTab: 0,
        tabInfo: [
          {
            tabName: 'Regions',
            tabTitle: 'Fish Atlas Regions',
            popupTitle: "Fish Atlas Region",
            LayerNameAddOn: 'Regions',
            parentAreaType: '',
            visibleHeaderElements: ['faTableHeaderTitle', 'faDropdownSpan_Habitat', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures'],
            queryOutFields: ["Region", "Hauls", "Species", "Catch", "Envelope"],
            //idField: 'Region',
            clickableSymbolType: "extent",
            clickableSymbolInfo: {
              color: [ 51,51, 204, 0.1 ],
              style: "solid",
              width: "2px"
            },
            //textOverlayPars: null     // IMPORTANT:  Otherwise, will retain previous text overlay settings on tab switch
          },
          {
            tabName: 'Locales',
            tabTitle: 'Fish Atlas Locales',
            popupTitle: "Fish Atlas Locale",
            LayerNameAddOn: 'Locales',
            parentAreaType: 'Regions',
            visibleHeaderElements: ['faDropdownSpan_Region', 'faDropdownSpan_Habitat', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures'],
            queryOutFields: ["Region", "MapID", "Locale", "Hauls", "Species", "Catch"],
            clickableSymbolType: "point",
            clickableSymbolInfo: {
              "style":"square",
              "color":[255,255,255,1.0],
              outline: {  // autocasts as new SimpleLineSymbol()
                color: [ 128, 128, 128, 1.0 ],
                width: "0.5px"
              },
              "size":12
            },
            textOverlayPars: {
              type: "text",  // autocasts as new TextSymbol()
              color: "black",
              verticalAlignment: "middle",
              font: {  // autocast as new Font()
                size: 8,
                family: "arial",
                //weight: "bolder"
              }
            },
            textOverlayField: "MapID",
          },
          {
            tabName: 'Sites',
            tabTitle: 'Fish Atlas Sites',
            popupTitle: "Fish Atlas Site",
            LayerNameAddOn: 'Sites',
            parentAreaType: 'Locales',
            visibleHeaderElements: ['faDropdownSpan_Region', 'faDropdownSpan_Locale', 'faDropdownSpan_Habitat', 'faDropdownSpan_Species', 'faLabelSpan_featureCount', 'faCheckboxSpan_showFeatures'],
            queryOutFields: ["Region", "Locale", "Site", "Latitude", "Longitude", "Habitat", "Hauls", "Species", "Catch"],
            clickableSymbolType: "point",
            clickableSymbolInfo: {
              "style":"circle",
              "color":[255,255,255,1.0],
              outline: {  // autocasts as new SimpleLineSymbol()
                color: [ 0, 0, 0, 1.0 ],
                width: "0.5px"
              },
              "size":4
            },
            renderingInfo: {
              field: "Habitat",
              uniqueColors: {
                "Bedrock": "blue",
                "Eelgrass": "green",
                "Kelp": "red",
                "Sand-Gravel": "yellow"
              },
            }

          },
          {
            tabName: 'Temperature',
            tabTitle: 'Temperature Data',
            popupTitle: "Thermograph",
            LayerNameAddOn: 'Temperature',
            queryOutFields: ["Region", "Hauls", "Species", "Catch"]
          },
          {
            tabName: 'Eelgrass',
            tabTitle: 'Eelgrass Data',
            popupTitle: "Eelgrass Bed",
            LayerNameAddOn: 'Eelgrass',
            queryOutFields: ["Region", "Hauls", "Species", "Catch"]
          }
        ],
        layerName: "vw_CatchStats_Regions",
        layerBaseName: "vw_CatchStats_",
        spatialRelationship: null,      // Using null as a flag to not filter spatially
        //queryOutFields:  ["Region", "Hauls", "Species", "Catch"],     // ["*"],
        tableFields:  [],
        showFieldsInPopup: "*",
        clickableSymbolType: "extent",
        clickableSymbolInfo: {
          color: [ 51,51, 204, 0.1 ],
          style: "solid",
          width: "2px"
        },
        //popupTitle: "Fish Atlas Region",
        clickableMsg: null,
        map: map,
        view: view
      });
      siteTabs.fa.widgets = [faWidget];
    }, function(error){
      debug("Fish Atlas MapServiceLayer failed to load:  " + error);
    });

    sslMapServiceLayer = new MapImageLayer(sslMapServiceLayerURL, {"opacity" : 0.5});
    // *** end Map layer definitions ***
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
    var maxX = view.container.offsetWidth;
    var maxY = view.container.offsetHeight;
    var screenPoints = [[m,m], [maxX-m,m], [maxX-m,maxY-m], [m,maxY-m]];
    var mapPoints = [];
    for (var p=0; p<screenPoints.length; p++) {
      var screenPoint = new Point({x: screenPoints[p][0], y: screenPoints[p][1]});
      var mapPoint = view.toMap(screenPoint);     // These are the points I want to use to get true extent
      if (!mapPoint)
        return null;
      var geogPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
      mapPoints.push([mapPoint.x, mapPoint.y, mapPoint.z]);
    }
    mapPoints.push(mapPoints[0]);
    var newPolygon = new Polygon(mapPoints);
    return newPolygon;
  }
*/

  function handleExtentChange(newExtent) {
    //layerList_ExpandAll(true);

    // For 3D, change newExtent to Polygon of tilted view extent
    // If using MapView (2D), comment out these lines
    //var extent3d = sceneViewExtent(view, 200);
    //var extent3d_geog = webMercatorUtils.webMercatorToGeographic(extent3d);


    /*JN  This doesn't work.  Make custom prequery function using XMLHttpRequest, with setting for resultRecordCount?
    // or: Dissolve 10s on VideoTapeID, assume each 10s feature represents up to 4000 points (a little more than an hour of video), run executeForCount on 10s and use 4000*Count as estimated # of point in view
    if (!this.prequeryTask)
      return;
    this.prequeryTask.executeForCount({ where: "1=1"}).when(function(results){
      if (results.features.length==maxSZFeatures) {
        console.log(this.baseName + ":  maxSZFeatures (" + maxSZFeatures + ") returned.");
      } else {
        console.log("< maxSZFeatures returned");
      }
    }.bind(this), function(error) {
      console.log(this.baseName + ":  QueryTask failed.");
    }.bind(this));
    */


    //OBS?  lastExtent = newExtent;
    featureRefreshDue = (newExtent.width/1000 < maxExtentWidth);
    if (lock_points)      // If point set is locked,
      return;             //    then don't reset or query new points
    if (settings.autoRefresh) {
      resetCurrentFeatures();
      mapLoading = true;
      if (featureRefreshDue) {    // newExtent.width/1000 < maxExtentWidth
        if (szVideoWidget)
          szVideoWidget.runQuery(newExtent);         // 3D: use extent3d?
        if (szUnitsWidget)
          szUnitsWidget.runQuery(newExtent);         // 3D: use extent3d?
      }
    } else {

    }

    if (bookmarkSelected) {
      bookmarkSelected = false;
      return;
    }
    var km = Math.round(newExtent.width/1000) + " km";
    var bookmark = new Bookmark({name: savedExtentsWidget.bookmarks.items.length + ":" + km, extent: newExtent});
    //bookmark.thumbnail = "assets/images/noaa_wb.png";
    savedExtentsWidget.bookmarks.add(bookmark);       // TODO: Successfully initializes with initial extent, but this is lost because bookmarks array is subsequently reset
    currentBookmarkNumber = savedExtentsWidget.bookmarks.length -1;
  }

  function addMapWatchers() {
    view.when(function() {
      var moveButtonAction = {title: "Move the camera", id: "move-camera"};
      var p = view.popup;     // new Popup();
      if (popupsDocked) {
        p.dockEnabled = true;
        p.dockOptions = {position: "bottom-right" };
      }
      p.actions.removeAll();      // not working
      p.actions.push(moveButtonAction);
      p.on("trigger-action", function(event){
        if (event.action.id === "move-camera") {
          if (currentWidgetController)
            currentWidgetController.moveButtonPressHandler(currentHoveredGraphic.attributes);
        }
      });
      //view.popup = p;     // if using new popup
    });

    // When layer view is available, expand the LayerList
    view.whenLayerView(szMapServiceLayer).then(function(lyrView){
      //view.extent = szMapServiceLayer.fullExtent;
      watchUtils.whenFalseOnce(lyrView, "updating").when(function(){
      });
    });

    view.watch("extent", function(newExtent, oldExtent, property, theView) {
      if (theView.interacting)    // Bypass if panning or using mouse wheel.  In this case, the watch on "interacting" (below) will kick in when the interaction is complete
        return;
      if (theView.animation && theView.animation.state=="running")      // Wait until extent change is complete
        return;
      handleExtentChange(newExtent);
    });

    view.watch("interacting", function(isInteracting, oldValue, property, object) {
      if (isInteracting)
        return;
      handleExtentChange(view.extent);
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
    var zoomRectFillSymbol = {
      type: "simple-fill", // autocasts as new SimpleFillSymbol()
      color: [227, 0, 0, 0.2],
      outline: { // autocasts as new SimpleLineSymbol()
        color: [255, 0, 0],
        width: 1
      }
    };

    var extentGraphic = null;
    var origin = null;
    view.on('drag', [], function(e){
      if (panning)
        return;
      e.stopPropagation();
      if (e.action === 'start'){
        if (extentGraphic) view.graphics.remove(extentGraphic)
        origin = view.toMap(e);
      } else if (e.action === 'update'){
        if (extentGraphic) view.graphics.remove(extentGraphic)
        var p = view.toMap(e);
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
        view.goTo(extentGraphic);
        view.graphics.remove(extentGraphic);
      }
    });

      // Handle click events:  Check for mouse over graphic features
    view.on('click', [], function(e){
      var screenPoint = {x: e.x, y: e.y};
      noaaHitTest(screenPoint);
      //view.hitTest(screenPoint).when(handleGraphicHits);      // Use noaaHitTest until ESRI fixes inaccuracy
    });


    // Handle mouse-move events:  Update map coordinate display, and check for mouse over graphic features
    view.on('pointer-move', [], function(e){
      var screenPoint = {x: e.x, y: e.y};
      var mapPoint = view.toMap(screenPoint);

      if (!mapPoint) {
        debug("3D point is outside globe");
        return;
      }
      var geogPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);    //szVideoWidget._webMercatorToGeographic(mapPoint);
      dom.byId("coordinates").innerHTML = decDegCoords_to_DegMinSec(geogPoint.x, geogPoint.y);

      noaaHitTest(screenPoint);
      //view.hitTest(screenPoint).when(handleGraphicHits);      // Use noaaHitTest until ESRI fixes inaccuracy

      /* DEBUG:  Show position of returned ESRI toMap method
      mapCursorLayer.removeAll();
      var newFeature = new Graphic(geogPoint, mapCursorSymbol);
      mapCursorLayer.add(newFeature);
      */
    });
  }

  // HACK to handle inaccurate ESRI hitTest method
  function noaaHitTest(screenPoint) {
    screenPoint.x += 8;
    screenPoint.y += 8;
    view.hitTest(screenPoint).then(function(response) {
      handleGraphicHits(response);
    });
//    view.hitTest(screenPoint).when(handleGraphicHits);
  }

  // If mouse if over a video/photo graphic, open popup allowing moving the "camera" to this point
  function handleGraphicHits(response) {
    if (response.results.length == 0) {
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
      return;
    }
    // // Check for point that is both video and photo
    // if (response.results.length > 1) {
    //   alert("More than 1 hit!")
    // };

    var i=0;      // Respond only to hits on "_Clickable" layers
    while (i<response.results.length && response.results[i].graphic.layer.id.slice(-10)!="_Clickable")
      i++;
    if (i == response.results.length) {
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
      return;
    }

    if (response.results[i].graphic != currentHoveredGraphic) {
      currentHoveredGraphic = response.results[i].graphic;
      currentWidgetController = currentHoveredGraphic.layer.widgetController;
      if (hoverTimeout)
        clearTimeout(hoverTimeout);
      hoverTimeout = setTimeout(currentWidgetController.displayPlayButton(currentHoveredGraphic), minHoverTime);       // delay popup

    }
  };

  function clearAllHoverGraphics() {
  }

  function addMapWidgets() {

    function makeWidgetDiv(divID, placement) {
      if (placement === undefined)
        placement = "";
      var newDiv = document.createElement("div");
      newDiv.id = divID;
      newDiv.style.position = "absolute";
      if (placement==="bottom")
        newDiv.style.bottom = "5px";
      if (placement==="right")
        newDiv.style.right = "5px";
      newDiv.draggable = true;
      newDiv.ondragstart = drag_start;
      return newDiv;
    }

    function wrapperWithOpacitySlider(divNode, title) {
      // Inserts a penal (divNode) into a wrapper DIV with a slider controlling the panel's opacity
      // Returns a handle to the new wrapper DIV
      var divID = divNode.id;
      var newDiv = document.createElement("div");
      newDiv.id = divID + "_wrapper";
      var sliderDiv = document.createElement("div")
      sliderDiv.innerHTML = '<input type="range" value="90" oninput="sliderHandler(\'' + divID + '\')" id="' + divID + '_slider" >';
      sliderDiv.innerHTML += '<label style="position: absolute; top: 5px; left:20px; color: #76766e">' + title + '</label>';
      var contentDiv = document.createElement("div")
      contentDiv.id = divID + "_content";
      contentDiv.appendChild(divNode);
      newDiv.appendChild(sliderDiv);
      newDiv.appendChild(contentDiv);
      return newDiv;
    }

//*  Remove one of the slashes to the left to temporarily disable LAYERLIST

    // Add ESRI LayerList widget.  This goes in the "layerListDom" DIV, rather than the map
    // NOTE:  To prevent a layer from appearing in the LayerList, set the layer's "listMode" property to "hide"
    layerListWidget = new LayerList({
      //    container: "layerListDom",
      container: makeWidgetDiv("layerListDiv"),     // document.createElement("div"),
      view: view
    });

    // layerListWidget.watch("operationalItems", function() {
    //   alert("operationalItems changed");
    // });

    layerListWidget.listItemCreatedFunction = function(event) {
      var item = event.item;
/*
      if (item.layer.title === "Video Flightline") {
        item.layer.listMode = "hide-children";
      }
*/
/*
      if (item.layer.parent.title === undefined) {
      //if (!item.layer.allSublayers) {
        var leafLegend = new Legend({
          view: view,
          layerInfos: [{ layer: item.layer, title: "" }]
        })
        item.panel = {
          content: /!*leafLegend,*!/         "legend",
          open: true
        };
      }
*/
      //event.item.open = true;
      /*  NOT SURE WHAT THIS WAS FOR?
      if (event.item.layer.title == "Derived ShoreZone Attributes")
        event.item.layer.visible = false;     // turn off layer display
      if (event.item.layer.title == "Video Flightline")
        event.item.visible = false;
      */
    };


//  Function to expand/collapse all nodes of the LayerList
//   expands if expand=true, otherwise collapses
    function layerList_ExpandAll(expand) {
      //alert(layerListWidget.operationalItems.items[0].children.items[10].visible);
      var ctSpans = document.getElementsByClassName("esri-layer-list__child-toggle");
      if (ctSpans.length > 0) {
        for (var i = 0; i < ctSpans.length; i++)
          if (ctSpans[i].hasOwnProperty("data-item")) {
            if (ctSpans[i]["data-item"].open)     // If root node already expanded, assume the rest is also expanded, and exit function
              return;
            ctSpans[i]["data-item"].open = expand;
          }
      }
    }


    // place the LayerList in an Expand widget
    var llExpand = new Expand({
      view: view,
      content: wrapperWithOpacitySlider(layerListWidget.domNode, "Layers"),
      expandIconClass: "esri-icon-layer-list",
      expandTooltip: "Click here to view and select layers",
      collapseTooltip: "Hide layer list",
      expanded: false
    });
    view.ui.add({ component: llExpand, position: "top-left", index: 0});
    /**/

    function drag_start(event) {
      var style = window.getComputedStyle(event.target, null);
      var str = (parseInt(style.getPropertyValue("left")) - event.clientX) + ',' + (parseInt(style.getPropertyValue("top")) - event.clientY)+ ',' + event.target.id;
      event.dataTransfer.setData("Text",str);
    }

    function drop(event) {
      var offset = event.dataTransfer.getData("Text").split(',');
      var dm = getEl(offset[2]);
      dm.style.left = (event.clientX + parseInt(offset[0],10)) + 'px';
      dm.style.top = (event.clientY + parseInt(offset[1],10)) + 'px';
      event.preventDefault();
      return false;
    }

    function drag_over(event) {
      event.preventDefault();
      return false;
    }

    view.container.ondragover = drag_over;
    view.container.ondrop = drop;
    //view.popup.container.ondragover = drag_over;
    //view.popup.container.ondrop = drop;


    // ESRI Legend widget.  This goes in the "legendDom" DIV, rather than the map
    //var legendDom = document.createElement("div");
    //legendDom.style.backgroundColor = "blueviolet";     //.className = "noaaWidget";
    var legend = new Legend({
      container: makeWidgetDiv("legendDiv", "right"),     // "legendDom",
      draggable: true,
      view: view,
      //declaredClass: "noaaWidget",
      layerInfos: [
        { layer: szMapServiceLayer, title: "ShoreZone layers" },
        { layer: faMapServiceLayer, title: "Fish Atlas layers" },
        { layer: ssMapServiceLayer, title: "Shore Station layers" },
        { layer: sslMapServiceLayer, title: "SSL layers" }
      ]
    });

        // place the Legend in an Expand widget
        var legendExpand = new Expand({
          view: view,
          content: wrapperWithOpacitySlider(legend.domNode, "Legend"),
          expandIconClass: "esri-icon-layers",
          expandTooltip: "Click here to see the legend",
          collapseTooltip: "Hide legend",
          expanded: false
        });
        view.ui.add(legendExpand, "top-right");



    var locateWidget = new Locate({
      view: view,   // Attaches the Locate button to the view
      graphicsLayer: locateIconLayer  // The layer the locate graphic is assigned to
    });
    view.ui.add(locateWidget, "top-right");

    // Add ESRI basemap gallery widget to map, inside an Expand widget
    var basemapGallery = new BasemapGallery({
      view: view,
      container: makeWidgetDiv("basemapDiv", "bottom")    // document.createElement("div")
    });
/*
    basemapGallery.on("selection-change", function(event){
      // event is the event handle returned after the event fires.
      console.log(event.mapPoint);
    });
*/
    var bgExpand = new Expand({
      view: view,
      content: wrapperWithOpacitySlider(basemapGallery.domNode, "Basemaps"),
      expandIconClass: "esri-icon-basemap",
      expandTooltip: "Click here to use a different base map!",
      collapseTooltip: "Hide base maps"
    });
    view.ui.add(bgExpand, "bottom-left");


    // NOAA offline app link
    var olExpand = new Expand({
      view: view,
      content: makeWidgetDiv("offlineAppPanel", "right")   ,
      expandIconClass: "esri-icon-download",
      expandTooltip: "Click here to download data in the current extent and use with the offline app",
      collapseTooltip: "Hide the offline app widget"
    });
    olExpand.content.innerHTML = download_notZoomedInEnoughContent;
    view.ui.add(olExpand, "top-right");


    // Settings widget
    var settingsExpand = new Expand({
      view: view,
      content: makeWidgetDiv("settingsPanel", "right")   ,
      expandIconClass: "esri-icon-settings",
      expandTooltip: "Click here to go to website settings.",
      collapseTooltip: "Hide settings widget"
    });
    settingsExpand.content.innerHTML = settingsHtml;
    view.ui.add(settingsExpand, "top-right");


    var homeWidget = new Home({
      view: view
    });
    view.ui.add(homeWidget, "top-left");

    // Add ESRI search widget to map
    var searchWidget = new Search({ view: view });
    view.ui.add(searchWidget, "bottom-right");

    var prevNextBtnsDiv = document.createElement("DIV");
    prevNextBtnsDiv.innerHTML = prevNextBtnsHtml;
    view.ui.add(prevNextBtnsDiv, "top-left");

    savedExtentsWidget = new Bookmarks({
      view: view
    });
    var savedExtentsExpand = new Expand({
      expandIconClass: "esri-icon-collection",  // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
      expandTooltip: "Show extents history", // optional, defaults to "Expand" for English locale
      view: view,
      content: savedExtentsWidget
    });
    view.ui.add(savedExtentsExpand, {
      position: "top-left"
    });

    savedExtentsWidget.on("select-bookmark", function(event){
      currentBookmarkNumber = parseInt(event.target.activeBookmark.name.split(":")[0]);
      bookmarkSelected = true;
    });

    var panZoomDiv = document.createElement("DIV");
    panZoomDiv.innerHTML = panZoomHtml;
    view.ui.add(panZoomDiv, "top-left");

    var refreshFeaturesDiv = document.createElement("DIV");
    refreshFeaturesDiv.innerHTML = refreshFeaturesHtml;
    view.ui.add(refreshFeaturesDiv, "top-right");


  };

  function initMap() {
    gp = new Geoprocessor(gpUrl);

    addServiceLayers();

    map = new Map({
      basemap: "hybrid",
      //ground: "world-elevation",      // Used only with SceneView
      layers:  [sslMapServiceLayer, /*ssMapServiceLayer,*/ faMapServiceLayer, szMapServiceLayer]
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

    // This graphics layer will store the graphic used to display the user's location
    locateIconLayer = new GraphicsLayer();
    locateIconLayer.listMode = "hide";
    map.add(locateIconLayer);
  };


  return declare(null, {

    constructor: function (kwArgs) {
      //lang.mixin(this, kwArgs);
      initMap();
      console.log("MapStuff object created.");
    },     // end of constructor

  });

});


