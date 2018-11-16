/**
 * Class QueryBasedPanelWidget
 *
 * generic widget for spatial queries on map service layers, with associated panel for results
 *   Subclasses of this must set the processData function in the constructor  (see example in VideoPanelWidget.js)
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
], function(declare, lang, on, dom, /*BorderContainer, ContentPane, TabContainer, */Query, QueryTask, GraphicsLayer, SimpleRenderer, UniqueValueRenderer,
              PictureMarkerSymbol, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Extent, Point, webMercatorUtils, Graphic){

  var queryComplete = true;

  return declare(null, {

    constructor: function(/*Object*/ kwArgs){
      lang.mixin(this, kwArgs);

      //this.addPanelHtml();

      if (this.clickableSymbolInfo) {
        // Add (transparent) Graphics Layer for selecting feature
        this.clickableLayer = new GraphicsLayer();
        this.clickableLayer.listMode = "hide";
        this.clickableLayer.id = this.panelName + "_Clickable";
        this.clickableLayer.title = this.clickableLayer.id;
        this.clickableLayer.visible = true;
        if (this.hideMarkersAtStart)
          this.clickableLayer.visible = !this.hideMarkersAtStart;

        this.setClickableSybolType();
        this.setRenderer();

        this.clickableLayer.widgetController = this;    // Custom property added to Graphics Layer object, to reference back to this widget
        this.map.add(this.clickableLayer);
        this.mouseStillOver = false;
        this.infoWin = this.view.popup;
        this.counter = 0;

        // To indicate item currently hovered-over or touched
        if (!this.highlightSymbolType)
          this.highlightSymbolType = this.clickableSymbolType;
        this.highlightLayer = new GraphicsLayer();
        this.highlightLayer.listMode = "hide";
        this.highlightLayer.id = this.panelName + "_highlight";
//        this.highlightLayer.title = this.highlightLayer.id;
        this.highlightLayer.visible = true;

        if (!this.highlightSymbolInfo) {
          this.highlightSymbol = this.clickableSymbol.clone();
          // So far, the only ones that don't have separate highlightSymbolInfo are Points
          this.highlightSymbol.color.a = 0;
          this.highlightSymbol.outline.color = "red";
          this.highlightSymbol.outline.width = "2px";
          this.highlightSymbol.size += 5;
        } else {
          if (this.highlightSymbolType == "polyline")
            this.highlightSymbol = new SimpleLineSymbol(this.highlightSymbolInfo);
        }

        /*
        this.highlightSymbol = this.clickableSymbol.clone();
        if (this.highlightSymbolType == "polyline") {
          //this.highlightSymbol.color.a = 0;
          this.highlightSymbol.color = "red";
          this.highlightSymbol.width = "2px";
          //this.highlightSymbol.size += 5;
        } else{
          this.highlightSymbol.color.a = 0;
          this.highlightSymbol.outline.color = "red";
          this.highlightSymbol.outline.width = "2px";
          this.highlightSymbol.size += 5;
        }
        */

        this.highlightLayer.renderer = new SimpleRenderer(this.highlightSymbol);
//        this.highlightLayer.widgetController = this;    // Custom property added to Graphics Layer object, to reference back to this widget
        this.map.add(this.highlightLayer);
      }

      if (this.trackingSymbolInfo) {
        // Add Graphics Layer for tracking icon
        this.trackingLayer = new GraphicsLayer();
        this.trackingLayer.listMode = "hide";
        this.trackingLayer.id = this.panelName + "_Tracking";
        this.trackingLayer.title = this.trackingLayer.id;
        this.trackingLayer.visible = true;
        var symbolArgs = this.trackingSymbolInfo.split(":");
        this.trackingImageURL = symbolArgs[0];
        this.trackingSymbol = new PictureMarkerSymbol(symbolArgs[0], symbolArgs[1], symbolArgs[2]);
        this.trackingLayer.renderer = new SimpleRenderer(this.trackingSymbol);
        this.map.add(this.trackingLayer);
        this.playDir = 1;     // playback direction
      }

      if (this.disabledMsgDivName)
        setMessage(this.disabledMsgDivName, this.dfltCaptionHTML);
        //getEl(this.headerDivName).innerHTML = this.dfltCaptionHTML;

      // Skip if the widget doesn't get its data directly from a query
      // e.g. PhotoPlaybackWidget, which uses a subset of the data from VideoPanelWidget
      if (!this.noQuery) {
        var subLayerURL = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
        this.queryTask = new QueryTask(subLayerURL);
        this.query = new Query();
        with (this.query) {
          returnGeometry = true;
          spatialRelationship = this.spatialRelationship;      //"contains";
          outFields = this.queryOutFields;      // [];
          orderByFields = [];
          where = "";
          //returnCountOnly = true;
        }

      }

      this.addPanelHtml();


      // placeholder -- function will be overridden by subclasses of QueryBasedPanelWidget
      this.processData = function(results) {
      };

      // placeholder -- function will be overridden by subclasses of QueryBasedPanelWidget
      this.updateMedia = function(attrs) {
      };

      this.moveButtonPressHandler = function(attrs) {
        this.changeCurrentFeature(attrs.item);
        this.moveToFeature(attrs);
        this.infoWin.close();
      };

      // default method, returns argument
      // override this method in subwidget
      this.attrValDescription = function(a, attrs) {
        return attrs[a];
      };

      // default method, returns argument
      // override this method in subwidget
      this.attrName = function(a) {
        return a;
      };

      this.displayPlayButton = function(e) {
        //debug("displayPlayButton");
        var infoWin = view.popup;
        if (popupsDocked) {
          infoWin.dockEnabled = true;
          infoWin.dockOptions = {position: "bottom-right" };
        }
        attrs = e.attributes;
        infoWin.title = this.popupTitle;    // this.baseName + " point";
        infoWin.content = "<nobr><b>" + attrs.Caption.replace(":",":</b>") + "</nobr><br>";        //+ "</b>";
        //a.Caption = "<b>" + a.Caption.replace(":","</b>");      //

        if (this.showFieldsInPopup) {
          for (f in this.query.outFields) {
            a = this.query.outFields[f];
            if (attrs[a])
              infoWin.content += "<nobr><b>" + this.attrName(a) + ": </b>" + this.attrValDescription(a, attrs) + "</nobr><br>";
          }
        }

        if (this.clickableMsg) {
          infoWin.actions.items[0].visible = true;
          infoWin.actions.items[0].title = this.clickableMsg;
          infoWin.actions.items[0].image = this.trackingImageURL;
        } else {
          infoWin.actions.items[0].visible = false;
        }

        //    Positions the popup.  Disabled for now, as it can cause panning of display.
        if (e.geometry.type == "point")
          infoWin.location = e.geometry;
        else
          infoWin.location = e.geometry.center;


        //view.popup.reposition();
        //infoWin.alignment = "left";
        infoWin.open();
        this.clearAllHighlights();
        this.highlightFeature(e.highlightGeometry);          // geometry);
        //debug("displayPlayButton complete");
      };

      console.log(this.panelName);

    },


//    METHOD DEFINITIONS

  setRenderer: function() {
/*
    if (this.renderingInfo) {
      //var uniqueValueInfos = [];
      var valueInfo = this.renderingInfo.uniqueValueInfos;
      var template = this.clickableSymbolInfo;
      for (s in valueInfo) {
        var symbol = new SimpleMarkerSymbol(valueInfo[s].symbol);
        symbol.style = template.style;
        symbol.outline = template.outline;
        symbol.size = template.size;
        //symbol.type = 'simple-marker';
      }
      this.clickableLayer.renderer = new UniqueValueRenderer(this.renderingInfo);
    } else {
*/
      this.clickableLayer.renderer = new SimpleRenderer(this.clickableSymbol);
//    }
  },


  setClickableSybolType: function() {
      if (this.clickableSymbolType == "text")
        this.clickableSymbol = new TextSymbol(this.clickableSymbolInfo);
      if (this.clickableSymbolType == "point")
        this.clickableSymbol = new SimpleMarkerSymbol(this.clickableSymbolInfo);
      else if (this.clickableSymbolType == "polyline")
        this.clickableSymbol = new SimpleLineSymbol(this.clickableSymbolInfo);
      else if (this.clickableSymbolType == "polygon" || this.clickableSymbolType == "extent")
        this.clickableSymbol = new SimpleFillSymbol(this.clickableSymbolInfo);
    },

    setActiveTab: function(index) {
/*
      if (index === this.currTab)
        return;
      if (this.currTab === -1)
        this.currTab = 0;
*/
      this.prevTab = this.currTab;
      var tabId = this.tabInfo[this.prevTab].tabId;
      getEl(tabId).className = "";
//      getEl(tabId).className.replace(" active", "");
      this.currTab = index;
      tabId = this.tabInfo[this.currTab].tabId;
      getEl(tabId).className += " active";

      // Change parameters using settings of new tab
      for (o in this.tabInfo[index]) {
        this[o] = this.tabInfo[index][o];
      }
      if (!this.tabInfo[index].textOverlayPars)
        this.textOverlayPars = null;              // Reset main textOverlayPars to null if textOverlayPars is not specified in new tab info
      //this.queryOutFields = this.tabInfo[index].queryOutFields;

      this.setClickableSybolType();
      //this.setRenderer();
      this.setHeaderItemVisibility();
      this.runQuery(view.extent);

      // make LABEL elements for totals
      this.footerWrapper.innerHTML = "";
      if (this.totalFields) {
        var fields = this.totalFields;
        this.totalLabels = {};
        for (f in fields) {
          var fieldName = fields[f];
          var colNum = this.queryOutFields.indexOf(fields[f]);
          if (colNum === -1)
            this.totalLabels[fieldName] = null;
          else {
            this.totalLabels[fieldName] = {
              colNum: colNum,
              node: makeHtmlElement("LABEL", null, null, "position: absolute; top: 0px; left: 100px", "Total")
            }
            this.footerWrapper.appendChild(this.totalLabels[fieldName].node);
          }
        }
      }

    },

    tabClickHandler: function(evt) {
      this.w.setActiveTab(this.index);
    },

    addPanelHtml: function() {
      // Get DOM node of panel
      var panelDiv = dom.byId(this.contentPaneId);
      var classType = this.panelType;
      var name = this.baseName;
      var tabInfo = this.tabInfo;

      // Add "panel disabled" DIV.  (Visible when not zoomed in far enough to see features.)
      var S = '';
      S = '<div id="panelDisabled_' + name + '" class="PanelDisabled" >\n';
      S += '  <label id="disabledMsg_' + name + '" class="MsgDisabled" >Zoom in further to see ' + name + '</label>\n';
      S += '</div>\n';
      panelDiv.innerHTML = S;

      // Make container for displaying feature info
      var theContainer = makeHtmlElement("div", "panelEnabled_" + name, classType + "PanelEnabled");
      var panelTabs = null;

      // Header panel.  Optionally includes tabs if tabInfo is specified
      if (tabInfo) {
        panelTabs = makeHtmlElement("div", "panelTabs_" + name, "tableHeaderTabs");
        for (t in tabInfo) {
          tabInfo[t].tabId = this.baseName + "Tab" + tabInfo[t].tabName;
          var buttonHtml = '<button id="' + tabInfo[t].tabId + '">' + tabInfo[t].tabTitle + '</button>';
          panelTabs.innerHTML += buttonHtml + "&emsp;";
        }
        theContainer.appendChild(panelTabs);
      }

      var headerPanel = makeHtmlElement("div", name + "HeaderDiv", classType + "HeaderDiv");
      theContainer.appendChild(headerPanel);

      // Main panel content
      var midContent = '';
      var footerPanel = null
      if (classType === 'media') {
        var imgHtml = '    <img id="photoImage" class="imageContainer" src="">\n';
        if (name === 'video')
          imgHtml = '    <div id="videoImageContainer" class="imageContainer"></div>\n';
        midContent = '<div id="' + name + 'NoImageMessage" class="mediaMessageDiv" style="padding: 0px" ><b>No ' + name + '</b></div>' + imgHtml;
        footerPanel = makeHtmlElement("div", name + "ToolsDiv", "mediaToolsContainer");
      } else {
        if (this.footerDivName)
          footerPanel = makeHtmlElement("div", this.footerDivName, classType + "FooterDiv");
      }

      var centerPanel = makeHtmlElement("div", name + "Container", classType + "ContainerDiv");
      centerPanel.innerHTML = midContent;
      theContainer.appendChild(centerPanel);

      if (footerPanel)
        theContainer.appendChild(footerPanel);

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
      if (this.highlightLayer)
        this.highlightLayer.removeAll();
      if (this.trackingLayer)
        this.trackingLayer.removeAll();
      view.popup.close();
      setMessage(this.disabledMsgDivName, this.dfltCaptionHTML);
    },

    runQuery: function(extent) {
      var pad = extent.width/50;      // Shrink query extent by 4%, to ensure that graphic points and markers are well within view
      this.query.geometry = null;     // By default, no spatial filter unless there is a spatialRelationship defined
      if (this.query.spatialRelationship) {
        var queryExtent = new Extent({spatialReference: extent.spatialReference, xmin: extent.xmin+pad, xmax: extent.xmax-pad, ymin: extent.ymin+pad, ymax: extent.ymax-pad});
        this.query.geometry = queryExtent;
      }
      this.query.outFields = this.queryOutFields.concat(this.tableFields);       // ["*"];     //TODO: change back to
      queryComplete = false;

      /* test count
       this.queryTask.executeForCount({where: ""}).when(function(count){
                alert(count, " features matched the input query");
       }, function(error){
            alert(error); // Will print error in console if unsupported layers are used
       });
       /**/

      var theWhere = "";
      if (this.tabInfo) {
        this.ddLayerNameAddOn = "";
        this.ddTotalsLayerNameAddOn = "";
        var ddInfo = this.dropDownInfo;
        for (d in ddInfo)
          if (ddInfo[d].SelectedOption !== "All") {
            var selOption = ddInfo[d].SelectedOption;
            if (ddInfo[d].isAlpha)
              selOption = "'" + selOption + "'";
            this.ddLayerNameAddOn += ddInfo[d].LayerNameAddOn;
            this.ddTotalsLayerNameAddOn += ddInfo[d].totalsLayerNameAddOn;
            if (theWhere !== "")
              theWhere += " AND ";
            theWhere += ddInfo[d].whereField + "=" + selOption;
          }
        this.layerName = this.layerBaseName + this.LayerNameAddOn + this.ddLayerNameAddOn;
        this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.layerName];
      }
      this.query.where = theWhere;


      this.queryTask.execute(this.query).then(function(results){
          //var theFeatures = results.features;
          if (results.features.length==maxSZFeatures) {
              console.log(this.baseName + ":  maxSZFeatures (" + maxSZFeatures + ") returned.");
              //alert("Too many features for " + this.layerName + ".  Zoom in further.");
          } else {
            this.processData(results);
          }
      }.bind(this), function(error) {
          //*JN alert("QueryTask failed.");
          console.log(this.baseName + ":  QueryTask failed.");
      }.bind(this));

    },

    changeCurrentFeature: function(newIndex) {
      if (newIndex<0 || newIndex>=this.getClickableGraphicsCount())
        return null;     // Do nothing: out of range
      this.counter = newIndex;
      var attrs = this.getClickableGraphicAttributes(this.counter);
      this.moveToFeature(attrs);
      this.updateMedia(attrs);
    },

    moveToFeature: function (attrs) {
      // if (!mapVisible)
      //   return;
      this.trackingLayer.removeAll();
      var projPoint = new Point(attrs.x, attrs.y);
      var markerPoint = webMercatorUtils.webMercatorToGeographic(projPoint);   //this._webMercatorToGeographic(projPoint);
      var newFeature = new Graphic(markerPoint, this.trackingSymbol);
      this.trackingLayer.add(newFeature);
      if (this.headerDivName) {
        var headerDiv = getEl(this.headerDivName);
        if (attrs.Caption)
          headerDiv.innerHTML = attrs.Caption;
        else
          headerDiv.innerHTML = this.dfltCaptionHTML;
      }
    },

    /*
    _webMercatorToGeographic: function(point) {
      if (!point) {
        alert("Point is null");
        return;
      }
      try {
        var geogPoint = webMercatorUtils.webMercatorToGeographic(point);
        return geogPoint;
      }
      catch(err) {
        alert(err.message)
      }
    },
    */

    clearAllHighlights: function() {
      szVideoWidget.highlightLayer.removeAll();
      szPhotoWidget.highlightLayer.removeAll();
    },

    highlightFeature: function(g) {
      this.highlightLayer.removeAll();
      var newFeature = new Graphic(g, this.highlightSymbol);
      this.highlightLayer.add(newFeature);
    },

    makeClickableGraphics: function(features) {
      if (!this.clickableSymbol)
          return;
      this.clearGraphics();     // Clear any previously-existing graphics and associated stuff
      for (var n = 0; n < features.length; n++) {
        var g = features[n];
        var a = {};
        for (i in g.attributes) {
            a[i] = g.attributes[i];
        }
        a.item = n;

        var geom = g.geometry
        var centroid = g.geometry;
        var skipFeature = false;
      // If feature is not a point, use center of feature extent for "x" and "y" attributes
        if (g.geometry.type != "point") {
          geom = g.geometry.extent;
          centroid = geom.center;
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
        a.x = centroid.x;    // g.geometry.x;
        a.y = centroid.y;    // g.geometry.y;

        if (!skipFeature) {
          var mapFeature = webMercatorUtils.webMercatorToGeographic(geom);      //projPoint);   //this._webMercatorToGeographic(projPoint);
          var mapFeatureCenter = webMercatorUtils.webMercatorToGeographic(centroid);
          a.Caption = decDegCoords_to_DegMinSec(mapFeatureCenter.x, mapFeatureCenter.y);

          var currSymbol = this.clickableSymbol.clone();
          if (this.renderingInfo) {
            var v = a[this.renderingInfo.field];
            currSymbol.color = this.renderingInfo.uniqueColors[v];
          }
          var graphic = new Graphic({
            geometry: mapFeature,
            symbol: currSymbol,   // this.clickableSymbol,
            attributes: a,
            highlightGeometry: g.geometry
          });
          this.clickableLayer.add(graphic);

          // add text?
          if (this.textOverlayPars) {
            var overlayPars = this.textOverlayPars;
            overlayPars.text = a[this.textOverlayField];
            var textGraphic = new Graphic({
              geometry: mapFeature,
              symbol: overlayPars,
            });
            this.clickableLayer.add(textGraphic);
          }
        }

      }
    },

    getClickableGraphicsCount: function() {
      return this.clickableLayer.graphics.length;
    },

    getClickableGraphicAttributes: function(p) {
      return this.clickableLayer.graphics.items[p].attributes;
    },

    indexFirstFeatureGreaterThan: function(attrName, attrValue) {
      for (var n = 0; n < this.getClickableGraphicsCount(); n++) {
        if (this.getClickableGraphicAttributes(n)[attrName] >= attrValue)
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
    }

  });
});


