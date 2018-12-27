/**
 * Created by Jim on 12/5/2016.
 */


var download_notZoomedInEnoughContent = "<h3>Download tool</h3>Hi!  This tool allows you to download data in the current extent for offline use.  Right now you're not zoomed in far enough to use this tool.  Zoom in further, and the tool will be enabled.";

var downloadSetVisibleHTML = 'setVisible("offlineAppContent",false); setVisible("dlDataContent",true);';
var onlineSetVisibleHTML = 'setVisible("offlineAppContent",true); setVisible("dlDataContent",false);';
var download_ZoomedInEnoughContent = "<h3>Download tool</h3>Do you want to download <b>files</b> for external use, or send the data to the <b>Offline App</b>?<br><br>";
download_ZoomedInEnoughContent += "&nbsp;&nbsp;&nbsp;&nbsp;<button onclick='" + downloadSetVisibleHTML + "'>Download files</button>";
download_ZoomedInEnoughContent += "&nbsp;&nbsp;&nbsp;&nbsp;<button onclick='" + onlineSetVisibleHTML + "'>Use Offline App</button>";


var dlDataContent = "<div id='dlDataContent' style='visibility: hidden; position: absolute; top: 120px;'>Select which images to include<br>&nbsp;&nbsp;&nbsp;&nbsp;<button onclick='downloadData()'>Submit</button></div>";

var offlineAppContent = "<div id='offlineAppContent' style='visibility: hidden; position: absolute; top: 120px;'>Do you want to download data and open the offline app? Note that it will take some time to download the data, and your device may not have enough storage.<br>&nbsp;&nbsp;&nbsp;&nbsp;<button onclick='openOfflineApp()'>Go offline!</button></div>";

download_ZoomedInEnoughContent += dlDataContent + offlineAppContent;

var outZipFileName = "";
var zipSizeText = "";
var zipURL = "";
var extraInfo = "";
var videoClipInfo = [];

function updateDownloadDialog(vidCapCount, photoCount) {
  var dlDataDialog = '<b>Select which images to include</b><br>';
  dlDataDialog += '<input type="checkbox" id="cb_StillPhotos">&nbsp;&nbsp;Still Photos (' + photoCount + ' images targeted)<br>';
  dlDataDialog += '<input type="checkbox" id="cb_LowResVidCap">&nbsp;&nbsp;Low resolution video captures (' + vidCapCount + ' images targeted)<br>';
  dlDataDialog += '<input type="checkbox" id="cb_HighResVidCap">&nbsp;&nbsp;High resolution video captures (' + vidCapCount + ' images targeted)<br>';
  dlDataDialog += 'Description:&nbsp;&nbsp;<input type="text" id="text_Description" value="Spatial Data Extraction" size="30"><br>';
  dlDataDialog += '&nbsp;&nbsp;&nbsp;&nbsp;<button onclick="downloadData();">Submit</button>';
  setContent("dlDataContent", dlDataDialog);
}

function sendRequest(theURL) {
  var xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      var A = JSON.parse(this.responseText);
      window.open(offlineAppURL + "?" + A.jobId, "Shorezone Offline");
    }
  };
  xmlhttp.open("GET", theURL, true);
  xmlhttp.send();
}

function openOfflineApp() {
  if (confirm("Do you want to download data and open the offline app?  If so, click OK, otherwise hit Cancel.")) {
    var theURL = "https://alaskafisheries.noaa.gov/arcgis/rest/services/OfflineDataExtract2/GPServer/OfflineDataExtract_JSON/submitJob?f=json&";
    var e = view.extent;
    theURL += "Extent=" + Math.round(e.xmin) + " " + Math.round(e.ymin) + " " + Math.round(e.xmax) + " " + Math.round(e.ymax);
    sendRequest(theURL);
  }
}



function getResultData(result) {
  console.log(result);
  var jobId = result.jobId;
  gp.getResultData(jobId, "Output_Zip_File_zip").when(function(result) {
    zipURL = result.value.url.replace("/scratch/","/scratch/GroupDataExtract_output/");     // HACK: add GroupDataExtract_output subdirectory
    gp.getResultData(jobId, "outJSON").when(function(result) {
      var a = result.value.split(";");
      zipSizeText = a[0];
      videoClipInfo = a[1].split("@");

      showZipLink();

    });
  });
}

function processError(error) {
  setContent("dlDataContent", " Failed", true);
  //alert("Failure");
  console.log(error);
}

function logProgress(value) {
  setContent("dlDataContent", ".", true);
  console.log(value.jobStatus);
}

function showZipLink() {
  var dlReadyContent = 'Data is ready for download!<br>&nbsp;&nbsp;<a class="linkInPopup" href="' + zipURL + '" download="' + outZipFileName + '.zip"><u>Get ZIP file (' + zipSizeText + ')</u></a><br>';
  var clipsHTML = "&nbsp;&nbsp;Video clips:<br>";
  for (v in videoClipInfo) {
    var clipUrl = videoSnippetDownloadFolder + "/360_" + videoClipInfo[v];
    var a = videoClipInfo[v].split("?");
    var fileName = a[0];
    a = a[1].split("=");
    var startTime = a[1].split("&")[0];
    var endTime = a[2];
    var newName = "360_" + fileName.split(".")[0] + "_" + startTime + "to" + endTime + ".mp4";
    clipsHTML += '&nbsp;&nbsp;<a class="linkInPopup" href="' + clipUrl + '" download="' + newName + '"><u>' + newName + '</u></a><br>';
  }
  dlReadyContent += clipsHTML;
  setContent("dlDataContent", dlReadyContent);
  console.log(value);
}


function downloadData() {
  var e = view.extent;
  var extentStr = e.xmin + " " + e.ymin + " " + e.xmax + " " + e.ymax;
  var params = {
    "Extent": extentStr,      // "-17148015.4244553 8194329.57984811 -17140903.4102313 8199102.67272763",
    "Get_LowRes": "0",
    "Get_HighRes": "0",
    "Get_Photos": "0",
    "QueryShapeFileName": "0"
  };
  if (cb_StillPhotos.checked)
    params.Get_Photos = "1";
  if (cb_LowResVidCap.checked)
    params.Get_LowRes = "1";
  if (cb_HighResVidCap.checked)
    params.Get_HighRes = "1";
  outZipFileName = text_Description.value;
  setContent("dlDataContent", "Submitting query ..");
  gp.submitJob(params).when(getResultData, processError, logProgress);
}
