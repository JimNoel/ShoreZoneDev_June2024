/**
 * Class VideoPanelWidget
 *
 * Widget for video/photo playback
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
  "noaa/QueryBasedPanelWidget",
  "noaa/PhotoPlaybackWidget"
], function(declare, lang, QueryBasedPanelWidget, PhotoPlaybackWidget){

  // private vars and functions here

  let last_video_name = null;
  let startPointData;
  let latest_startPointData;
  let cur_vid_pt = null;
  let nxt_vid_pt = null;
  let videos = false;
  let video_message_timeout = false;


/*    // Currently unused
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

  function onVideoProgress(e) {

    try {
      let currentTime = e.target.currentTime
      let duration = e.target.duration
      let current_progress = currentTime/duration

      //#### PHOTOS ####

      let vWidget = e.w;
      let pWidget = vWidget.syncTo;
      if (pWidget.sync_photos && pWidget.szPhotosVisible) {
          let currPhotoPoint = pWidget.getFeatureAttributes(pWidget.counter);
          if ((currentTime > currPhotoPoint.MP4_Seconds) && (pWidget.counter < pWidget.getFeatureCount() - 1)) {

              pWidget.beforeLast_photo_point = pWidget.last_photo_point ? pWidget.last_photo_point : currPhotoPoint;
              pWidget.last_photo_point = currPhotoPoint;

              pWidget.counter += 1;
              pWidget.next_photo_point = pWidget.getFeatureAttributes(pWidget.counter);

              //measurePhotoDownloadTime();

              //photo_cur_index = pWidget.next_photo_point["photo_index"];
              //console.log("photo widget counter = " + pWidget.counter);
              pWidget.update_photo(pWidget.next_photo_point);
          }
      }

      //#### VIDEOS ####

      cur_vid_pt = szVideoWidget.getFeatureAttributes(szVideoWidget.counter);
      //let msg = youtube_player.getVideoUrl().split("=")[2] + ":  " + youtube_player.getCurrentTime();
      //console.log(msg);
      //console.log(cur_vid_pt);

      // Check if playback has gone beyond current point
      //console.log("onVideoProgress:  VIDEOS:  " + currentTime + ", " + cur_vid_pt.MP4_Seconds);
      if (currentTime - cur_vid_pt.MP4_Seconds >= 1) {      // Check if enough time has passed to go to the next point    // initWhere: (for example, change 1 to 10)
        szVideoWidget.counter += 1;
        if (szVideoWidget.counter < szVideoWidget.getFeatureCount())  {
          nxt_vid_pt = szVideoWidget.getFeatureAttributes(szVideoWidget.counter);
          //console.log("video widget counter = " + szVideoWidget.counter);
          szVideoWidget.moveToFeature(nxt_vid_pt);
          if (nxt_vid_pt.VIDEOTAPE !== last_video_name) {
            setVideoSource(nxt_vid_pt);
            currentTime = 0;      // new video defaults to time 0
          }
          if (nxt_vid_pt.MP4_Seconds - currentTime >= 1) {      // Check if next point is a skip of >= 1 second
            szVideoWidget.setVideoPosition(nxt_vid_pt.MP4_Seconds);
          }
        } else {
          szVideoWidget.setPlaybackOn(false);
          console.log("Pause due to end of points.");
        }
      }

/*  INTERPOLATION  (not currently used)
      time_now = new Date()

      // Interpolation betwenn waypoints
      if (typeof last_LatLongSend === "undefined" || time_now-last_LatLongSend >= LatLongSendRate) {

        t = 1000*(szVideoWidget.getVideoPosition() - cur_vid_pt["MP4_Seconds"]) / (nxt_vid_pt["DATE_TIME"]-cur_vid_pt["DATE_TIME"])

        let nxt_lat = nxt_vid_pt["LAT_DDEG"];
        let nxt_lng = nxt_vid_pt["LON_DDEG"];

        if (cur_vid_pt && nxt_vid_pt) {
          nxt_lat = cur_vid_pt["LAT_DDEG"] * (1.0-t) + nxt_vid_pt["LAT_DDEG"] * (t)
          nxt_lng = cur_vid_pt["LON_DDEG"] * (1.0-t) + nxt_vid_pt["LON_DDEG"] * (t)
        }

        szVideoWidget.moveToFeature(nxt_lng, nxt_lat);
        //videoLatLonHandler(nxt_lat, nxt_lng, cur_vid_pt["VIDEOTAPE"], cur_vid_pt["DATE_TIME"]);

        last_LatLongSend = time_now
      }
*/


    } catch(e) {
      console.log(e.message);
    }

  }

  function setVideoSource(startPointData) {
    // Set video path
    // param object startPointData Video data point
    last_video_name = startPointData["VIDEOTAPE"];

    if (startPointData["YouTubeID"]) {
      if (!youtube_player && !youtube_id) {
        youtube_playback_memory = 2;
        youtube_id = startPointData["YouTubeID"];
        asyncLoader("https://www.youtube.com/iframe_api");
      } else {
        if (youtube_id && youtube_player && startPointData["YouTubeID"] !== youtube_id) {
          youtube_playback_memory = youtube_player.getPlayerState()
          youtube_id = startPointData["YouTubeID"];
          //console.log("before YT.loadVideoById");
          try {
            youtube_player.loadVideoById({'videoId': youtube_id});
          } catch(e) {
            console.log(e.message);
          }
          if (!youtube_player.getVideoUrl()) {    // HACK -- because loadVideoById is not working on the first try
            let ytLoadTO = setTimeout(function(){
              youtube_progress_memory = progress;
              reloadVideo(startPointData.MP4_Seconds);
              }, 1000);
            console.log("retrying video load...");
          }
          //console.log("video loaded");
        }
      }
    }

    currentTime = 0;
    return last_video_name;
  }

  function reloadVideo(position) {
    youtube_player.loadVideoById({'videoId': youtube_id});
    szVideoWidget.setVideoPosition(position);
  }

  function pausePlayback(/*String*/ player) {
    // Pause playback of specified player.  If arg is null, both players will be paused.
    if (!player || player==="video") {
      szVideoWidget.setPlaybackOn(false);
      szVideoWidget.syncTo.next_photo_point = null;
    }
    if (!player || player==="photo") {
      console.log("Pause photo");
    }
  }


  function getDownloadVideoUrls(FS) {
    let maxSecondsOutside = 300;
    let theUrls = "";
    if (FS.length === 0)
      return "";
    let Videotape = "";
    let firstSeconds = 0;
    let lastSeconds = 0;
    let totalSeconds = 0;
    let secondsOut = 0;
    for (let i=0; i<FS.length; i++) {
      f = FS[i].attributes;
      secondsOut = f.MP4_Seconds - lastSeconds;
      if ((f.VIDEOTAPE!==Videotape) || (secondsOut>maxSecondsOutside)) {
        if (theUrls !== "") {
          theUrls += lastSeconds + ";";
          totalSeconds += (lastSeconds - firstSeconds);
        }
        Videotape = f.VIDEOTAPE;
        firstSeconds = f.MP4_Seconds;
        theUrls += videoSnippetDownloadFolder + "/360_" + Videotape + ".mp4?start=" + firstSeconds + "&end=";
      }
      lastSeconds = f.MP4_Seconds;
    }
    theUrls += lastSeconds;
    totalSeconds += (lastSeconds - firstSeconds);
    return totalSeconds + ";" + theUrls;
  }


  return declare(QueryBasedPanelWidget, {


    setPlaybackOn: function(play) {
      // Toggle playback of video
      // param bool playback state
      if (youtube_ready()) {
        youtube_playback_memory = play ? 1 : 2;
        play ? youtube_player.playVideo() : youtube_player.pauseVideo();
        if (play) setMessage_Mario("videoNoImageMessage",{"visible": true, "text": "Loading video..."});
      } else {
        //play ? get_video()[0].play() : get_video()[0].pause();
      }
    },

    getVideoPosition: function() {
      // Get playback time
      return youtube_id ? youtube_player.getCurrentTime() : null;
    },

    update_track: function(currentTime, duration) {
    onVideoProgress({"target": {"currentTime": currentTime, "duration": duration}, w: this});
  },


    //constructor: function(/*MapImageLayer*/ mapServiceLayer, /*String*/ layerName, /*String*/ symbolURL){
    constructor: function(/*Object*/ kwArgs){
        
      lang.mixin(this, kwArgs);

      this.clickableSymbolGap = settings.photoGap/2;

      this.query.where = "(MP4_Seconds IS NOT NULL) AND (MP4_Seconds >= -1)";
      this.playbackRate = 1.0;
      this.noFeaturesPanels.push(this.syncTo);


      this.processFeatures_Widget = function(features) {
        pausePlayback("video");

        getEl("offlineAppPanel").innerHTML = download_ZoomedInEnoughContent;
        let pWidget = this.syncTo;
        pWidget.features = features.filter(function(f){
          return f.attributes.StillPhoto_FileName
        });
        pWidget.processFeatures(pWidget.features);

        let vidcapFeatures = features.filter(function(f){
          return f.attributes.VidCap_FileName_HighRes
        });

        updateDownloadDialog(vidcapFeatures.length, pWidget.features.length);

        videoClipURLs = getDownloadVideoUrls(features);

        this.counter = this.firstVideoAvail();

        if (this.counter === -1) {
          this.counter = 0;
        } else {
          showCurrentFeatures();
          startPointData = this.getFeatureAttributes(this.counter);
          if (startPointData["YouTubeID"]) {
            if (this.getFeatureCount() > 0) {
              this.updateMedia(startPointData);
            }
          }
        }

    };

      this.setVideoPosition = function(progress) {
        if (youtube_id) {
          if (youtube_ready() /*&& youtube_player.getVideoUrl()*/) {
            console.log("https://www.youtube.com/watch?v=" + youtube_id + "&feature=youtu.be&t=" + progress);
            try {
              youtube_player.seekTo(progress, true);
            } catch(e) {
              console.log(e.message);
            }
          } else {
            youtube_progress_memory = progress;
          }
        }
      };

      this.toStart = function() {
        this.counter = 0;
        attrs = this.getFeatureAttributes(this.counter);
        this.updateMedia(attrs);
        this.moveToFeature(attrs);
      };

      this.playBackward = function() {
        alert("Not implemented yet");
      };

      this.pause = function() {
        pausePlayback("video")
      };

      this.playForward = function() {
        this.setPlaybackRate(this.playbackRate, false, false);
        this.setPlaybackOn(true);
      };

      this.toEnd = function() {
        this.counter = this.getFeatureCount() -1;
        attrs = this.getFeatureAttributes(this.counter);
        this.updateMedia(attrs);
        this.moveToFeature(attrs);
      };

      this.updateMedia = function(startPointData) {

        latest_startPointData = startPointData;

        if (!startPointData.YouTubeID) {
          youtube_id = false;
        }

        if (last_video_name !== startPointData.VIDEOTAPE) {
          last_video_name = setVideoSource(latest_startPointData);
          cur_vid_pt = null;
          nxt_vid_pt = null;
        }

        let pWidget = this.syncTo;
        if (pWidget && pWidget.sync_photos) {
          pWidget.counter = pWidget.indexFirstFeatureGreaterThan("DATE_TIME", startPointData.DATE_TIME);
          if (pWidget.counter >= 0) {
            pWidget.next_photo_point = pWidget.getFeatureAttributes(pWidget.counter);
            pWidget.update_photo(pWidget.next_photo_point);
          }
        }


        if (!startPointData.MP4_Seconds || startPointData.MP4_Seconds < 0) {
          //progress = Math.round( (parseInt(startPointData.pointDT) - parseInt(startPointData.tapeStartDT)) / 1000);
          progress = 0; // optional: filter null values
        } else {
          progress = parseInt(startPointData.MP4_Seconds);
        }
        this.setVideoPosition(progress);
        if (startPointData.item)
          this.counter = startPointData.item;
        else
          this.counter = 0;
        this.moveToFeature(startPointData);
      };

      this.setPlaybackRate = function(playbackRate, lowest, highest) {
        console.log("setPlaybackRate: " + playbackRate);
        this.playbackRate = playbackRate;
        if (youtube_id) {
          youtube_player.setPlaybackRate(playbackRate);
        }
      };

      this.setLockPoints = function(locked) {
        lock_points = locked;
        let lockSrc = "assets/images/unlock_24x24.png";
        if (lock_points) {
          lockSrc = "assets/images/lock_24x24.png";
        }
        let lockImage = getEl("lockImage");
        if (lockImage)
          lockImage.src = lockSrc;
      };

      this.setSyncPhotos = function(synced) {
        let pWidget = this.syncTo;
        pWidget.sync_photos = synced;
        if (pWidget.sync_photos && pWidget.photo_play_timer)
          clearTimeout(pWidget.photo_play_timer);
        //photoToolsDivStyle = getEl("photoToolsDiv").style;
        photoToolsStyle = getEl("photoTools").style;
        photoTools = getEl("photoTools");
        let linkSrc = "assets/images/link.png";
        if (pWidget.sync_photos) {
          latest_img_src = false;
          pWidget.update_photo(pWidget.next_photo_point)
          //photoToolsDivStyle.visibility = "hidden";
          photoToolsStyle.disabled = true;
          photoToolsStyle.opacity = 0.5;
          photoTools.title = "Click chain icon to unlink photo playback from video and unlock photo playback controls."
        }
        else {
          //photoToolsDivStyle.visibility = "inherit";
          photoToolsStyle.disabled = false;
          photoToolsStyle.opacity = 1.0;
          photoTools.title = "Photo playback controls."
          linkSrc = "assets/images/link_break.png";
        }
        let linkImage = getEl("linkImage");
        if (linkImage)
          linkImage.src = linkSrc;
      };

      this.firstVideoAvail = function(inReverse) {
            let p = 0;
            let incr = 1;
            let L = this.getFeatureCount();
            if (inReverse) {
                p = L - 1;
                incr = -1;
            }
            while ((p>=0) && (p<L) && (!this.getFeatureAttributes(p)["YouTubeID"]))
                p = p + incr;
            if  ((p===-1) || (p===L))
                return -1;
            else
                return p;
      };

/*    // old Tristan code for speed slider
      function getPlaybackControlHTML() {
        let html = "<div class=\"playback_speed_div\"><span style='position: absolute; right: 10px; width: 20%'><input type='range' id='playback_speed_range' step='10' style='width: 100%' onchange='findAndChangePlaybackSpeed()' title='Adjust playback speed'></span><div id=\"slider_value\" class=\"slider_value\" style=\"float: right\"></div></div>";
        return html
      }
      let speedHTML = getPlaybackControlHTML()
*/

      this.setSyncPhotos(true);

      let speedHTML = '<span class="photoCount" style="position: absolute; right: 5px; bottom: 5px; width: 60px;">';
      speedHTML += '<img id="speedDecrIcon" src="assets/images/minus_12x12_red.png" style="position: absolute; bottom: 1px; left: 0" title="Click to reduce playback speed." onclick="nudgePlaybackSpeed(-1)"/>';
      speedHTML += '<span id="speedSpan" class="photoCount" style="position: absolute; bottom:0; left: 15px; width: 40px; text-align: center; font-weight: bold; padding-left: 0; padding-right: 0;" title="Current playback speed.  Click the +/- icons to increase or decrease.">';
      speedHTML += '1X</span>';
      speedHTML += '<img id="speedIncrIcon" src="assets/images/plus_12x12_red.png" style="position: absolute; bottom: 1px; right: 0" title="Click to increase playback speed." onclick="nudgePlaybackSpeed(1)"/>';
      speedHTML += '</span>';

      let lockHTML = "&nbsp;&nbsp;<img id='lockImage' src='assets/images/unlock_24x24.png' width='24' height='24' onclick='lockImage_clickHandler()' title='Click to lock in or unlock current set of video points' />";
      let dlClipHTML = "";      // "&nbsp;&nbsp;<img id='dlClipImage' src='assets/images/floppy16x16.png' width='24' height='24' onclick='dlClipImage_clickHandler()' title='Click to download video clip for current extent' />";
// TODO: Video clip download from download icon
      videoToolsDiv.innerHTML = makeMediaPlaybackHtml(playbackControlTemplate, this.controlData, 'videoTools', '', this.objName) + speedHTML + lockHTML + dlClipHTML;

/*    // old Tristan code for speed slider
      $("#playback_speed_range").on("input", function(val){
        $("#slider_value").html(val.target.value)
      })
*/


      },    // end of constructor function


  });
});

