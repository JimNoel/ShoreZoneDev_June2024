/**
 * Class VideoPanelWidget
 *
 * Widget for video/photo playback
 *   subclass of QueryBasedPanelWidget
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
  "esri/geometry/Extent",
  "esri/geometry/support/webMercatorUtils",
  "esri/rest/query",
  "esri/layers/graphics/sources/support/QueryTask",
  "esri/views/MapView",
  "noaa/QueryBasedPanelWidget",
  "noaa/PhotoPlaybackWidget"
], function(declare, lang, Extent, webMercatorUtils, Query, QueryTask, View, QueryBasedPanelWidget, PhotoPlaybackWidget){

  // private vars and functions here

  let last_video_name = null;
//  let startPointData;
  let latest_startPointData;
  let cur_vid_pt = null;
  let nxt_vid_pt = null;
  let videos = false;
  let video_message_timeout = false;
/*1*
  let paused = false;
  let videoPauseTO = null;
/*1*/


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
console.log("Current video time:  " + currentTime);
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

      let nextTime = 10000;     // Videos are all less than 4000 seconds, so this is an upper limit
      cur_vid_pt = szVideoWidget.getFeatureAttributes(szVideoWidget.counter);
/*binaryFilter*/
      if (szVideoWidget.counter < szVideoWidget.getFeatureCount()) {
        nxt_vid_pt = szVideoWidget.getFeatureAttributes(szVideoWidget.counter + 1);
        nextTime = nxt_vid_pt.MP4_Seconds;
        console.log("nextTime:  " + nextTime);
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
      /**/

      // Check if playback has gone beyond current point
      //console.log("onVideoProgress:  VIDEOS:  " + currentTime + ", " + cur_vid_pt.MP4_Seconds);
//      if (currentTime - cur_vid_pt.MP4_Seconds >= 1) {      // Check if enough time has passed to go to the next point
      if (currentTime >= nextTime) {      // Check if enough time has passed to go to the next point
        console.log("Moving to next video feature");
        szVideoWidget.counter += 1;
        if (szVideoWidget.counter < szVideoWidget.getFeatureCount())  {
          //  TODO: Get feature (rather than just attributes), use this as argument for movetoFeature
//          nxt_vid_pt = szVideoWidget.getFeatureAttributes(szVideoWidget.counter);
          nxt_vid_pt = szVideoWidget.features[szVideoWidget.counter];
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


    } catch(e) {
      console.log(e.message);
    }

  }

  function setVideoSource(startPointData, useBUcode) {
    // Set video path
    // param object startPointData Video data point
    last_video_name = startPointData["VIDEOTAPE"];

    // temporary fix for missing Axiom videos on YouTube.  Where present, using alternate mid-res videos on NOAA channel
    if (startPointData["YouTubeID_midRes"])
      currYouTube_ID = startPointData["YouTubeID_midRes"];
    else
      currYouTube_ID = startPointData["YouTubeID"];

//    currYouTube_ID = startPointData["YouTubeID"];
//    if (useBUcode)
//      currYouTube_ID = startPointData["YouTubeID_midRes"];

    if (currYouTube_ID) {
      if (!youtube_player && !youtube_id) {
        youtube_playback_memory = 2;
        youtube_id = currYouTube_ID;
        asyncLoader("https://www.youtube.com/iframe_api");
      } else {
        if (youtube_id && youtube_player && currYouTube_ID!==youtube_id) {
          youtube_playback_memory = youtube_player.getPlayerState()
          youtube_id = currYouTube_ID;
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

/*1*
    loopVideo: function(pos, interval) {
      //paused = true;
      if (!paused)
        return;
      let DT = new Date();
      console.log(DT + ":  1-second loop of video");
      youtube_player.seekTo(pos, false);
      videoPauseTO = setTimeout(this.loopVideo(pos, interval), interval);
    },
/*1*/

    setPlaybackOn: function(play) {
      // Toggle playback of video
      // param bool playback state
      if (youtube_ready()) {
/*1*
        paused = !play;
        if (play) {
          clearTimeout(videoPauseTO);
          youtube_playback_memory = 1;
          youtube_player.playVideo();
          setMessage_Mario("videoNoImageMessage",{"visible": true, "text": "Loading video..."});
        } else {
          youtube_playback_memory = 2;
          this.loopVideo(this.getVideoPosition(), 1000);
        }
/*1*/
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

    useBUVideoSource: function() {
      setVideoSource(startPointData, true);
    },


    //constructor: function(/*MapImageLayer*/ mapServiceLayer, /*String*/ subLayerName, /*String*/ symbolURL){
    constructor: function(/*Object*/ kwArgs){
        
      lang.mixin(this, kwArgs);

      this.clickableSymbolGap = settings.photoGap/2;

      // TODO:  Do I need to do something about this?
      this.query.where = "(MP4_Seconds IS NOT NULL) AND (MP4_Seconds >= -1)";
      this.playbackRate = 1.0;
      this.noFeaturesPanels.push(this.syncTo);

/*
      this.getEntryPoints = function(extent, mapPoint) {
        queryComplete = false;
        this.query.geometry = extent;
        this.query.orderByFields = ["VIDEOTAPE", "MP4_Secs_div1000"];
        this.query.where = "";     //"1=1";
        this.query.groupByFieldsForStatistics = ["VIDEOTAPE", "MP4_Secs_div1000"];
        this.query.outStatistics = [
          {
            "statisticType": "min",
            "onStatisticField": "MP4_Seconds",
            "outStatisticFieldName": "Start_MP4_Seconds"
          }
        ];

        this.queryTask.url = this.mapServiceQueryUrl();     //this.mapServiceQueryUrl("VIDEOSAMPLES_250M");
        this.queryTask.execute(this.query).then(function(response) {
          let features = response.features;
          if (features.length === 0)
            return;
          let a = features[0].attributes;
          let minSecs = a.Start_MP4_Seconds;
          let maxSecs = minSecs + 999;      // This ensures that the query will not attempt to return more than 1000 features
          let where = "VIDEOTAPE='" + a.VIDEOTAPE + "' AND ";
          where += "MP4_Seconds>=" + minSecs + " AND MP4_Seconds<=" + maxSecs;
          this.query.groupByFieldsForStatistics = null;
          this.query.outStatistics = null;
          this.noMarkers = false;
          this.runQuery(extent, {theWhere: where});
        }.bind(this), function(error) {
          console.log("Nearest point query failed");
        });
      };
*/

      this.queryVideoStartPoint = function(geometry, mapPoint) {
        // Update popup with video preview image
        logTimeStamp("queryVideoStartPoint");
        let query = new Query();
        query.geometry = geometry;     // extent;
        query.outFields = "FrameID, VIDEOTAPE, DATE_TIME, MP4_Seconds, VidCap_HighRes_subPath, VidCap_LowRes_subPath";
//        query.outFields = "FrameID, VIDEOTAPE, DATE_TIME, MP4_Seconds, MP4_Seconds_str, VidCap_HighRes_subPath, VidCap_LowRes_subPath";
        query.orderByFields = "DATE_TIME"
        query.where = "VidCap_HighRes_subPath IS NOT NULL";
//        query.where = "MP4_Seconds_str LIKE '%0'"      //"VidCap_HighRes_subPath IS NOT NULL";
        query.spatialRelationship = "contains";
        query.returnGeometry = true;
        let queryTask = new QueryTask();
        queryTask.url = this.mapServiceQueryUrl("1s");
        queryTask.execute(query).then(function(response) {
          let features = response.features;
          if (features.length === 0)
            return;
          logTimeStamp("queryVideoStartPoint query results:  " + features.length + " features returned");
          let minDist = Number.MAX_VALUE;
          let minDist_f = null;
          //let minDist_Videotape = null;
          //let minDist_MP4_Seconds = null;
          for (let f=0; f<features.length; f++) {
            let dist = mapPoint.distance(features[f].geometry);
            if (dist < minDist) {
              minDist = dist;
              minDist_f = f;
            }
          }

          startFeature = features[minDist_f];
          //startFeatureSearchPolygon = query.geometry;

          // If mouse position is close enough to startFeature, then display play button and place at startFeature location
          if (minDist/view.extent.width < maxViewExtentPct) {
            let geogPoint = webMercatorUtils.webMercatorToGeographic(startFeature.geometry);
            let graphic = {
              geometry: startFeature.geometry,
              attributes: {
                Caption: decDegCoords_to_DegMinSec(geogPoint.x, geogPoint.y)
              }
            }
            this.displayPopup(graphic, null, true);
          }

/*
          let P = startFeature.geometry;
          let r = settings.preQueryRadius;
          startFeatureSearchPolygon = new Extent({
            // autocasts as new Extent()
            xmin: P.x - r,
            ymin: P.y - r,
            xmax: P.x + r,
            ymax: P.y + r,
            spatialReference: 102100
          });
*/

          if (!startFeature.attributes.VidCap_HighRes_subPath)
            view.popup.content = view.popup.content.replace("Locating preview image...", "Sorry, no preview image is available.");
          else {
            let imageUrl = szVideoServer + startFeature.attributes.VidCap_HighRes_subPath;
            view.popup.content = replaceFromArray(view.popup.content, [imageUrl]);
            view.popup.content = view.popup.content.replace("locImageText", "hide_rmvSpace");
          }
          console.log(startFeature);

        }.bind(this));
      }

      this.getPrequeriedVideoPoints = function(startFeature) {
        let videoTape = startFeature.attributes.VIDEOTAPE;

        // Get VideoTape extent from "Videotape Coverage" layer
        let query = new Query();
        query.outFields = "VIDEOTAPE";
        query.where = "VIDEOTAPE='" + videoTape + "'";
        query.returnGeometry = true;
        let queryTask = new QueryTask();
        queryTask.url = this.mapServiceQueryUrl("Videotape Coverage");     //this.mapServiceQueryUrl("VIDEOSAMPLES_250M");
        queryTask.execute(query).then(function(response) {
          let startSeconds = startFeature.attributes.MP4_Seconds;
          let queryPars = {
            theWhere: "VIDEOTAPE='" + videoTape + "' AND MP4_Seconds>=" + startSeconds + " AND MP4_Seconds<" + (startSeconds + 1000)
          }
          this.runQuery(response.features[0].geometry.extent, queryPars);
        }.bind(this));

        // Get overall extent of the features
        queryTask.executeForExtent(query).then(function(response) {
          sz_ExtentFromPreQuery = response.extent;
          showHide("zoomQueryImage", true, false);
        }.bind(this));

      }

      this.videoPreQuery = function(extent, mapPoint, pass) {
        logTimeStamp("videoPreQuery, pass " + pass);
        //queryComplete = false;
        let query = new Query();
        query.geometry = mapPoint;     // extent;
        query.outFields = "OBJECTID, Join_Count";
        query.spatialRelationship = "within";
        query.returnGeometry = true;
        let queryTask = new QueryTask();
        queryTask.url = this.mapServiceQueryUrl("VideoGrids_pass" + pass);     //this.mapServiceQueryUrl("VIDEOSAMPLES_250M");
        queryTask.execute(query).then(function(response) {
          let features = response.features;
          if (features.length === 0)
            return;
          let f  = features[0];
          if (pass === 1) {
/*
            let geogPoint = webMercatorUtils.webMercatorToGeographic(mapPoint);
            let graphic = {
              geometry: mapPoint,
              attributes: {
                Caption: decDegCoords_to_DegMinSec(geogPoint.x, geogPoint.y)
              }
            }
            this.displayPopup(graphic, null, true);
*/

            if (f.attributes.Join_Count > 1000)
              this.videoPreQuery(f.geometry, mapPoint, 2);
            else
              this.queryVideoStartPoint(f.geometry, mapPoint);
          } else if (pass === 2) {
            this.queryVideoStartPoint(f.geometry, mapPoint);
          }
        }.bind(this), function(error) {
          console.log("Nearest point query failed");
        });
      };

      this.updateMapMagnifier = function(extent) {
        magView.extent = extent;
      };

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
          //showEnabledDisabled("video", false);
          updateNoFeaturesMsg([this] , "No video available");
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
            //console.log("https://www.youtube.com/watch?v=" + youtube_id + "&feature=youtu.be&t=" + progress);
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
//        if (pWidget.sync_photos && pWidget.photo_play_timer)
//          clearTimeout(pWidget.photo_play_timer);
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

      this.setSyncPhotos(true);

      /*binaryFilter    --temporarily turning off photo-sync when using binary filter on video points*/
      if (this.useBinaryFilter)
        this.setSyncPhotos(false);

      let speedHTML = '<span class="photoCount" style="position: absolute; right: 5px; bottom: 5px; width: 60px;">';
      speedHTML += '<img id="speedDecrIcon" src="assets/images/minus_12x12_red.png" style="position: absolute; bottom: 1px; left: 0" title="Click to reduce playback speed." onclick="nudgePlaybackSpeed(-1)"/>';
      speedHTML += '<span id="speedSpan" class="photoCount" style="position: absolute; bottom:0; left: 15px; width: 40px; text-align: center; font-weight: bold; padding-left: 0; padding-right: 0;" title="Current playback speed.  Click the +/- icons to increase or decrease.">';
      speedHTML += '1X</span>';
      speedHTML += '<img id="speedIncrIcon" src="assets/images/plus_12x12_red.png" style="position: absolute; bottom: 1px; right: 0" title="Click to increase playback speed." onclick="nudgePlaybackSpeed(1)"/>';
      speedHTML += '</span>';

      let lockHTML = "&nbsp;&nbsp;<img id='lockImage' src='assets/images/unlock_24x24.png' width='24' height='24' onclick='lockImage_clickHandler()' title='Click to lock in or unlock current set of video points' />";
      let zoomToQueryHTML = "&nbsp;&nbsp;<img id='zoomQueryImage' src='assets/images/MapMagnifier.png' style='visibility:hidden' width='24' height='24' onclick='zoomQuery_clickHandler()' title='Click to zoom to current set of video points' />";
      let dlClipHTML = "";      // "&nbsp;&nbsp;<img id='dlClipImage' src='assets/images/floppy16x16.png' width='24' height='24' onclick='dlClipImage_clickHandler()' title='Click to download video clip for current extent' />";
// TODO: Video clip download from download icon
      videoToolsDiv.innerHTML = makeMediaPlaybackHtml(playbackControlTemplate, this.controlData, 'videoTools', '', this.objName) + speedHTML + lockHTML + zoomToQueryHTML + dlClipHTML;

/*    // old Tristan code for speed slider
      $("#playback_speed_range").on("input", function(val){
        $("#slider_value").html(val.target.value)
      })
*/


      },    // end of constructor function


  });
});

