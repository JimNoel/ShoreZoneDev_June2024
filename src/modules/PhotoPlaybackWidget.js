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
  //let picasaOffline = false;
  let latest_img_src = false;
  let latest_img_subPath = false;
  let photoSource1 = null;
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
      latest_img_subPath = this.photoResInsert + next_photo_point[this.fileNameField];
      if (this.relPathField)
        latest_img_subPath = next_photo_point[this.relPathField] + "/" + latest_img_subPath;
      if (latest_img_subPath.search(/.jpeg/i)<0 && latest_img_subPath.search(/.jpg/i)<0)    // TODO: Handle ".jpeg"
        latest_img_subPath += ".jpg";
      let photoServer = PHOTO_SERVER;     // TODO:  Will probably set this.photoServer for szPhotoWidget as well
      if (this.photoServer)
        photoServer = this.photoServer;
      let new_img_src = photoServer + latest_img_subPath;
      if (!latest_img_src || latest_img_src !== new_img_src) {
        photoSource1 = new_img_src;
        this.load_Photo(new_img_src);
        this.moveToFeature(next_photo_point);
      }
    },

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

      this.clickableSymbolGap = settings.photoGap;

      if (!this.photoResInsert)     // If not specified in the parameters, then set to blank string
        this.photoResInsert = "";

      this.photoImage = $("#" + this.photoImageId);

      photo_load_times = {}

      this.currNumber_SpanId = this.baseName + "_currNumber";
      this.photoCount_SpanId = this.baseName + "_photoCount";
      let photoCountHtml = "<span class='photoCount'>Photo ";
      photoCountHtml += "<span id='" + this.currNumber_SpanId + "'>0</span>";
      photoCountHtml += "<span id='" + this.photoCount_SpanId + "'></span>";
      photoCountHtml += "</span>";
      this.footerPanel.innerHTML = makeMediaPlaybackHtml(playbackControlTemplate, this.controlData, 'photoTools', 'position: relative; float: left', this.objName) + photoCountHtml;
      if (this.sync_photos) {
        let linkHTML = "&nbsp;&nbsp;<img id='linkImage' style='float: left' src='assets/images/link.png' width='24' height='24' onclick='linkImage_clickHandler()'/>";
        this.footerPanel.innerHTML = linkHTML + this.footerPanel.innerHTML;
      }

      setVisible(this.controlData[2][0], false);      // Hide the "pause" button

      this.on_image_error = function(e) {
        // Called on image load error   param object e Event object
        if ( this.photoImage.attr("src") === '')
          return;
        console.log("on_image_error");
        //PHOTO_SERVER = altMediaServer;
        //update_photo(update_photo_latest_params);
        if (e.target.src.includes(PHOTO_SERVER)) {    // Tried NOOA server and failed
          let new_img_src = altMediaServer + latest_img_subPath;
          this.load_Photo(new_img_src);
          //load_AOOS_Photo(update_photo_latest_params["Picasa_UserID"], update_photo_latest_params["Picasa_AlbumID"], update_photo_latest_params["Picasa_PhotoID"], "");
        } else {    // Tried AOOS, also failed
          setMessage(this.disabledMsgDivName, "Unable to find image.");
        }
        //this.photoImage.unbind('error');     // OBS: Was handling error only once, then switching to GINA server
        return true;
      }

      this.on_image_load = function() {
        // Called on image load success   param object e Event object

        if (typeof photo_load_times[this.src] !== "undefined") {

          //photoLoadCompleteHandler(orig_img_src);

          photo_load_times[this.src]["load_end"] = Date.now();
          photo_load_times[this.src]["load_duration"] = photo_load_times[this.src]["load_end"] - photo_load_times[this.src]["load_start"];
          photo_load_times[this.src]["src"] = this.src;
          //console.log("photo load time:  "  + photo_load_times[this.src]["load_duration"])
        }

        /*
        photo_load_times_sort = $.map(photo_load_times, function(n){return n}).sort(function(a, b){return ((a["load_start"] < b["load_start"]) ? -1 : ((a["load_start"] > b["load_start"]) ? 1 : 0));});
        let photo_load_times_sort_durations = [photo_play_delay].concat($.map(photo_load_times_sort, function(n){return n.load_duration}));
        if (photo_load_times_sort_durations.length >= 5)
          photo_load_average = Math.round( photo_load_times_sort_durations.slice(photo_load_times_sort_durations.length-5).average() );
          */
        return true;
      }

      this.on_image_abort = function() {
        // Called on image load cancel   param object e Event object
        //console.log("on_image_abort");
      }

      this.photoImage.bind('load', this.on_image_load);
      this.photoImage.bind('abort', this.on_image_abort);
      this.photoImage.bind('error', this.on_image_error);

      this.load_Photo = function(new_img_src) {
        latest_img_src = new_img_src;
        this.photoImage.attr("src", latest_img_src);
      }

      this.makeCaptions = function() {
        for (let p=0; p<this.features.length; p++) {
          let attrs = this.features[p].attributes;
          let caption = attrs[this.captionFields[0]];
          if (!caption)
            caption = "";
          for (let f=1; f<this.captionFields.length; f++) {
            let S = attrs[this.captionFields[f]];
            if (S)
              caption += ", " + S.replace(/@/g,";");     // because some items in DVB have "@" character
          }
          attrs.Caption = caption;
        }
      }

      this.processFeatures = function(features) {
        if (!this.noGeometry)
          this.makeClickableGraphics(this.features);
        getEl(this.photoCount_SpanId).innerHTML = "/" + this.features.length;
        //if (this.features.length <=1)
        let controlContainer = this.footerPanel.getElementsByClassName("playbackControlContainer")[0];
        setVisible(controlContainer, this.features.length>1);
        if (this.captionFields)
          this.makeCaptions();
        this.toStart();
      }


      this.toStart = function() {
        if (this.sync_photos)
          return;             // Not allowed if syncing with video
        this.changeCurrentFeature(0);
      };

      this.playBackward = function() {
        if (this.sync_photos)
          return;             // Not allowed if syncing with video
        this.playDir = -1;
        this.changeCurrentFeature(this.counter + this.playDir);
      };

      this.pause = function() {
        alert("Not implemented yet");
      };

      this.playForward = function() {
        if (this.sync_photos)
          return;             // Not allowed if syncing with video
        this.playDir = 1;
        this.changeCurrentFeature(this.counter + this.playDir);
      };

      this.toEnd = function() {
        if (this.sync_photos)
          return;             // Not allowed if syncing with video
        this.changeCurrentFeature(this.getFeatureCount()-1);
      };

      this.updateMedia = function(attrs) {
        this.update_photo(attrs);
      };

    }

  });
});

