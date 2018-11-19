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
  var picasaOffline = false;
  var latest_img_src = false;
  var prev_photo_DT = 0;
  var next_photo_DT = 0;
  var secs_to_next_photo = null;
  var photo_play_delay = 1500;      // Wait time between photos, when in photo playback.  Set to -1 to require hitting playback buttons to advance individual photos?
//  var photo_play_timer = false;
  var photo_play_direction = 0;
  //var photo_cur_index = null;
  var photo_load_times = {};
  var photo_load_times_sort = [];
  var photo_load_average = null;		// photo_play_delay;
  var photo_enlarged = false;

  function photoLoadStartHandler() {
    //debug("photoLoadStartHandler");
  }

  function photoLoadCompleteHandler(orig_img_src) {
    //debug("photoLoadCompleteHandler");
  }

  function on_image_error(e) {
    // Called on image load error   param object e Event object
    if ( $("#photoImage").attr("src") == '')
      return;
    debug("on_image_error");
    //PHOTO_SERVER = alternateImageBaseDir;
    //update_photo(update_photo_latest_params);
    alert("No image found.");
    $("#photoImage").unbind('error');
    return true;
  }

  function on_image_load() {
    // Called on image load success   param object e Event object

    //debug("on_image_load");

    if (typeof photo_load_times[this.src] != "undefined") {

      photoLoadCompleteHandler(orig_img_src);

      photo_load_times[this.src]["load_end"] = Date.now();
      photo_load_times[this.src]["load_duration"] = photo_load_times[this.src]["load_end"] - photo_load_times[this.src]["load_start"];
      photo_load_times[this.src]["src"] = this.src;

    }

    /*
    photo_load_times_sort = $.map(photo_load_times, function(n){return n}).sort(function(a, b){return ((a["load_start"] < b["load_start"]) ? -1 : ((a["load_start"] > b["load_start"]) ? 1 : 0));});
    var photo_load_times_sort_durations = [photo_play_delay].concat($.map(photo_load_times_sort, function(n){return n.load_duration}));
    if (photo_load_times_sort_durations.length >= 5)
      photo_load_average = Math.round( photo_load_times_sort_durations.slice(photo_load_times_sort_durations.length-5).average() );
      */
    return true;
  }

  function on_image_abort() {
    // Called on image load cancel   param object e Event object
    //debug("on_image_abort");
  }

  function load_NOAA_Photo(new_img_src) {
    if (!justAK)
      return;
    setMessage_Mario("photoNoImageMessage", {"visible": true, "text": "Image not found on Picasa.  Trying the NOAA server...", "fade": 1000});
    latest_img_src = new_img_src;
    $("#photoImage").attr("src", latest_img_src);
  }

  function processPicasaData(response) {
    var data = JSON.parse(response);
    var s = data.feed.media$group.media$content[0].url;
    var p = s.lastIndexOf("/");
    var imageUrl = s.slice(0,p) + "/s{0}" + s.slice(p);
    origHeight = data.feed.gphoto$height.$t;      // Original height in pixels of image stored in Picasa
    origWidth = data.feed.gphoto$width.$t;        // Original width in pixels of image stored in Picasa

    photoAspectRatio = origWidth / origHeight;
    //let pDims = mediaDimensions("photoDiv", photoAspectRatio);
    var photoPanel = getEl("photoContainer");
    var requestWidth = $(photoPanel).width();   // This will be the requested width in pixels of the photo, for the panel
    var panelHeight = $(photoPanel).height();
    var widthFromAspect = parseInt(panelHeight*photoAspectRatio);
    if(requestWidth > widthFromAspect) {      // Given the panel height, widthFromAspect is the maximum allowable width
      requestWidth = widthFromAspect;         //   so reset requestWidth to widthFromAspect if it is greater
    }
    latest_img_src = imageUrl.replace("{0}", requestWidth);  // Set image URL to return image sized to the panel

    orig_img_src = imageUrl.replace("{0}",origWidth);     // For downloads, set image URL to return maximum resolution
    $("#photoImage").attr("src", latest_img_src);
    photo_load_times[latest_img_src] = {"load_start": Date.now()}
  }

  function load_Picasa_Photo(userID, albumID, photoID, NOAA_img_src) {
    if ((albumID==null) || (photoID==null)) {
      load_NOAA_Photo(NOAA_img_src);
      return;
    }

    var picasaURL = "https://picasaweb.google.com/data/feed/api/user/" + userID + "/albumid/" + albumID + "/photoid/" + photoID + "?alt=json";
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange=function() {
      if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
        processPicasaData(xmlhttp.responseText);
      }
      else if (xmlhttp.readyState == 4 && xmlhttp.status != 200)
        load_NOAA_Photo(NOAA_img_src);
    }
    xmlhttp.open("GET", picasaURL, true);
    xmlhttp.send();
  }

  function photoPlayer() {
    // Manage timed playback of photos
    var wait_for_current_photo = false;
    debug(photo_load_times_sort[photo_load_times_sort.length-1]);
    if (!latest_photo_loaded()) {
      debug("photoPlayer: last photo did not load in time. Waiting.");
      wait_for_current_photo = true;
    }
    var current_photo_load_delay = photo_play_delay;
    debug("photoPlayer: photo_play_delay=" + photo_play_delay + ", photo_load_average=" + photo_load_average + ", current_photo_load_delay="+current_photo_load_delay);
    return setTimeout(function() {
      if (sync_photos) return;
      if (this.counter == null) {
        if (next_photo_point != null) {
            this.counter = next_photo_point["item"]
        } else {
            this.counter = 0;
        }
      }
      if (!wait_for_current_photo) {
          this.counter = this.counter + photo_play_direction;
//          if (this.counter < 0 || this.counter >= szPhotoWidget.points_photos[last_photo_video_name].length) {
        if (this.counter < 0 || this.counter >= this.getClickableGraphicsCount()) {
          clearTimeout(photo_play_timer);
          photo_play_timer = false;
            this.counter = this.counter - photo_play_direction;
        }
        update_photo(this.getClickableGraphicAttributes(this.counter));
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
    return typeof photo_load_times[latest_img_src] != "undefined" && typeof photo_load_times[latest_img_src]["load_end"] != "undefined"
  },

  // Update photo from data point   param object next_photo_point Data point
    update_photo: function(next_photo_point) {
      update_photo_latest_params = next_photo_point;
      if (!next_photo_point)
        return;
      var new_img_src = PHOTO_SERVER + next_photo_point["RelPath"] + "/" + current_photo_sub + "/" + current_photo_prefix + next_photo_point["StillPhoto_FileName"];
      if (new_img_src.indexOf(".jpeg")<0 && new_img_src.indexOf(".jpg")<0)
        new_img_src += ".jpg";
      if (!latest_img_src || latest_img_src != new_img_src) {
        next_photo_DT = next_photo_point["DATE_TIME"]/1000;
        //secs_to_next_photo = next_photo_DT - prev_photo_DT;
        prev_photo_DT = next_photo_DT;
        load_Picasa_Photo(next_photo_point["Picasa_UserID"], next_photo_point["Picasa_AlbumID"], next_photo_point["Picasa_PhotoID"], new_img_src);
        photoLoadStartHandler();
        this.moveToFeature(next_photo_point);
      }
    },

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);
      
      //debug("PhotoPlaybackWidget created");

      photo_load_times = {}
      $("#photoImage").bind('load', on_image_load);
      $("#photoImage").bind('abort', on_image_abort);
      $("#photoImage").bind('error', on_image_error);


      var controlData_photo = [
        ['photo_resetBackwardButton', 'Reset to Beginning', 'w_expand.png', 'szPhotoWidget', 'toStart'],
        ['photo_backwardButton', 'Play Backwards', 'w_left.png', 'szPhotoWidget', 'playBackward'],
        ['photo_pauseButton', 'Pause', 'w_close_red.png', 'szPhotoWidget', 'pause'],
        ['photo_ForwardButton', 'Play Forwards', 'w_right.png', 'szPhotoWidget', 'playForward'],
        ['photo_resetForwardButton', 'Reset to End', 'w_collapse.png', 'szPhotoWidget', 'toEnd']
      ];

      var linkHTML = "&nbsp;&nbsp;<img id='linkImage' style='float: left' src='assets/images/link.png' width='24' height='24' onclick='linkImage_clickHandler()'/>"
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
        this.changeCurrentFeature(this.getClickableGraphicsCount()-1);
      };

      this.updateMedia = function(attrs) {
        this.update_photo(attrs);
      };

    }

  });
});

