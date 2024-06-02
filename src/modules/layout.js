/**
 * Class layout
 *
 * Sets up the layout for the page
*/


define([
      "dojo/on",
      "dojo/dom",
      "dijit/registry",
      "dijit/layout/BorderContainer",
      "dijit/layout/ContentPane",
      "dijit/layout/TabContainer",
      "noaa/noaaExpandoPane",
      "dojox/layout/FloatingPane",
      "noaa/MapStuffWidget",
      "dojo/domReady!"
    ], function(on, dom, registry, BorderContainer, ContentPane, TabContainer, ExpandoPane, FloatingPane, MapStuffWidget){


      let regions = {
        l: {name: "left", dim: "width"},
        r: {name: "right", dim: "width"},
        t: {name: "top", dim: "height"},
        b: {name: "bottom", dim: "height"}
      };

      let containers = {
        BC: BorderContainer,
        CP: ContentPane,
        TC: TabContainer,
        EP: ExpandoPane
      };

      let layouts = {};     //new Object();     // Define the layout options
      layouts["v2"] = {
        id: "layoutV2",
        //buildOrder: ["root", "mvp", "m", "vp", "v", "p", "qt", "q", "t"],
        // In the following:
        //   1st item is name of parent container
        //   2nd is position and width/height of panel (w/h not required if position is "c" [center])
        //   3rd is type of container, and layout where required
        root:  [null,   "c",       "BC:v"],
          mvp:   ["root", "c",  "BC:h"],      // set width of map and media panels in pixels, query/table panels get remainder    min. 600px to display map correctly
            m:     ["mvp",  "c",  "CP", {id: "mapDiv"}],
            vp:    ["mvp",  "b:30%",  "BC:v", {id: "mediaBC"}],    // set video/photo height in pixels, map gets remainder
              szVP:   ["vp", "c", "BC:h", {id: "szMediaBC", class: "sz"}],
                szV:      ["szVP",  "l:50%",  "CP", {id: "videoDiv", class: "mediaPanelDiv"}],      // video gets half the vp width, photo gets the other half  NOTE: 50% not giving accurate result, so using 45% for now
                szP:      ["szVP",  "c",      "CP", {id: "photoDiv", class: "mediaPanelDiv"}],
              ssCP:   ["vp", "c", "BC:h", {id: "ssMediaBC", class: "ss"}],
                ssC:      ["ssCP",  "l:50%", "CP", {id: "ssChartsDiv", class: "mediaPanelDiv"}],
                ssP:      ["ssCP",  "c", "CP", {id: "ssPhotosDiv", class: "mediaPanelDiv"}],
              faCP:   ["vp", "c", "BC:h", {id: "faMediaBC", class: "fa"}],
                //faC:      ["faCP",  "l:50%", "CP", {id: "faChartsDiv", class: "mediaPanelDiv"}],
                faP:      ["faCP",  "c", "CP", {id: "faPhotosDiv", class: "mediaPanelDiv"}],
          qtEP:    ["root", "r:50%",  "EP:Table/Query", {id: "tableQueryExpando"}],    // ExpandoPanel region can be top, bottom, left or right, but not center?
            qt:    ["qtEP", "c",        "BC:h"],
              //q:  ["qt",  "t:200px",    "CP"],        // set query panel height
              t:  ["qt",  "c",    "BC:h", {id: "tableDiv"}],
                szT:      ["t",  "c", "CP", {id: "unitsDiv", class: "tablePanelDiv sz"}],
                ssT:      ["t",  "c", "CP", {id: "ssDiv", class: "tablePanelDiv ss"}],
                faT:      ["t",  "c", "CP", {id: "faDiv", class: "tablePanelDiv fa"}]
      };
      layouts["h2"] = {
        id: "layoutH2",
        root:  [null,   "c",       "BC:h", {id: "rootBC"}],
            mvp:   ["root", "c",  "BC:v", {id: "mapMediaBC"}],      // set width of map and media panels in pixels, query/table panels get remainder
              m:     ["mvp",  "c",  "CP", {id: "mapDiv"}],
              vp:    ["mvp",  "r:500px",  "BC:h", {id: "mediaBC"}],    // set video/photo height in pixels, map gets remainder
                szVP:   ["vp", "c", "BC:h", {id: "szMediaBC", class: "sz"}],
                  szV:      ["szVP",  "c",     "CP", {id: "videoDiv", class: "mediaPanelDiv"}],  // video gets half the vp width, photo gets the other half  NOTE: 50% not giving accurate result, so using 45% for now
                  szP:      ["szVP",  "b:50%", "CP", {id: "photoDiv", class: "mediaPanelDiv"}],
                ssCP:   ["vp", "c", "BC:h", {id: "ssMediaBC", class: "ss"}],
                  ssC:      ["ssCP",  "c", "CP", {id: "ssChartsDiv", class: "mediaPanelDiv"}],
                  ssP:      ["ssCP",  "b:50%", "CP", {id: "ssPhotosDiv", class: "mediaPanelDiv"}],
                faCP:   ["vp", "c", "BC:h", {id: "faMediaBC", class: "fa"}],
                  //faC:      ["faCP",  "c", "CP", {id: "faChartsDiv", class: "mediaPanelDiv"}],
                  faP:      ["faCP",  "b:100%", "CP", {id: "faPhotosDiv", class: "mediaPanelDiv"}],
            qtEP:    ["root", "b:250px",  "EP:", {id: "tableQueryExpando"}],    // ExpandoPanel region can be top, bottom, left or right, but not center?
              qt:       ["qtEP", "c",   "BC:v"],
                //q:  ["qt",  "l:200px",    "CP"],        // set query panel height
                t:  ["qt",  "c",    "BC:h", {id: "tableDiv"}],
                  szT:      ["t",  "c", "CP", {id: "unitsDiv", class: "tablePanelDiv sz"}],
                  ssT:      ["t",  "c", "CP", {id: "ssDiv", class: "tablePanelDiv ss"}],
                  faT:      ["t",  "c", "CP", {id: "faDiv", class: "tablePanelDiv fa"}]
      };
      layouts["v3"] = {
        id: "layoutV3",
        //buildOrder: ["root", "m", "vp", "v", "p", "qt", "q", "t"],
        root:  [null,   "c",       "BC:v"],
          m:     ["root",  "l:800px",  "CP", {id: "mapDiv"}],
          vp:    ["root",  "c",  "BC:h", {id: "mediaBC"}],    // set video/photo height in pixels, map gets remainder
            szVP:   ["vp", "c", "BC:h", {id: "szMediaBC", class: "sz"}],
              szV:      ["szVP",  "t:45%",  "CP", {id: "videoDiv", class: "mediaPanelDiv"}],      // video gets half the vp width, photo gets the other half  NOTE: 50% not giving accurate result, so using 45% for now
              szP:      ["szVP",  "c",      "CP", {id: "photoDiv", class: "mediaPanelDiv"}],
            ssCP:   ["vp", "c", "BC:h", {id: "ssMediaBC", class: "ss"}],
              ssC:      ["ssCP",  "t:45%", "CP", {id: "ssChartsDiv", class: "mediaPanelDiv"}],
              ssP:      ["ssCP",  "c", "CP", {id: "ssPhotosDiv", class: "mediaPanelDiv"}],
            faCP:   ["vp", "c", "BC:h", {id: "faMediaBC", class: "fa"}],
              //faC:      ["faCP",  "t:45%", "CP", {id: "faChartsDiv", class: "mediaPanelDiv"}],
              faP:      ["faCP",  "c", "CP", {id: "faPhotosDiv", class: "mediaPanelDiv"}],
          qtEP:    ["root", "r:300px",  "EP:Table/Query", {id: "tableQueryExpando"}],    // ExpandoPanel region can be top, bottom, left or right, but not center?
            qt:    ["qtEP", "c",        "BC:h"],
              //q:  ["qt",  "t:200px",    "CP"],        // set query panel height
              t:  ["qt",  "c",    "BC:h", {id: "tableDiv"}],
                szT:      ["t",  "c", "CP", {id: "unitsDiv", class: "tablePanelDiv sz"}],
                ssT:      ["t",  "c", "CP", {id: "ssDiv", class: "tablePanelDiv ss"}],
                faT:      ["t",  "c", "CP", {id: "faDiv", class: "tablePanelDiv fa"}]
      };

      let splitterInfo = [];    // To hold info used in accessing splitters, to handle drag events

      function makeContainer(layoutInfo, info, id) {
        let regionVal = "center";
        let dimStr = "padding :0; ";
        let parentId = info[0];
        let locInfo = info[1];
        let typeInfo = info[2];
        let addlProps = {};
        if (info.length > 3)
          addlProps = info[3];
        if (locInfo !== "c") {
          let a = locInfo.split(":");
          if (a.length > 1) {
            regionVal = regions[a[0]].name;
            dimStr += regions[a[0]].dim + ":" + a[1] + ";";
          }
        }
        let bcArgs = {
          region: regionVal,
          splitter: true,
          style: dimStr,
          id: addlProps.id,
          class: addlProps.class
        };
        let b = typeInfo.split(":");
        let contCode = b[0];
        let container = containers[contCode];
        if (contCode === "CP") {
        }
        else if (contCode === "EP") {
          if ((id === "qtEP") && (initExpandoCollapsed))
            bcArgs.startExpanded = false;
          //console.log("ExpandoPane: " + id);
        }
        else if (contCode === "BC") {
          let orient = b[1];
          let designVal = "headline";
          if (orient === "v")
            designVal = "sidebar";
          bcArgs.liveSplitters = true;
          bcArgs.design = designVal;
        }
        info.layoutElement = new container(bcArgs);
        customizeContainerHtml(info, b[1]);
        if (parentId) {
          let parentEl = layoutInfo[parentId].layoutElement;
          parentEl.addChild(info.layoutElement);
          if (bcArgs.region !== "center")
            splitterInfo.push({id: parentEl.id, region: bcArgs.region})
        }

      }

      function buildLayout(layoutInfo) {
        splitterInfo = [];
        // If these are not built in the correct order, then will have to add buildOrder to object, and use that
        for (let el in layoutInfo)
          if (el !== "id") {
            let id = el;
            let info = layoutInfo[id];
            makeContainer(layoutInfo, info, id);
          }
        return layoutInfo.root.layoutElement;
      }

      function customizeContainerHtml(info, header) {
        let container = info.layoutElement;
        if (container.baseClass === "dijitExpandoPane") {
          if (!header)
            return;
          let iconNode = container.domNode.getElementsByClassName("dojoxExpandoIcon")[0];
          let customClassName = "noaaExpandoTitle";
          let region = container.region;
          if (region==="left" || region==="right") {
            let regionClassName = "noaaExpandoIcon" + region.charAt(0).toUpperCase() + region.slice(1);
            iconNode.className = "noaaExpandoIconVertical " + regionClassName;
            customClassName = "noaaExpandoTitleVertical";
          }
          let id = info[3].id + "_Title";
          iconNode.innerHTML += '<div id="' + id + '" class="' + customClassName + '">' + header + '</div>';
        }
      }

      function addContent(contentPaneId, content) {
        dom.byId(contentPaneId).innerHTML += content;
      }


      function buildOuterBC(layoutCode) {
        outerBC.addChild(bannerBC);
        currLayout = buildLayout(layouts[layoutCode]);
        outerBC.addChild(currLayout);

/*
        makeDraggablePanel("mapLayerListDiv", "Layer List");
        setDisplay("mapLayerListDiv", true);
*/
        makeDraggablePanel("faSpTableDiv", "Fish Catch");
        makeDraggablePanel("ssSpTableDiv", "Species Data");

      }

      function changeLayout(parentBC, layoutCode) {
        // TODO:  Figure out how to do this and preserve current content
        //let tempBC = new BorderContainer();
        //let mapDivCP = dom.byId("mapDiv");
        //mapDivCP.placeAt(tempBC);
        parentBC.removeChild(currLayout);
        currLayout.destroyDescendants();
        currLayout = buildLayout(layouts[layoutCode]);
        parentBC.addChild(currLayout);
        //setPanelsContent();
        //document.getElementById("mapDiv").outerHTML = mapDivHtml;
      }

      function setPanelsContent() {
        //addContent('mapDiv', '<span id="mapMargin_top" class="mapMarginHoriz" style="top:0;left:0; height: 20px" ></span>');
        addContent('mapDiv', '<span id="coordinates" ></span>');
      }

      // Tabs for ShoreZone/FishAtlas/ShoreStation
      let szTab = new ContentPane({id: "szTab", title: "ShoreZone"}),
          faTab = new ContentPane({id: "faTab", title: "Fish Atlas"}),
          ssTab = new ContentPane({id: "ssTab", title: "Shore Station"});
          //szUnitsTab = new ContentPane({id: "szUnitsTab", title: "SZ 3D Units demo"});

      //let logoCP = new ContentPane({id: "logoPane", region: "left", content: "<img src='assets/images/noaa.png' height='25px' width='25px'>", style: "width: 25px; height: 25px; padding: 0"});

      stateNavigator = new TabContainer({id: "stateNavigator", region: "center", class: "stateTabStyle"});    // width set to fit text in tabs
        stateNavigator.addChild( szTab );
        stateNavigator.addChild( faTab );
        stateNavigator.addChild( ssTab );
        //stateNavigator.addChild( szUnitsTab );

      let linksCP = new ContentPane({id: "linksPane", region: "right", content: noaaLinksContent, style: "right: 10px; width: 750px;"});

      let bannerBC = new BorderContainer({id: "bannerDiv", region: "top", style: "height: 35px"});
      //bannerBC.addChild(logoCP);
      bannerBC.addChild(stateNavigator);
      bannerBC.addChild(linksCP);

      let outerBC = new BorderContainer({id: "outerBC", gutters: false, style: "border-style: solid;", design: "headline"});
      let currLayout = null;
      buildOuterBC(layoutCode);
      document.body.appendChild(outerBC.domNode);
      setPanelsContent();

      outerBC.startup();

      //adjustDojoLayoutDivs();     // Make some positioning adjustments that can't be done via CSS or Dojo props.  NOTE:  This has to happen after outerBC.startup()

/*
          Note that the argument for "getSplitter" will vary dependent on layout.
          "splitterDragHandler" will call function to change YouTube and IMG dimensions.
          This function will also be used by PhotoPlaybackWidget.processPicasaData to determine requested image width
            (Move some of the code used in processPicasaData for this purpose to the new function.)
*/
      splitterInfo.forEach(function(item) {
        let lSplitter = dijit.registry.byId(item.id).getSplitter(item.region);
        lSplitter.on("mouseover", splitterDragHandler);
      });

      function splitterDragHandler(e) {
        if (e.buttons === 1) {
          panelResizeHandler();
        }
      }

      mapStuff = new MapStuffWidget();

      makeClassArrayVisibilityObject(siteTabs);
      let SZ3dUnitsSiteURL = "https://alaskafisheries.noaa.gov/mapping/jstest/szunits3d.html";

//      makeDownloadPanel();

      stateNavigator.watch("selectedChildWidget", function(name, oval, nval){
        changeState(nval.id);
      });

      // Switch between ShoreZone/FishAtlas/ShoreStation states
      function changeState(tabID) {
        view.closePopup();
        // 3D units demo site
        if (tabID === "szUnitsTab") {
          if (confirm("Open the ShoreZone 3D Units demo site?"))
            window.open(SZ3dUnitsSiteURL);
          return;
        }
/*
        if (tabID === "faTab" && !fa2020msgShown) {
          alert("Thank you for visiting the Nearshore Fish Atlas website.  The site is currently undergoing extensive upgrades in data availability and functionality.  While still operational, only a limited number of features are enabled at this time.  Thanks for your patience as we work towards bringing new content to you in the spring of 2022.");
          fa2020msgShown = true;
        }
*/
        let className = tabID.slice(0,2);
        switchTo(className);
      }

      function switchTo(className) {
        if (!siteTabs[className].widgets)
          return;
        setVisible(showUnitsDiv, className==="sz");
        siteTabs.promoteClass(className);
        let widgets = siteTabs[className].widgets;
        for (i in widgets) {
          let disabledMsg = getEl(widgets[i].disabledMsgName).innerHTML;
          showEnabledDisabled(widgets[i].baseName, disabledMsg==="");
/*
          //widgets[i].setDefaultDisabledMsg();
          if (widgets[i].disabledMsgInfix)      // Hide panel if it uses a "disabled" message
            showEnabledDisabled(widgets[i].baseName, false);
*/
          // For widgets with tabs (FA & SS tables), start at the first tab (Regions)
          if (widgets[i].tabInfo && !widgets[i].grid)
            widgets[i].setActiveTab(widgets[i].currTab);
        }
        setGraphicsLayersVisibilities(className);
        dijit.byId(className + "MediaBC").resize();   // This is needed to handle "disappearing photo panel" issue
        llExpand.expanded = (className === "sz");
      }

      function setGraphicsLayersVisibilities(className) {
        let classNames = siteTabs.tabs;
        for (i in classNames) {
          let isVisible = (classNames[i] === className);
          let widgets = siteTabs[classNames[i]].widgets;
          for (j in widgets) {
            let w = widgets[j];
              setLayerVisibility(w.mapServiceLayer, isVisible);

              // Go back to initial clickableLayer visibility
              let cVisibility = isVisible;
              if (w.hideMarkersAtStart)
                cVisibility = false;
              setLayerVisibility(w.clickableLayer, cVisibility);

              setLayerVisibility(w.highlightLayer, isVisible);
              setLayerVisibility(w.trackingLayer, isVisible);
          }
        }
      }

      function setLayerVisibility(layer, isVisible) {
        if (!layer)
          return;
        layer.visible = isVisible;
      }



    });

