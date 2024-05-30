/**
  deprecatedFunctions.js
      NOT ACTUALLY USED IN CODE
      These are functions that are no longer used, but could be "resurrected" in future!
      Arranged by the files they originally appeared in
 **/


/**  index.html   **/
/*
      function layoutBtnHandlerH2(evt) { changeLayout(this, "h2"); }
      function layoutBtnHandlerV2(evt) { changeLayout(this, "v2"); }
      function layoutBtnHandlerV3(evt) { changeLayout(this, "v3"); }

      on(dom.byId("btn_h2"), "click", layoutBtnHandlerH2.bind(outerBC));
      on(dom.byId("btn_v2"), "click", layoutBtnHandlerV2.bind(outerBC));
      on(dom.byId("btn_v3"), "click", layoutBtnHandlerV3.bind(outerBC));
*/


/**  allAppsData.js   **/
/*
function changeDialogSwatchColor(id) {
  let newColor = getEl('colorPicker').value;
  getEl('dialogSwatch' + id).style.backgroundColor = newColor;
}
*/


/**  GlobalVars.js   **/
/*

function htmlDecode(input) {
  //https://stackoverflow.com/questions/1912501/unescape-html-entities-in-javascript
  let doc = new DOMParser().parseFromString(input, "text/html");
  return doc.documentElement.textContent;
};

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

/*
function getProportionalInt(p, min, max) {
  // Return the value that is p% of the way between min and max, rounded to the nearest integer.
  return Math.round(min + (p / 100.0) * (max - min))
}
*/


/**  MapStuffWidget.js   **/
/*
  function sceneViewExtent(view, m) {
    //Might eventually use this function, if 3D option is added
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



/**  PhotoPlaybackWidget.js   **/
/*
  function photoPlayer() {
    // Manage timed playback of photos
    let wait_for_current_photo = false;
    console.log(photo_load_times_sort[photo_load_times_sort.length-1]);
    if (!latest_photo_loaded()) {
      console.log("photoPlayer: last photo did not load in time. Waiting.");
      wait_for_current_photo = true;
    }
    let current_photo_load_delay = photo_play_delay;
    console.log("photoPlayer: photo_play_delay=" + photo_play_delay + ", photo_load_average=" + photo_load_average + ", current_photo_load_delay="+current_photo_load_delay);
    return setTimeout(function() {
      if (this.sync_photos) return;
      if (this.counter === null) {
        if (next_photo_point !== null) {
            this.counter = next_photo_point["item"]
        } else {
            this.counter = 0;
        }
      }
      if (!wait_for_current_photo) {
          this.counter = this.counter + photo_play_direction;
//          if (this.counter < 0 || this.counter >= this.points_photos[last_photo_video_name].length) {
        if (this.counter < 0 || this.counter >= this.getFeatureCount()) {
          //clearTimeout(photo_play_timer);
          //photo_play_timer = false;
          this.counter = this.counter - photo_play_direction;
        }
        update_photo(this.getFeatureAttributes(this.counter));
      }
//      if (photo_play_timer)
//        photo_play_timer = photoPlayer();
    }, current_photo_load_delay);
  }
*/


/**  QueryBasedTablePanelWidget.js   **/
/*
    replaceNamesWithValues: function(template, attrs) {
      let a = template.split("@");
      for (let i=0; i<a.length; i++)
        if (a[i] in attrs) {
          a[i] = attrs[a[i]];
        }
      return a.join("");
    },

this.SetColumnWidths = function(columnWidths) {
  let firstRowId = this.displayDivName + "-row-0";
  let firstRow = getEl(firstRowId)
  let rowWidth = $(firstRow).width();
  let totalCellWidth = 0;
  let cells = firstRow.getElementsByClassName("dgrid-cell");
  for (let c=0; c<cells.length; c++) {
    totalCellWidth += $(cells[c]).width();
  }
};

this.makeTableFooterHtml = function() {
  let footerDivNode = getEl(this.footerDivName);
  this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
  footerDivNode.appendChild(this.footerWrapper);
};

*/



/**  VideoPanelWidget.js   **/
/*
  function measurePhotoDownloadTime() {
    let pWidget = this.syncTo;
    if (pWidget.last_photo_point["DATE_TIME"] = pWidget.beforeLast_photo_point["DATE_TIME"])
      return;
    let next_photo_percent = (pWidget.last_photo_point["MP4_Seconds"]-currentTime)/(pWidget.last_photo_point["DATE_TIME"]-pWidget.beforeLast_photo_point["DATE_TIME"])*1000;
    if (!pWidget.latest_photo_loaded() && next_photo_percent>0.3)
      setPlaybackRate(next_photo_percent);
    else
      setPlaybackRate(1);
  timeToNextPhoto = (pWidget.next_photo_point["DATE_TIME"] - pWidget.beforeLast_photo_point["DATE_TIME"])/1000;
    if (!pWidget.latest_photo_loaded()) {
      console.log("onVideoProgress: last photo did not load in time. ");
      //get_video()[0].playbackRate = 0.0;
    } else {
        get_video()[0].playbackRate = 1;
    }
  }
*/

