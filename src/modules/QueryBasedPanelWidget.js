/**
 * Class QueryBasedPanelWidget
 *
 * generic widget for spatial queries on map service layers, with associated panel for results
 *   Subclasses of this must set the processFeatures_Widget function in the constructor  (see example in VideoPanelWidget.js)
 *
 * Constructor arguments:
 *    mapServiceLayer: MapImageLayer
 *    subLayerName: String     name of a sublayer of mapServiceLayer
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
  "esri/geometry/Polygon",
  "esri/geometry/Point",
  "esri/geometry/support/webMercatorUtils",
  "esri/Graphic"
], function(declare, lang, on, dom, registry, /*BorderContainer, ContentPane, TabContainer, */Query, QueryTask, GraphicsLayer, SimpleRenderer, UniqueValueRenderer,
              PictureMarkerSymbol, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, TextSymbol, Extent, Polygon, Point, webMercatorUtils, Graphic){

  let queryComplete = true;

  return declare(null, {

    constructor: function(/*Object*/ kwArgs){
      lang.mixin(this, kwArgs);

      this.initFeatureHandling();
      this.addPanelHtml();

      this.setDefaultDisabledMsg = function() {
        if (this.defaultDisabledMsg)
          setMessage(this.disabledMsgName, this.defaultDisabledMsg);
      }

      this.setDefaultDisabledMsg();

      this.processResults = function(results) {
        let features = results.features;
        this.features = features;
        if (features.length===0 && this.panelType!=="table") {
          updateNoFeaturesMsg(this.noFeaturesPanels, "zoomout");
          return;
        }
        this.fields = results.fields;
        this.setDisplayLayers();
        updateNoFeaturesMsg(this.noFeaturesPanels, "");
        //this.setPanelVisibility(features);
        this.processFeatures(features);
      };

      this.setDisplayLayers = function() {
        if (!this.backgroundLayers)
          return;
        let displayLayers = this.backgroundLayers.slice();
        displayLayers.push(this.subLayerName);
        if (this.filterBgLayer  && (this.query.where !== ""))
          displayLayers.push(this.filterBgLayer);
        let layers = this.mapServiceLayer.sublayers.items;
        for (let i=0; i<layers.length; i++) {
          layers[i].visible = displayLayers.includes(layers[i].title);
          if (layers[i].title === this.subLayerName)
            layers[i].definitionExpression = this.query.where;
        }
      };

      // placeholder -- function will be overridden by subclasses of QueryBasedPanelWidget
      this.processFeatures_Widget = function(features) {
      };

      // Initial processing of features, common to all inherited widgets
      this.processFeatures = function(features) {
        if (!this.noGeometry && !this.noMarkers)
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
        this.clearAllHighlights();
        this.highlightFeature(e.highlightGeometry);

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

        infoWin.title = this.popupTitle;    // this.baseName + " point";
        if (row)
          infoWin.content = this.rowHtmlToLines(row);
        else {
          attrs = e.attributes;
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
        //let subLayerURL = this.mapServiceQueryUrl();
        this.queryTask = new QueryTask();       //(subLayerURL);
        let q = new Query();
        q.returnGeometry = true;
        q.spatialRelationship = this.spatialRelationship;      //"contains";
        q.orderByFields = this.orderByFields;
        q.where = "";
        this.query = q;
      }
    },

    mapServiceQueryUrl: function(tableName) {
      if (!tableName)
        tableName = this.subLayerName;
      return (this.mapServiceLayer.url + "/" + this.sublayerIDs[tableName]);
    },

    changeFeatureHandling: function() {
      this.setClickableRendering();
      this.setHighlightRendering();
    },

  makeSymbol(symbolInfo, symbolType) {
    let symbol = null;
    if (symbolType === "text")
      symbol = new TextSymbol(symbolInfo);
    if (symbolType === "point")
      symbol = new SimpleMarkerSymbol(symbolInfo);
    else if (symbolType === "polyline")
      symbol = new SimpleLineSymbol(symbolInfo);
    else if (symbolType === "polygon" || symbolType === "extent")
      symbol = new SimpleFillSymbol(symbolInfo);
    return symbol;
  },

    setClickableRendering: function() {
      this.clickableSymbol = this.makeSymbol(this.clickableSymbolInfo, this.clickableSymbolType);
      this.clickableLayer.renderer = new SimpleRenderer(this.clickableSymbol);
    },


    setHighlightRendering: function() {
      if (this.highlightSymbolInfo) {
        this.highlightSymbol = this.makeSymbol(this.highlightSymbolInfo, this.highlightSymbolType);
      } else {
        this.highlightSymbol = this.clickableSymbol.clone();
        this.highlightSymbol.color.a = 0;
        if (this.highlightSymbol.outline) {
          this.highlightSymbol.outline.color = "red";     // For points, border of point symbol.  For polygons, border of polygon.
          this.highlightSymbol.outline.width = "2px";
        }
        this.highlightSymbol.size = highlightSize;   // += 5;      // (For polygons, this is meaningless, but also harmless.)
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

    hideHiddenItems: function() {
      let ddInfo = this.dropDownInfo;
        for (let d=0; d<ddInfo.length; d++) {
          setDisplay(ddInfo[d].showColOption_Id, ddInfo[d].showColOption_Visible);
        }
    },

    setActiveTab: function(index) {
      this.prevTab = this.currTab;
      this.currTab = index;
      if (!this.tabsHidden) {
        getEl(this.tabInfo[this.prevTab].tabId).className = "";
        getEl(this.tabInfo[this.currTab].tabId).className += " active";
      }

      let tabInfo = this.tabInfo[index];

      // Change parameters using settings of new tab
      for (o in tabInfo) {
        this[o] = tabInfo[o];
      }

      // Reset to null any parameters not specified in new tab info
      if (!tabInfo.textOverlayPars)
        this.textOverlayPars = null;
      if (!tabInfo.calcFields)
        this.calcFields = null;

      if (this.clickableSymbolInfo)
        this.changeFeatureHandling();

      this.setHeaderItemVisibility();
      this.runQuery(view.extent);
      this.makeFooterElements();

      showPopups = showPopupsDefault;
      if (tabInfo.noPopups) {
        showPopups = false;
      }
      getEl("showPopupsCheckbox").checked = showPopups;
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
      this.disabledMsgDivName = "panelDisabled_" + name;
      this.disabledMsgName = "disabledMsg_" + name;
      let S = '';
      S = '<div id="' + this.disabledMsgDivName + '" class="PanelDisabled" >';
      S += '<label id="' + this.disabledMsgName + '" class="MsgDisabled">Zoom in further to see ' + name + '</label>';
      S += '</div>';
      panelDiv.innerHTML = S;

      // Make container for displaying feature info
      let theContainer = makeHtmlElement("div", "panelEnabled_" + name, classType + "PanelEnabled"/*, "visibility: hidden"*/);
      let panelTabs = null;

      // Header panel.  Optionally includes tabs if tabInfo is specified
      if (tabInfo && !this.tabsHidden) {
        panelTabs = makeHtmlElement("div", "panelTabs_" + name, "tableHeaderTabs"+classAddOn);
        for (let t in tabInfo) {
          let item = tabInfo[t];
          item.tabId = this.baseName + "Tab" + item.tabName;
          let titlePar = item.notAvailableMsg;
          if (titlePar)
            titlePar = ' title="' + titlePar + '" disabled';
          else
            titlePar = '';
          //titlePar += ' class="subTabLabel"';
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

    // TODO:  queryPars currently consists of just queryPars.theWhere, so find a way to consolidate theWhere and queryPars
    setDynamicQueryPars: function(theWhere, queryPars, serviceName) {
      // Build dynamic query parameters for map service query:  query.where, query.outFields, query.orderByFields, queryTask.url

      // default setting for .outFields, .orderByFields   (might be modified in buildQueryPars)
      this.query.outFields = this.featureOutFields;
      if (this.extraOutFields)                                                        // Currently only applies to szUnitsWidget, which generates .featureOutFields from queries on the map service
        this.query.outFields = this.query.outFields.concat(this.extraOutFields);     //   layers, but also requires fields not displayed in the service, specified by .extraOutFields
      this.query.orderByFields = this.orderByFields;

      if (this.initWhere)     // If initWhere is present, this overrides theWhere provided in the argument
        theWhere = this.initWhere;

      // modifies theWhere
      if (queryPars) {        // Currently only applies when a table row is clicked, in which case the appropriate WHERE clause is included
        if (queryPars.theWhere !== null) {
          theWhere = queryPars.theWhere;
          this.initWhere = theWhere;
        }
      } else {

        if (this.radioFilterInfo)
          theWhere = addToWhere(theWhere, this.radioFilterInfo.where);

        // modifies theWhere, this.subLayerName
        if (this.dropDownInfo) {
          if (this.maxLayerName)
            this.subLayerName = this.maxLayerName;
          let ddInfo = this.dropDownInfo;
          for (d in ddInfo) {
            let item = ddInfo[d];
            let itemWhere = null;
            if (this.dropdownElements.includes(item.wrapperId)) {
              if (item.subDropDowns) {      // This is for expandPanels (containing subDropDowns)
                let replacementName = "";
                let i = item.subDropDowns.length - 1;
                do {
                  let subDropDown = this.getddItem(item.subDropDowns[i]);
                  if (subDropDown.SelectedOption === "All")
                    i += -1;
                  else {
                    if (item.layerSubNames)     // Only do if not using customRestService
                      replacementName = subDropDown.layerSubNames;
                    i = -1;
                  }
                } while (i > -1);
                this.subLayerName = this.subLayerName.replace("{"+item.ddName+"}", replacementName);

                if (item.panelWhere) {
                  itemWhere = item.panelWhere;
                  item.panelWhereChanged = false;
                  getEl(item.uniqueName + "_closeButton").innerText = "Close";
                }
                //this.ddLayerNameAddOn += item.LayerNameAddOn;

              } else if (!item.expandPanelId) {     // This is for dropdowns which are contained within expandPanels
                if (item.SelectedOption !== "All") {
                  let selOption = item.SelectedOption;
                  if (item.isAlpha)
                    selOption = "'" + selOption + "'";
                  itemWhere = item.whereField + "=" + selOption;
                }
              }
              if (!item.inCombo)       // This excludes expandPanels and their subDropDowns
                this.subLayerName = this.subLayerName.replace(item.excludedNames, "");
            }
            if (itemWhere) {
              theWhere = addToWhere(theWhere, itemWhere)
/*
              if (theWhere !== "")
                theWhere += " AND ";
              theWhere += itemWhere;
*/
              //theGroup += "," + item.whereField;    // Not doing if DD field is also displayed in table
            }
          }
        }

        // modifies .outFields, .orderByFields, this.subLayerName
        if (this.optionalFieldInfo) {
          // Currently, only applies to SS species table?
          let OFI = this.optionalFieldInfo;
          let i = getEl(OFI.checkboxId).checked ? 1 : 0;
          this.query.outFields = this.featureOutFields.concat(OFI.fields[this.currTab][i]);
          this.query.orderByFields = this.query.orderByFields.concat(OFI.order[i]);
          this.subLayerName = OFI.tableNames[this.currTab][i];
        }
      }

/*binaryFilter*/
      if (this.useBinaryFilter) {
        let spacing_meters = view.toMap({x:videoFeatureSpacing,y:0}).x - view.toMap({x:0,y:0}).x;
        let skipValue = spacing_meters/avg1sDist;
        let numZeros = Math.ceil(Math.log2(skipValue));
        let binaryFilter = "MP4_Seconds_Binary ";
        if (numZeros <= 12)
          binaryFilter += "like '%" + "0".repeat(numZeros) + "'";
        else
          binaryFilter += "= '000000000000'";
        theWhere = addToWhere(theWhere, binaryFilter);
/*
        if (theWhere !== "")
          theWhere += " AND ";
        theWhere += binaryFilter;
*/
      }

      // TODO:  GVDATA_STNPHOTOS has Station in lowercase, while other tables/layers have it uppercase
      //   Queries are case-sensitive, so either change GVDATA_STNPHOTOS to uppercase,
      //   or use lower() function in query   (probably go with the former)
      this.query.where = theWhere;
      if (!serviceName) {
        serviceName = null;
      } else {
        this.query.orderByFields = null;
      }
      this.queryTask.url = this.mapServiceQueryUrl(serviceName);     // this.mapServiceLayer.url + "/" + this.sublayerIDs[this.subLayerName];
    },

    customRestService_makeSql: function(selDDFields, groupDDFields) {
      let r = this.customRestService;
      if (r.outerSQL)
        r.sqlTemplate = r.outerSQL.replace("{innerSQL}",r.innerSQL);
      let selVars = r.selVars;
      if (!selVars)
        selVars = r.groupVars;
      let sql = r.sqlTemplate.replace(/{S}/g, selDDFields + selVars);
      sql = sql.replace(/{G}/g, groupDDFields + r.groupVars);
      return sql;
    },

    customRestServiceSQL: function(extent) {
      let r = this.customRestService;
      let selDDFields = "";
      let groupDDFields = "";
      let theWhere = r.baseWhere;
      if (this.dropDownInfo) {
        let D = this.dropDownInfo;
        for (let d=0; d<D.length; d++) {
          if (this.dropdownElements.includes(D[d].wrapperId)) {

            // If "showCol" was selected and the tab has changed to one that doesn't allow this option,
            //   then change SelectedOption to "All"
            if (D[d].SelectedOption==="showCol" && !this.extraColumns.includes(D[d].columnField)) {
              D[d].SelectedOption = "All";
            }

            if (D[d].SelectedOption !== "All") {
              if (D[d].groupField  && this.extraColumns.includes(D[d].groupField))
                groupDDFields += D[d].groupField + ",";
              if (D[d].SelectedOption === "showCol") {
                if (D[d].columnField) {
                  selDDFields += D[d].columnField + ",";
                  if (D[d].columnField !== D[d].groupField)
                    groupDDFields += D[d].columnField + ",";      // Adds columnField to the group/select list if it is different from groupField
                }
              } else {      // i.e. if a specific value has been selected
                let prefix = "";
                if (r.prefix && r.groupVars.split(",").includes(D[d].whereField))     // (Currently there are no widgets with "prefix" defined
                  prefix = r.prefix;
                theWhere = addToWhere(theWhere, whereFromDDInfo(D[d], prefix));
                //theWhere += whereFromDDInfo(D[d], prefix);
              }
            }
          }
        }
        //let selVars = selDDFields + groupVars;
        //let groupVars = groupDDFields + groupVars;
      }

      // set WHERE for subquery
      sql = this.customRestService_makeSql(selDDFields, groupDDFields);
      this.query.where = theWhere;      // Set query.where for ESRI Map Service display
      let downloadWhere = theWhere;     // The WHERE clause for doqnloading raw data
      if (theWhere !== "")
        theWhere = " WHERE " + theWhere;
      sql = sql.replace("{W}", theWhere);

      // For point features, filter spatially using extent
      // TODO: Make it work for non-point features?
      r.extent = null;
      let spatialWhere = "";
      if (this.clickableSymbolType === "point") {
        if (!extent)
          extent = view.extent;
        spatialWhere = "(S.Shape.STX>" + Math.floor(extent.xmin);
        spatialWhere += ") AND (S.Shape.STX<" + Math.ceil(extent.xmax);
        spatialWhere += ") AND (S.Shape.STY>" + Math.floor(extent.ymin);
        spatialWhere += ") AND (S.Shape.STY<" + Math.ceil(extent.ymax) + ")";
        sql += " WHERE " + spatialWhere;
        r.extent = extent;      // For raw download, used to get min & max lat/lon for header
      }
//      if (["polygon", "extent"].includes(this.clickableSymbolType))
//        spatialWhere = spatialWhere.replace(/.ST/g, ".STCentroid().ST");

      // Put together SQL for downloading associated raw data
      if (r.sqlTemplate_download) {
        downloadWhere = addToWhere(downloadWhere, spatialWhere);
        if (downloadWhere !== "")
          downloadWhere = " WHERE " + downloadWhere;
        r.downloadSql = r.sqlTemplate_download.replace("{F}", csvDownloadFields) + downloadWhere;     // For download of raw data
      }

      return {sql: sql, where: theWhere} ;
    },

    makeCustomRestQueryUrl: function(geomType, sql, dataType) {
      return this.customRestService.serviceUrl+ "?dataType=" + dataType + "&geomType=" + geomType + "&sql=" + sql;

    },

    runQuery: function(extent, queryPars, serviceName) {
      // run query, populate headerText panel if headerText is available
      queryComplete = false;
      if (this.headerText)
        getEl(this.draggablePanelId + "_headerText").innerText = this.headerText;
      let theWhere = "";
      updateNoFeaturesMsg(this.noFeaturesPanels, "querying");
      //this.setPanelVisibility([]);      // Hide table div, show message div  (empty array forces this)
      if (!this.customRestService) {          // using ArcGIS map service
        // If extent argument is supplied, set parameters for spatial query
        if (extent) {
          let padSide = extent.width/22;      // Shrink query extent to ensure that graphic points and markers are well within view
          let padTop = extent.width/35;      // Shrink query extent to ensure that graphic points and markers are well within view
          let padBottom = extent.width/16;      // Shrink query extent to ensure that graphic points and markers are well within view
          this.query.geometry = null;     // By default, no spatial filter unless there is a spatialRelationship defined
          if (this.query.spatialRelationship) {
            this.query.geometry = new Extent({
              spatialReference: extent.spatialReference,
              xmin: extent.xmin + padSide,
              xmax: extent.xmax - padSide,
              ymin: extent.ymin + padBottom,
              ymax: extent.ymax - padTop
            });
          };
          if (settings.showingExtentBox)
            mapStuff.showExtentBox(this.query.geometry);
        }
        this.setDynamicQueryPars(theWhere, queryPars, serviceName);
        //*JN*/  this.query.num = 1000;
        this.queryTask.execute(this.query).then(this.queryResponseHandler.bind(this), function(error) {
          this.queryPending = false;
          console.log(this.baseName + ":  QueryTask failed.");
        }.bind(this));
      } else {                                // using custom SQL Server REST service
        let urlInfo = this.customRestServiceSQL(extent);
        let geomType = "";
        if (this.clickableSymbolType && this.clickableSymbolType!=="point")
          geomType = "polygon";
        //let theUrl = this.customRestService.serviceUrl+ "?geomType=" + geomType + "&sql=" + urlInfo.sql;
        let theUrl = this.makeCustomRestQueryUrl(geomType, urlInfo.sql);
        queryServer(theUrl, false, this.queryResponseHandler.bind(this))     // returnJson=false -- service already returns JSON
        theWhere = urlInfo.where;
      }
      if (this.dropDownInfo)
        this.updateAllDropdowns(theWhere);
    },

    upDateDropdown: function(currDDinfo, where) {      // What if currDDinfo is null?
      let theWhere = this.query.where;
      if (where)
        theWhere = where;

      // Remove current dropdown from WHERE clause
      let A = theWhere.split(" AND ");
      for (let i=0; i<A.length; i++) {
        if (A[i].indexOf(currDDinfo.whereField) !== -1)
          A.splice(i,1);    // remove one item at position i
      }
      theWhere = A.join(" AND ");
      this.filterDropdown(currDDinfo, theWhere);
    },

    queryResponseHandler: function(results) {

//      if (this.currTab === "0")
//        results = '{"displayFieldName":"RegionCode","fieldAliases":{"RegionEnv":"RegionEnv","Region":"Region","Hauls":"Hauls","NumSpecies":"NumSpecies","Catch":"Catch","RegionID":"RegionID"},"geometryType":"esriGeometryPolygon","spatialReference":{"wkid":102100,"latestWkid":3857},"fields":[{"name":"RegionEnv","type":"esriFieldTypeString","alias":"RegionEnv","length":50},{"name":"Region","type":"esriFieldTypeString","alias":"Region","length":20},{"name":"Hauls","type":"esriFieldTypeInteger","alias":"Hauls"},{"name":"NumSpecies","type":"esriFieldTypeInteger","alias":"NumSpecies"},{"name":"Catch","type":"esriFieldTypeInteger","alias":"Catch"},{"name":"RegionID","type":"esriFieldTypeSmallInteger","alias":"RegionID"}],"features":[{"attributes":{"RegionEnv":"-20037508,6547174,-18356870,7282160","Region":"Aleutian Islands","Hauls":178,"NumSpecies":52,"Catch":97948,"RegionID":1},"geometry":{"rings":[[[-18357036.790899999,7259820.3264999986],[-18364682.421500001,6958869.5888999999],[-18885382.212400001,6752753.2346000001],[-19248056.438999999,6652471.4752999991],[-19896484.443700001,6565983.9717999995],[-19894700.519200001,6830488.9199000001],[-19335704.342999998,6943072.9547000006],[-18896522.478300001,7112315.4611999989],[-18362339.9098,7282160.9637999982],[-18362516.564300001,7281148.2529999986],[-18362394.2652,7279974.4931999967],[-18361504.198399998,7277893.3703999966],[-18360914.7839,7275333.9306999967],[-18360513.914299998,7271763.0979000032],[-18359645.929299999,7269685.6198000014],[-18357575.335099999,7267714.0254999995],[-18356984.222100001,7266914.5552999973],[-18356869.856899999,7266566.2003000006],[-18356984.610799998,7261928.3266000003],[-18357485.309300002,7260898.1079000011],[-18357419.0638,7259938.5648000017],[-18357036.790899999,7259820.3264999986]]]}},{"attributes":{"RegionEnv":"-17450927,9972913,-10393097,13407438","Region":"Beaufort Sea","Hauls":310,"NumSpecies":54,"Catch":38708,"RegionID":2},"geometry":{"rings":[[[-10060499.7312,10873432.796800002],[-10546684.6691,9788866.3967000023],[-11930441.8003,9739001.2748000026],[-14916114.899500001,10435913.470399998],[-17437942.712099999,11260027.750799999],[-17450519.983399998,11971393.275200002],[-17453004.044599999,13366688.888999999],[-10976522.666099999,13430638.030400001],[-10060499.7312,10873432.796800002]]]}},{"attributes":{"RegionEnv":"-20037508,6830488,-17452582,9991436","Region":"Bering Sea","Hauls":176,"NumSpecies":37,"Catch":47537,"RegionID":3},"geometry":{"rings":[[[-17833883.748100001,7509804.5373999998],[-17884724.205200002,7489926.6216999963],[-17979317.777899999,7506001.6084999964],[-18083529.084600002,7427387.2307000011],[-18110631.3345,7420006.9299999997],[-18129283.959399998,7393735.6273000017],[-18157919.679400001,7391896.6361000016],[-18170583.492199998,7388809.3549999967],[-18175941.315400001,7379681.2118000016],[-18167606.923700001,7351899.9061999992],[-18177348.214200001,7346816.0675000027],[-18191208.027400002,7338807.4127999991],[-18362339.9098,7282160.9637999982],[-18896522.478300001,7112315.4611999989],[-19335704.342999998,6943072.9547000006],[-19894700.519200001,6830488.9199000001],[-18971502.259,9856266.8584999964],[-18966270.5691,9858694.8225999996],[-18697188.449099999,9759837.318400003],[-17974971.894200001,9760225.7648999989],[-17738634.867600001,9540454.7773000002],[-17804796.3983,9245214.6520999968],[-18280194.165899999,8848113.4487000033],[-17438386.609299999,8222872.6286000013],[-17486842.842300002,7840147.329400003],[-17833883.748100001,7509804.5373999998]]]}},{"attributes":{"RegionEnv":"-17450927,9972913,-10393097,13407438","Region":"Chukchi Sea","Hauls":573,"NumSpecies":61,"Catch":101877,"RegionID":4},"geometry":{"rings":[[[-17450519.983399998,11971393.275200002],[-17437942.712099999,11260027.750799999],[-18340317.569800001,10565893.244900003],[-17687831.134199999,9989761.6049999967],[-17974971.894200001,9760225.7648999989],[-18697188.449099999,9759837.318400003],[-18708876.519900002,9762905.8277999982],[-18966270.5691,9858694.8225999996],[-19194103.0121,10149602.243500002],[-19194103.0121,11971421.753399998],[-17450519.983399998,11971393.275200002]]]}},{"attributes":{"RegionEnv":"-18364683,5344637,-13601695,8743554","Region":"Gulf of Alaska","Hauls":3906,"NumSpecies":157,"Catch":2516140,"RegionID":5},"geometry":{"rings":[[[-15028076.2224,8343326.627700001],[-14388546.934,7539984.3554000035],[-13531237.738499999,6244778.1952999979],[-13577980.742899999,5914390.1410000026],[-14706688.074200001,5344637.4122999981],[-14972724.6032,6336505.2906000018],[-15854379.862199999,7174539.2198999971],[-16331868.3891,7377064.8818000033],[-17251593.227600001,7347219.3492000028],[-18364682.421500001,6958869.5888999999],[-18355682.0823,7272985.4667999968],[-18362339.9098,7282160.9637999982],[-18191208.027400002,7338807.4127999991],[-18177348.214200001,7346816.0675000027],[-18167606.923700001,7351899.9061999992],[-18175941.315400001,7379681.2118000016],[-18170583.492199998,7388809.3549999967],[-18157919.679400001,7391896.6361000016],[-18129283.959399998,7393735.6273000017],[-18110631.3345,7420006.9299999997],[-18083529.084600002,7427387.2307000011],[-17979317.777899999,7506001.6084999964],[-17884724.205200002,7489926.6216999963],[-17833883.748100001,7509804.5373999998],[-17486842.842300002,7840147.329400003],[-17173792.595600002,8115985.6513999999],[-17237533.056299999,8234967.8445999995],[-16810471.969999999,8810756.6723000035],[-16252742.9394,8704522.5713],[-15028076.2224,8343326.627700001]]]}}]}';

      this.queryPending = false;
      if ((typeof results === "string") && (results.slice(0,6)==="ERROR:")) {
        // TODO:  Reset dropdown that caused the error
        updateNoFeaturesMsg([this], "")
        return;
      }
      if (this.customRestService)
        results = JSON.parse(results);
      if (results.features.length > maxSZFeatures) {
        updateNoFeaturesMsg(extentDependentWidgets, "toomany");
      } else {
        this.processResults(results);
      }
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
        if (g.geometry.rings) {   // If g.geometry.rings exists, then the data is for a Polygon
          // Recast g.geometry as Polygon
          let P = new Polygon({
            hasZ: false,
            hasM: false,
            rings: g.geometry.rings,
            spatialReference: { wkid: 3785 }
          });
          g.geometry = P;
        }
        let geom = g.geometry;
        if (g.geometry.type === "polyline")
          geom = g.geometry.extent;
        let centroid = g.geometry;

        let skipFeature = false;
      // If feature is not a point, use center of feature extent for "x" and "y" attributes
        if (g.geometry.type !== "point") {
            centroid = g.geometry.extent.center;
//          else
//            centroid = new Point({x: g.geometry.rings[0][0][0], y: g.geometry.rings[0][0][1]});


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


