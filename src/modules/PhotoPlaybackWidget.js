/**
 * Class PhotoPlaybackWidget
 *
 * Widget for photo playback
 *   subclass of QueryBasedPanelWidget
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
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, QueryBasedPanelWidget){

// private vars and functions here
  let picasaOffline = false;
  let latest_img_src = false;
  let photoSource1 = null;
  let photoSource2 = null;
  let prev_photo_DT = 0;
  let next_photo_DT = 0;
  let secs_to_next_photo = null;
  let photo_play_delay = 1500;      // Wait time between photos, when in photo playback.  Set to -1 to require hitting playback buttons to advance individual photos?
//  let photo_play_timer = false;
  let photo_play_direction = 0;
  //let photo_cur_index = null;
  let photo_load_times = {};
  let photo_load_times_sort = [];
  let photo_load_average = null;		// photo_play_delay;
  let photo_enlarged = false;

  function photoLoadStartHandler() {
    //console.log("photoLoadStartHandler");
  }

  function photoLoadCompleteHandler(orig_img_src) {
    //console.log("photoLoadCompleteHandler");
  }

  function on_image_error(e) {
    // Called on image load error   param object e Event object
    if ( $("#photoImage").attr("src") === '')
      return;
    console.log("on_image_error");
    //PHOTO_SERVER = alternateImageBaseDir;
    //update_photo(update_photo_latest_params);
    if (e.target.src.includes("alaskafisheries.noaa.gov")) {    // Tried NOOA server and failed
      load_AOOS_Photo(update_photo_latest_params["Picasa_UserID"], update_photo_latest_params["Picasa_AlbumID"], update_photo_latest_params["Picasa_PhotoID"], "");
    } else {    // Tried AOOS, also failed
      setMessage("photoNoImageMessage", "Unable to find image.");
    }
    //$("#photoImage").unbind('error');     // OBS: Was handling error only once, then switching to GINA server
    return true;
  }

  function on_image_load() {
    // Called on image load success   param object e Event object

    if (typeof photo_load_times[this.src] !== "undefined") {

      photoLoadCompleteHandler(orig_img_src);

      photo_load_times[this.src]["load_end"] = Date.now();
      photo_load_times[this.src]["load_duration"] = photo_load_times[this.src]["load_end"] - photo_load_times[this.src]["load_start"];
      photo_load_times[this.src]["src"] = this.src;

    }

    /*
    photo_load_times_sort = $.map(photo_load_times, function(n){return n}).sort(function(a, b){return ((a["load_start"] < b["load_start"]) ? -1 : ((a["load_start"] > b["load_start"]) ? 1 : 0));});
    let photo_load_times_sort_durations = [photo_play_delay].concat($.map(photo_load_times_sort, function(n){return n.load_duration}));
    if (photo_load_times_sort_durations.length >= 5)
      photo_load_average = Math.round( photo_load_times_sort_durations.slice(photo_load_times_sort_durations.length-5).average() );
      */
    return true;
  }

  function on_image_abort() {
    // Called on image load cancel   param object e Event object
    //console.log("on_image_abort");
  }

  function load_Photo(new_img_src) {
    latest_img_src = new_img_src;
    $("#photoImage").attr("src", latest_img_src);
  }

  function load_NOAA_Photo(new_img_src) {
/*    // Normally, photos from NOAA server are not available from the national site
    if (!justAK)
      return;
*/
    //setMessage("photoNoImageMessage",  "Image not found on Picasa.  Trying the NOAA server...", true, 1000);    // For now, trying from NOAA server first
    latest_img_src = new_img_src;
    $("#photoImage").attr("src", latest_img_src);
  }

  function load_AOOS_Photo(userID, albumID, photoID, NOAA_img_src) {
    if ((albumID===null) || (photoID===null)) {
      //load_NOAA_Photo(NOAA_img_src);      // Currently trying NOAA first, then AOOS.
      return;
    }
    let aoosURL = aoosPhotosBaseUrl + userID + "/" + albumID + "/" + photoID + "/thumbnail";     // photo
    load_Photo(aoosURL);
  }

  function make_PhotoUrl_NOAA(pt) {
/*  // Normally, photos from NOAA server are not available from the national site
        if (!justAK)
          return null;
*/
    if ((pt.userID===null) || (pt.albumID===null) || (pt.photoID===null))
      return null;
    else
      return (aoosPhotosBaseUrl + pt.userID + "/" + pt.albumID + "/" + pt.photoID + "/thumbnail");     // photo
  }

  function make_PhotoUrl_AOOS(pt) {
    if ((pt.userID===null) || (pt.albumID===null) || (pt.photoID===null))
      return null;
    else
      return (aoosPhotosBaseUrl + pt.userID + "/" + pt.albumID + "/" + pt.photoID + "/thumbnail");     // photo
  }

/*
  function preload_AOOS_Photo(photoPoint, NOAA_img_src) {
    if ((photoPoint.LAT_DDEG===null) || (photoPoint.LON_DDEG===null)) {
      load_NOAA_Photo(NOAA_img_src);
      return;
    }
    let queryURL = aoosQueryBaseUrl.replace("{lon}",photoPoint.LON_DDEG).replace("{lat}",photoPoint.LAT_DDEG);
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange=function() {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        processAoosData(xmlhttp.responseText);
      }
      else if (xmlhttp.readyState === 4 && xmlhttp.status !== 200) {
        console.log("status = " + xmlhttp.status);
        load_NOAA_Photo(NOAA_img_src);
      }
    }
    xmlhttp.open("GET", queryURL, true);
    xmlhttp.send();
  }

  function processAoosData(response) {
    let data = JSON.parse(response);
    let s = data.feed.media$group.media$content[0].url;
    let p = s.lastIndexOf("/");
    let imageUrl = s.slice(0,p) + "/s{0}" + s.slice(p);
    origHeight = data.feed.gphoto$height.$t;      // Original height in pixels of image stored in Picasa
    origWidth = data.feed.gphoto$width.$t;        // Original width in pixels of image stored in Picasa

    photoAspectRatio = origWidth / origHeight;
    //let pDims = mediaDimensions("photoDiv", photoAspectRatio);
    let photoPanel = getEl("photoContainer");
    let requestWidth = $(photoPanel).width();   // This will be the requested width in pixels of the photo, for the panel
    let panelHeight = $(photoPanel).height();
    let widthFromAspect = parseInt(panelHeight*photoAspectRatio);
    if(requestWidth > widthFromAspect) {      // Given the panel height, widthFromAspect is the maximum allowable width
      requestWidth = widthFromAspect;         //   so reset requestWidth to widthFromAspect if it is greater
    }
    latest_img_src = imageUrl.replace("{0}", requestWidth);  // Set image URL to return image sized to the panel

    orig_img_src = imageUrl.replace("{0}",origWidth);     // For downloads, set image URL to return maximum resolution
    $("#photoImage").attr("src", latest_img_src);
    photo_load_times[latest_img_src] = {"load_start": Date.now()}
  }
*/


/*
  // Picasa API has been deprecated
  function preload_Picasa_Photo(userID, albumID, photoID, NOAA_img_src) {
    let picasaDeprecated = false;
    if ((albumID===null) || (photoID===null) || picasaDeprecated) {
      load_NOAA_Photo(NOAA_img_src);
      return;
    }
    let picasaURL = "https://picasaweb.google.com/data/feed/api/user/" + userID + "/albumid/" + albumID + "/photoid/" + photoID + "?alt=json&deprecation-extension=true";
    let xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange=function() {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
        processPicasaData(xmlhttp.responseText);
      }
      else if (xmlhttp.readyState === 4 && xmlhttp.status !== 200)
        load_NOAA_Photo(NOAA_img_src);
    }
    xmlhttp.open("GET", picasaURL, true);
    xmlhttp.send();
  }

  function processPicasaData(response) {
    let data = JSON.parse(response);
    let s = data.feed.media$group.media$content[0].url;
    let p = s.lastIndexOf("/");
    let imageUrl = s.slice(0,p) + "/s{0}" + s.slice(p);
    origHeight = data.feed.gphoto$height.$t;      // Original height in pixels of image stored in Picasa
    origWidth = data.feed.gphoto$width.$t;        // Original width in pixels of image stored in Picasa

    photoAspectRatio = origWidth / origHeight;
    //let pDims = mediaDimensions("photoDiv", photoAspectRatio);
    let photoPanel = getEl("photoContainer");
    let requestWidth = $(photoPanel).width();   // This will be the requested width in pixels of the photo, for the panel
    let panelHeight = $(photoPanel).height();
    let widthFromAspect = parseInt(panelHeight*photoAspectRatio);
    if(requestWidth > widthFromAspect) {      // Given the panel height, widthFromAspect is the maximum allowable width
      requestWidth = widthFromAspect;         //   so reset requestWidth to widthFromAspect if it is greater
    }
    latest_img_src = imageUrl.replace("{0}", requestWidth);  // Set image URL to return image sized to the panel

    orig_img_src = imageUrl.replace("{0}",origWidth);     // For downloads, set image URL to return maximum resolution
    $("#photoImage").attr("src", latest_img_src);
    photo_load_times[latest_img_src] = {"load_start": Date.now()}
  }
*/

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
      if (sync_photos) return;
      if (this.counter === null) {
        if (next_photo_point !== null) {
            this.counter = next_photo_point["item"]
        } else {
            this.counter = 0;
        }
      }
      if (!wait_for_current_photo) {
          this.counter = this.counter + photo_play_direction;
//          if (this.counter < 0 || this.counter >= szPhotoWidget.points_photos[last_photo_video_name].length) {
        if (this.counter < 0 || this.counter >= this.getFeatureCount()) {
          clearTimeout(photo_play_timer);
          photo_play_timer = false;
            this.counter = this.counter - photo_play_direction;
        }
        update_photo(this.getFeatureAttributes(this.counter));
      }
      if (photo_play_timer)
        photo_play_timer = photoPlayer();
    }, current_photo_load_delay);
  }


  return declare(QueryBasedPanelWidget, {
    // Arrays and Objects defined here are common to all instances
    // Simple types are per-instance
    perInstanceNum: 3,      // not used -- for illustration of syntax
    commonArr: [1 ,2, 3],   // not used -- for illustration of syntax

    photo_play_timer: false,
    curr_photo_point: null,
    next_photo_point: null,
    beforeLast_photo_point: null,     // used in measurement of image load time
    last_photo_point: null,
    szPhotosVisible: true,

    // Check if latest images was loaded successfully   return bool success
    latest_photo_loaded: function() {
    return typeof photo_load_times[latest_img_src] !== "undefined" && typeof photo_load_times[latest_img_src]["load_end"] !== "undefined"
  },

  // Update photo from data point   param object next_photo_point Data point
    update_photo: function(next_photo_point) {
      update_photo_latest_params = next_photo_point;
      if (!next_photo_point)
        return;
      let new_img_src = PHOTO_SERVER + next_photo_point["RelPath"] + "/" + current_photo_sub + "/" + current_photo_prefix + next_photo_point["StillPhoto_FileName"];
      if (new_img_src.indexOf(".jpeg")<0 && new_img_src.indexOf(".jpg")<0)
        new_img_src += ".jpg";
      if (!latest_img_src || latest_img_src !== new_img_src) {
        next_photo_DT = next_photo_point["DATE_TIME"]/1000;
        //secs_to_next_photo = next_photo_DT - prev_photo_DT;
        prev_photo_DT = next_photo_DT;
        photoSource1 = new_img_src;
        photoSource2 = make_PhotoUrl_AOOS(next_photo_point);
        load_NOAA_Photo(new_img_src);
        //load_AOOS_Photo(next_photo_point["Picasa_UserID"], next_photo_point["Picasa_AlbumID"], next_photo_point["Picasa_PhotoID"], new_img_src);
        //photoLoadStartHandler();
        this.moveToFeature(next_photo_point);
      }
    },

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

      this.clickableSymbolGap = settings.photoGap;
      
      photo_load_times = {}
      $("#photoImage").bind('load', on_image_load);
      $("#photoImage").bind('abort', on_image_abort);
      $("#photoImage").bind('error', on_image_error);


      let controlData_photo = [
        ['photo_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'szPhotoWidget', 'toStart'],
        ['photo_backwardButton', 'Play Backwards', 'w_left.png', 'szPhotoWidget', 'playBackward'],
        ['photo_pauseButton', 'Pause', 'w_close_red.png', 'szPhotoWidget', 'pause'],
        ['photo_ForwardButton', 'Play Forwards', 'w_right.png', 'szPhotoWidget', 'playForward'],
        ['photo_resetForwardButton', 'Reset to End', 'w_collapse.png', 'szPhotoWidget', 'toEnd']
      ];

      let linkHTML = "&nbsp;&nbsp;<img id='linkImage' style='float: left' src='assets/images/link.png' width='24' height='24' onclick='linkImage_clickHandler()'/>"
      photoToolsDiv.innerHTML = linkHTML + makeMediaPlaybackHtml(playbackControlTemplate, controlData_photo, 'photoTools', 'position: relative; float: left');
      //getEl('photoTools').style.position = "relative";
      //getEl('photoTools').style.float = "left";

      setVisible("photo_pauseButton", false);

      this.processData = function(results) {
      };

      this.toStart = function() {
        if (sync_photos)
          return;             // Not allowed if syncing with video
        this.changeCurrentFeature(0);
      };

      this.playBackward = function() {
        if (sync_photos)
          return;             // Not allowed if syncing with video
        this.playDir = -1;
        this.changeCurrentFeature(this.counter + this.playDir);
      };

      this.pause = function() {
        alert("Not implemented yet");
      };

      this.playForward = function() {
        if (sync_photos)
          return;             // Not allowed if syncing with video
        this.playDir = 1;
        this.changeCurrentFeature(this.counter + this.playDir);
      };

      this.toEnd = function() {
        if (sync_photos)
          return;             // Not allowed if syncing with video
        this.changeCurrentFeature(this.getFeatureCount()-1);
      };

      this.updateMedia = function(attrs) {
        this.update_photo(attrs);
      };

    }

  });
});

