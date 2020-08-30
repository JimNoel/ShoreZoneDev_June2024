/**
 * Class QueryBasedPanelWidget
 *
 * generic widget for spatial queries on map service layers, with associated panel for results
 *   Subclasses of this must set the processFeatures_Widget function in the constructor  (see example in VideoPanelWidget.js)
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
  "dojo/on",
  "dojo/dom",
  "dijit/registry",
/*
  "dijit/layout/BorderContainer",
  "dijit/layout/ContentPane",
  "dijit/layout/TabContainer",
*/
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
  "esri/layers/GraphicsLayer",
  "esri/renderers/SimpleRenderer",
  "esri/renderers/UniqueValueRenderer",
  "esri/symbols/PictureMarkerSymbol",
  "esri/symbols/SimpleMarkerSymbol",
  "esri/symbols/SimpleLineSymbol",
  "esri/symbols/SimpleFillSymbol",
  "esri/symbols/TextSymbol",
  "esri/geometry/Extent",
  "esri/geometry/Point",
  "esri/geometry/support/webMercatorUtils",
  "esri/Graphic"
], function(declare, lang, on, dom, registry, /*BorderContainer, ContentPane, TabContainer, */Query, QueryTask, GraphicsLayer, SimpleRenderer, UniqueValueRenderer,
              PictureMarkerSymbol, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Extent, Point, webMercatorUtils, Graphic){

  let queryComplete = true;

  return declare(null, {

    constructor: function(/*Object*/ kwArgs){
      lang.mixin(this, kwArgs);

      this.initFeatureHandling();
      this.addPanelHtml();

      if (this.defaultDisabledMsg)
        setMessage(this.disabledMsgDivName, this.defaultDisabledMsg);

      this.setPanelVisibility = function(f) {
        if (f.length===0) {
          if (this.disabledMsgInfix) {
            updateNoFeaturesMsg(this.noFeaturesPanels , "zoomout");
            showPanelContents(this.baseName, false);
          }
          return true;
        }
        showPanelContents(this.baseName, true);
        return false;
      };


      this.processResults = function(results) {
        let features = results.features;
        this.features = features;
        this.fields = results.fields;
        this.setDisplayLayers();
        this.setPanelVisibility(features);
        this.processFeatures(features);
      };

      this.setDisplayLayers = function() {
        if (!this.backgroundLayers)
          return;
        let displayLayers = this.backgroundLayers.slice();
        displayLayers.push(this.layerName);
        if (this.filterBgLayer  && (this.query.where !== ""))
          displayLayers.push(this.filterBgLayer);
        let layers = this.mapServiceLayer.sublayers.items;
        for (let i=0; i<layers.length; i++) {
          layers[i].visible = displayLayers.includes(layers[i].title);
          if (layers[i].title === this.layerName)
            layers[i].definitionExpression = this.query.where;
        }
      };

      // placeholder -- function will be overridden by subclasses of QueryBasedPanelWidget
      this.processFeatures_Widget = function(features) {
      };

      // Initial processing of features, common to all inherited widgets
      this.processFeatures = function(features) {
        if (!this.noGeometry)
          this.makeClickableGraphics(this.features);
        if (this.featureCountTemplate)
          getEl(this.featureCountElId).innerHTML = this.featureCountTemplate.replace("{0}",features.length).replace("{1}", this.tabName);
        this.processFeatures_Widget(features);
      };

      // placeholder -- function will be overridden by subclasses of QueryBasedPanelWidget
      this.updateMedia = function(attrs) {
      };

      this.moveButtonPressHandler = function(attrs) {
        this.changeCurrentFeature(attrs.item);
        this.moveToFeature(attrs);
        this.infoWin.close();
      };

      // default method, returns attrValue
      // override this method in subwidget
      this.attrValDescription = function(attrName, attrValue) {
        //if (!attrs)
        //  return a;
        return attrValue;
      };

      // default method, returns argument
      // override this method in subwidget
      this.attrName = function(a) {
        return a;
      };

      this.displayPlayButton = function(e, row) {
        // TODO:  Make the popup moveable?  (Example for 3.x using Dojo is at http://jsfiddle.net/goldenlimit/gaz8ao8n)
        if (!showPopups)
          return;
        let infoWin = view.popup;
        if (popupsDocked) {
          infoWin.dockEnabled = true;
          infoWin.dockOptions = {position: "bottom-right" };
        }

        //infoWin.container.style.maxHeight = "300px";
        //infoWin.container.setAttribute("style", "max-height: 300px;");

        if (row)
          infoWin.content = this.rowHtmlToLines(row);
        else {
          attrs = e.attributes;
          infoWin.title = this.popupTitle;    // this.baseName + " point";
          infoWin.content = '<div class="nowrap_ScrollX"><b>' + attrs.Caption.replace(':',':</b>') + '</div><br>';
        }

        infoWin.actions.removeAll();
        if (this.clickableMsg) {
          infoWin.actions.push({id: "move-camera", title: this.clickableMsg, image: this.trackingImageURL});
        }

        //    Positions the popup.  Disabled for now, as it can cause panning of display.
        if (e.geometry.type === "point")
          infoWin.location = e.geometry;
        else
          infoWin.location = e.geometry.center;


        //view.popup.reposition();
        //infoWin.alignment = "left";
        infoWin.open();
        this.clearAllHighlights();
        this.highlightFeature(e.highlightGeometry);
      };

    },


//    METHOD DEFINITIONS

    initFeatureHandling: function() {
      this.noFeaturesPanels = [this];     //  For messaging when query returns no features.  Normally this array just includes the current object (this).
                                          //  An exception is VideoPanelWidget, which adds an instance of PhotoPlaybackWidget, since query results for
                                          //  VideoPlaybackWidget are also used by PhotoPlaybackWidget
      this.clickableLayer = null;
      this.highlightLayer = null;
      if (this.clickableSymbolInfo) {
        // Add (transparent) Graphics Layer for selecting feature
        this.clickableLayer = new GraphicsLayer();
        this.clickableLayer.listMode = "hide";
        this.clickableLayer.id = this.panelName + "_Clickable";
        this.clickableLayer.title = this.clickableLayer.id;
        this.clickableLayer.visible = true;
        if (this.hideMarkersAtStart)
          this.clickableLayer.visible = !this.hideMarkersAtStart;

        this.setClickableRendering();

        this.clickableLayer.widgetController = this;    // Custom property added to Graphics Layer object, to reference back to this widget
        map.add(this.clickableLayer);
        if (this.hasTextOverlayLayer) {
          this.labelsLayer = new GraphicsLayer();
          this.labelsLayer.title = this.baseName + "_markerLabels";
          this.labelsLayer.listMode = "hide";
          map.add(this.labelsLayer);

        }
        this.mouseStillOver = false;
        this.infoWin = view.popup;
        this.counter = 0;

        // To indicate item currently hovered-over or touched
        if (!this.highlightSymbolType)
          this.highlightSymbolType = this.clickableSymbolType;
        this.highlightLayer = new GraphicsLayer();
        this.highlightLayer.listMode = "hide";
        this.highlightLayer.id = this.panelName + "_highlight";
//        this.highlightLayer.title = this.highlightLayer.id;
        this.highlightLayer.visible = true;

        this.setHighlightRendering();

        map.add(this.highlightLayer);
      }

      this.trackingLayer = null;
      if (this.trackingSymbolInfo) {
        // Add Graphics Layer for tracking icon
        this.trackingLayer = new GraphicsLayer();
        this.trackingLayer.listMode = "hide";
        this.trackingLayer.id = this.panelName + "_Tracking";
        this.trackingLayer.title = this.trackingLayer.id;
        this.trackingLayer.visible = true;
        let symbolArgs = this.trackingSymbolInfo.split(":");
        this.trackingImageURL = symbolArgs[0];
        this.trackingSymbol = new PictureMarkerSymbol(symbolArgs[0], symbolArgs[1], symbolArgs[2]);
        this.trackingLayer.renderer = new SimpleRenderer(this.trackingSymbol);
        map.add(this.trackingLayer);
        this.playDir = 1;     // playback direction
      }

      // Skip if the widget doesn't get its data directly from a query
      // e.g. PhotoPlaybackWidget, which uses a subset of the data from VideoPanelWidget
      if (!this.noQuery) {
        if (!this.orderByFields)
          this.orderByFields = [];      // If orderByFields hasn't been specified in MapStuffWidget, then default to empty array
        let subLayerURL = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
        this.queryTask = new QueryTask(subLayerURL);
        let q = new Query();
        q.returnGeometry = true;
        q.spatialRelationship = this.spatialRelationship;      //"contains";
        q.orderByFields = this.orderByFields;
        q.where = "";
        this.query = q;
      }
    },

    changeFeatureHandling: function() {
      this.setClickableRendering();
      this.setHighlightRendering();
    },


  setClickableRendering: function() {
      if (this.clickableSymbolType === "text")
        this.clickableSymbol = new TextSymbol(this.clickableSymbolInfo);
      if (this.clickableSymbolType === "point")
        this.clickableSymbol = new SimpleMarkerSymbol(this.clickableSymbolInfo);
      else if (this.clickableSymbolType === "polyline")
        this.clickableSymbol = new SimpleLineSymbol(this.clickableSymbolInfo);
      else if (this.clickableSymbolType === "polygon" || this.clickableSymbolType === "extent")
        this.clickableSymbol = new SimpleFillSymbol(this.clickableSymbolInfo);
      this.clickableLayer.renderer = new SimpleRenderer(this.clickableSymbol);
    },


    setHighlightRendering: function() {
      if (!this.highlightSymbolInfo) {
        this.highlightSymbol = this.clickableSymbol.clone();
        // So far, the only ones that don't have separate highlightSymbolInfo are Points
        this.highlightSymbol.color.a = 0;
        this.highlightSymbol.outline.color = "red";     // For points, border of point symbol.  For polygons, border of polygon.
        this.highlightSymbol.outline.width = "2px";
        this.highlightSymbol.size = highlightSize;   // += 5;      // (For polygons, this is meaningless, but also harmless.)
      } else {
        if (this.highlightSymbolType === "polyline")
          this.highlightSymbol = new SimpleLineSymbol(this.highlightSymbolInfo);
      }
      this.highlightLayer.renderer = new SimpleRenderer(this.highlightSymbol);
    },


    makeFooterElements: function() {
      if (!this.footerPanel)
        return false;
      this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
      this.footerWrapper.innerHTML = "";
      this.footerPanel.innerHTML = "<div style='position: absolute; left: 20px;'>Totals</div>";
      this.footerPanel.appendChild(this.footerWrapper);
      return true;
    },

    setActiveTab: function(index) {
      this.prevTab = this.currTab;
      let tabId = this.tabInfo[this.prevTab].tabId;
      getEl(tabId).className = "";
//      getEl(tabId).className.replace(" active", "");
      this.currTab = index;
      tabId = this.tabInfo[this.currTab].tabId;
      getEl(tabId).className += " active";

      // Change parameters using settings of new tab
      for (o in this.tabInfo[index]) {
        this[o] = this.tabInfo[index][o];
      }

      // Reset to null any parameters not specified in new tab info
      if (!this.tabInfo[index].textOverlayPars)
        this.textOverlayPars = null;
      if (!this.tabInfo[index].calcFields)
        this.calcFields = null;

      this.changeFeatureHandling();

      this.setHeaderItemVisibility();
      this.runQuery(view.extent);
      this.makeFooterElements();
    },

    tabClickHandler: function(evt) {
      this.w.setActiveTab(this.index);
    },

    addPanelHtml: function() {
      // Get DOM node of panel
      let panelDiv = dom.byId(this.contentPaneId);
      let classType = this.panelType;
      let name = this.baseName;
      let tabInfo = this.tabInfo;

      let classAddOn = "";
      if ((classType === "table") & (layoutCode[0] === "h"))
        classAddOn = "EP";     // Different class if under a horizontal ExpandoPane

      // Add "panel disabled" DIV.  (Visible when not zoomed in far enough to see features.)
      let S = '';
      S = '<div id="panelDisabled_' + name + '" class="PanelDisabled" >\n';
      S += '  <label id="disabledMsg_' + name + '" class="MsgDisabled" >Zoom in further to see ' + name + '</label>\n';
      S += '</div>\n';
      panelDiv.innerHTML = S;

      // Make container for displaying feature info
      let theContainer = makeHtmlElement("div", "panelEnabled_" + name, classType + "PanelEnabled"/*, "visibility: hidden"*/);
      let panelTabs = null;

      // Header panel.  Optionally includes tabs if tabInfo is specified
      if (tabInfo) {
        panelTabs = makeHtmlElement("div", "panelTabs_" + name, "tableHeaderTabs"+classAddOn);
        for (let t in tabInfo) {
          let item = tabInfo[t];
          item.tabId = this.baseName + "Tab" + item.tabName;
          let titlePar = item.notAvailableMsg;
          if (titlePar)
            titlePar = ' title="' + titlePar + '" disabled';
          else
            titlePar = '';
          let buttonHtml = '<button id="' + item.tabId + '"' + titlePar + '>' + item.tabTitle + '</button>';
          panelTabs.innerHTML += buttonHtml + "&emsp;";
        }
        theContainer.appendChild(panelTabs);
      }

      let theClass = classType + "HeaderDiv" + classAddOn;
      let headerPanel = makeHtmlElement("div", name + "HeaderDiv", theClass);
      //let headerWrapper = makeHtmlElement("div", null,"semiTransparentBG");
      //headerWrapper.appendChild(headerPanel);
      theContainer.appendChild(headerPanel);

      // Main panel content
      let midContent = '';
      this.footerPanel = null;
      if (classType === 'media') {
        this.photoImageId = this.baseName + 'Image';
        let imgHtml = '    <img id="' + this.photoImageId + '" class="imageContainer" src="assets/images/Camera240X240.png" alt="">\n';
        if (name === 'video')
          imgHtml = '    <div id="videoImageContainer" class="imageContainer"></div>\n';
        midContent = '<div id="' + name + 'NoImageMessage" class="mediaMessageDiv" style="padding: 0" ><b>No ' + name + '</b></div>' + imgHtml;
        this.footerPanel = makeHtmlElement("div", name + "ToolsDiv", "mediaToolsContainer");
      } else if (classType === 'table'){
        if (this.footerDivName) {
          this.footerPanel = makeHtmlElement("div", this.footerDivName,  "tableFooterDiv"+classAddOn);
        }
      }

      let centerPanel = makeHtmlElement("div", name + "Container", classType + "ContainerDiv");
      centerPanel.innerHTML = midContent;
      if (this.customContextMenu)
        centerPanel.oncontextmenu = this.customContextMenu;
      theContainer.appendChild(centerPanel);

      if (this.footerPanel) {
        theContainer.appendChild(this.footerPanel);
        this.makeFooterElements();
      }

      panelDiv.appendChild(theContainer);      // Attach to parent element

      // If panel has tabs, add tab change watcher
      if (panelTabs) {
        //this.setActiveTab(0);
        for (t in tabInfo) {
          on(dom.byId(tabInfo[t].tabId), "click", this.tabClickHandler.bind({w: this, index: t}));
        }
      }
    },


    clearGraphics: function() {
      if (this.clickableLayer)
        this.clickableLayer.removeAll();
      if (this.labelsLayer)
        this.labelsLayer.removeAll();
      if (this.highlightLayer)
        this.highlightLayer.removeAll();
      if (this.trackingLayer)
        this.trackingLayer.removeAll();
      view.popup.close();
    },

    runQuery: function(extent, queryPars) {
      if (extent) {
        let pad = extent.width/50;      // Shrink query extent by 4%, to ensure that graphic points and markers are well within view
        this.query.geometry = null;     // By default, no spatial filter unless there is a spatialRelationship defined
        if (this.query.spatialRelationship) {
          this.query.geometry = new Extent({
            spatialReference: extent.spatialReference,
            xmin: extent.xmin + pad,
            xmax: extent.xmax - pad,
            ymin: extent.ymin + pad,
            ymax: extent.ymax - pad
          });
        }
      }
      let theWhere = "";

      if (this.initWhere)
        theWhere = this.initWhere;

      this.query.outFields = this.featureOutFields;
      if (this.extraOutFields)                                                       // Currently only applies to szUnitsWidget, which generates .featureOutFields from queries on the map service
        this.query.outFields = this.query.outFields.concat(this.extraOutFields);     //   layers, but also requires fields not displayed in the service, specified by .extraOutFields
      queryComplete = false;

      this.query.orderByFields = this.orderByFields;

      this.ddLayerNameAddOn = "";
      this.ddTotalsLayerNameAddOn = "";

      if (queryPars) {
        if (queryPars.tableName)
          this.layerName = queryPars.tableName;
        this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
        this.totalsLayerName = null;
        if (queryPars.totalsTableName)
          this.totalsLayerName = queryPars.totalsTableName;
        if (queryPars.theWhere !== null) {
          theWhere = queryPars.theWhere;
          this.initWhere = theWhere;
        }
        if (queryPars.header) {
          //this.title = queryPars.header;
          getEl(this.draggablePanelId + "_headerText").innerText = queryPars.header;      // this.title;
        }
        if (queryPars.extraFields) {
          this.query.outFields = this.query.outFields.concat(queryPars.extraFields);
        }
      } else {    // Do this only when query parameters are not already specified in the argument
        if (this.radioFilterInfo) {
          theWhere = addToWhere(theWhere, this.radioFilterInfo.where);
        }
        if (this.optionalFieldInfo) {
          let i = getEl(this.optionalFieldInfo.checkboxId).checked ? 1 : 0;
          this.layerName = this.optionalFieldInfo.tableNames[i];
          this.query.outFields = this.featureOutFields.concat(this.optionalFieldInfo.fields[i]);
          this.query.orderByFields = this.query.orderByFields.concat(this.optionalFieldInfo.order[i]);
          this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
        }
        if (this.dropDownInfo) {
          let ddInfo = this.dropDownInfo;
          for (d in ddInfo) {
            let item = ddInfo[d];
            let itemWhere = null;
            if (this.dropdownElements.includes(item.wrapperId)) {
              if (item.panelWhere) {
                itemWhere = item.panelWhere;
                item.panelWhereChanged = false;
                getEl(item.uniqueName + "_closeButton").innerText = "Close";
                this.ddLayerNameAddOn += item.LayerNameAddOn;
                if (item.totalsLayerNameAddOn)
                  this.ddTotalsLayerNameAddOn += item.totalsLayerNameAddOn;
              }
              else if ((!item.expandPanelId)  && (item.SelectedOption !== "All")) {
                let selOption = item.SelectedOption;
                if (item.isAlpha)
                  selOption = "'" + selOption + "'";
                this.ddLayerNameAddOn += item.LayerNameAddOn;
                if (item.totalsLayerNameAddOn)
                  this.ddTotalsLayerNameAddOn += item.totalsLayerNameAddOn;
                itemWhere = item.whereField + "=" + selOption;
              }
            }
            if (itemWhere) {
              if (theWhere !== "")
                theWhere += " AND ";
              theWhere += itemWhere;
            }
          }
        }
        if (this.dynamicLayerName) {    // Do this only if layer name changes, e.g. when querying on pre-grouped views
          this.layerName = this.layerBaseName + this.LayerNameAddOn + this.ddLayerNameAddOn;
          this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
          this.totalsLayerName = this.layerBaseName + this.ddTotalsLayerNameAddOn;
        }
      }

      this.query.where = theWhere;

      this.queryTask.execute(this.query).then(function(results){
        this.queryPending = false;
        if (results.features.length > maxSZFeatures) {
          updateNoFeaturesMsg(extentDependentWidgets, "toomany");
        } else {
/*
          if (this.widgetName === "szUnitsWidget")
            setDisplay("showUnitsDiv", true);     // Show secondary unit features checkbox
*/
          this.processResults(results);
        }
      }.bind(this), function(error) {
        this.queryPending = false;
        console.log(this.baseName + ":  QueryTask failed.");
      }.bind(this));
    },

    changeCurrentFeature: function(newIndex) {
      if (newIndex<0 || newIndex>=this.getFeatureCount())
        return null;     // Do nothing: out of range
      this.counter = newIndex;
      let attrs = this.getFeatureAttributes(this.counter);
      this.moveToFeature(attrs);
      this.updateMedia(attrs);
      getEl(this.currNumber_SpanId).innerHTML = this.counter + 1;
      this.hideMootControls();
    },

    moveToFeature: function (attrs) {
      if (this.headerDivName) {
        let headerDiv = getEl(this.headerDivName);
        if (attrs.Caption) {
          headerDiv.innerHTML = attrs.Caption;
          headerDiv.setAttribute("title", attrs.Caption);
        }
        else
          headerDiv.innerHTML = "";     // getEl(this.disabledMsgDivName).innerHTML;    // why was this here?
      }
       if (this.noGeometry)
         return;
      this.trackingLayer.removeAll();
      let projPoint = new Point(attrs.x, attrs.y);
      let markerPoint = webMercatorUtils.webMercatorToGeographic(projPoint);
      let newFeature = new Graphic(markerPoint, this.trackingSymbol);
      //console.log(this.baseName + ":  " + newFeature.geometry.x + "," + newFeature.geometry.y)
      this.trackingLayer.add(newFeature);
    },

    hideMootControls: function() {
      setVisible(this.controlData[0][0], this.counter>0);
      setVisible(this.controlData[1][0], this.counter>0);
      setVisible(this.controlData[3][0], this.counter<(this.features.length-1));
      setVisible(this.controlData[4][0], this.counter<(this.features.length-1));
    },



    clearAllHighlights: function() {
      szVideoWidget.highlightLayer.removeAll();
      szPhotoWidget.highlightLayer.removeAll();
    },

    highlightFeature: function(g) {
      this.highlightLayer.removeAll();
      let newFeature = new Graphic(g, this.highlightSymbol);
      this.highlightLayer.add(newFeature);
    },

    makeClickableGraphics: function(features) {     // Make clickable graphic features.  If no new features, then clear all
      if (!this.clickableSymbol)
          return;
      this.clearGraphics();     // Clear any previously-existing graphics and associated stuff
      if (features.length === 0)
        return;

      if (this.filterBgLayer) {   // If there is an associated background layer, show it whenever data has been filtered
        let bgLayer = faMapServiceLayer.sublayers.find(function(layer){
          return layer.title === this.filterBgLayer;
        }.bind({filterBgLayer: this.filterBgLayer}));
          //.items[faSublayerIDs[this.filterBgLayer]];
        bgLayer.visible = (this.query.where !== "");
      }
      for (let n = 0; n < features.length; n++) {
        let g = features[n];
        let geom = g.geometry;
        if (g.geometry.type === "polyline")
          geom = g.geometry.extent;
        let centroid = g.geometry;

        let skipFeature = false;
      // If feature is not a point, use center of feature extent for "x" and "y" attributes
        if (g.geometry.type !== "point") {
          centroid = g.geometry.extent.center;
        } else if (this.clickableSymbolGap) {
          let gArray = this.clickableLayer.graphics.items;
          let l = gArray.length;
          if (l > 0) {
            let sp1 = view.toScreen(gArray[l-1].geometry);
            let sp2 = view.toScreen(geom);
            let dist_pixels = Math.sqrt(Math.pow(sp2.x-sp1.x,2) + Math.pow(sp2.y-sp1.y,2));
            if (dist_pixels < this.clickableSymbolGap)
              skipFeature = true;
          }
        }

        let mapFeature = webMercatorUtils.webMercatorToGeographic(geom);      //projPoint);   //this._webMercatorToGeographic(projPoint);
        let mapFeatureCenter = webMercatorUtils.webMercatorToGeographic(centroid);

        // Added attributes
        g.attributes.item = n;
        g.attributes.x = centroid.x;
        g.attributes.y = centroid.y;
        g.attributes.Caption = decDegCoords_to_DegMinSec(mapFeatureCenter.x, mapFeatureCenter.y);

        // Make "clone" of g.attributes, to attach to graphic
        let a = {};
        for (i in g.attributes) {
          a[i] = g.attributes[i];
        }

        if (!skipFeature) {
          let currSymbol = this.clickableSymbol.clone();
          if (this.renderingInfo) {
            let v = a[this.renderingInfo.field];
            currSymbol.color = this.renderingInfo.uniqueColors[v];
          }
          let graphic = new Graphic({
            geometry: mapFeature,
            symbol: currSymbol,   // this.clickableSymbol,
            attributes: a,
            highlightGeometry: g.geometry
          });
          this.clickableLayer.add(graphic);

          // add text?
          if (this.textOverlayPars) {
            let overlayPars = this.textOverlayPars;
            overlayPars.text = a[this.textOverlayField];
            let textGraphic = new Graphic({
              geometry: mapFeature,
              symbol: overlayPars
            });
            this.labelsLayer.add(textGraphic);
          }
        }

      }
      //console.log(this.clickableLayer.graphics.items.length + " " + this.baseName + " markers");
    },

    getFeatureCount: function() {
      return this.features.length;
      //return this.clickableLayer.graphics.length;
    },

    getFeatureAttributes: function(p) {
      return this.features[p].attributes;
      //return this.clickableLayer.graphics.items[p].attributes;
    },

    indexFirstFeatureGreaterThan: function(attrName, attrValue) {
      for (let n = 0; n < this.getFeatureCount(); n++) {
        if (this.getFeatureAttributes(n)[attrName] >= attrValue)
          return n;
      }
      return -1;
    },

    playerControl: function(action) {
      switch(action) {
        case "toStart":       this.toStart(); break;
        case "playBackward":  this.playBackward(); break;
        case "pause":         this.pause(); break;
        case "playForward":   this.playForward(); break;
        case "toEnd":         this.toEnd(); break;
      }
    },

  mediaDimensions: function(aspect) {
    let mediaDiv = dijit.registry.byId(this.contentPaneId);

    // HACK to handle Dojo weirdness on browser resize
    if (mediaDiv.h === 0)
      return null;

    let d = {width: mediaDiv.w, height: mediaDiv.h} ;
    let divAspect = d.width/d.height;
    if (aspect < divAspect)
      d.width = parseInt(d.height*aspect);
    else
      d.height = parseInt(d.width/aspect);
    return d;
  },

  resizeImg: function() {
    let pDims = this.mediaDimensions(photoAspectRatio);

    // HACK to handle Dojo weirdness on browser resize: Leave unchanged if pDims is null
    if (pDims === null)
      return null;

    let photoEl = this.photoImage[0];
    photoEl.width = pDims.width;
    photoEl.height = pDims.height;
  }

});
});


