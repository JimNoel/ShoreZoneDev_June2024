/**
 * data used by all web applications, including the SZ mapping site, but also default.htm and SZapps.htm
 */


let noaaLinksContent = '';
/*  //Add buttons to change layout.  So far, this isn't working post-load, so disabled for now.
      linksContent += '<img src="assets/images/layoutH2.png" id="btn_h2" class="layoutImg" >';
      linksContent += '<img src="assets/images/layoutV2.png" id="btn_v2" class="layoutImg" style="left: 40px;" >';
      linksContent += '<img src="assets/images/layoutV3.png" id="btn_v3" class="layoutImg" style="left: 80px;">';
*/

noaaLinksContent +=
  '<a id="adminLinksLabel" style="color:Black"  href="#" onclick="openNewTab(\'https://www.fisheries.noaa.gov/\')" >NOAA Fisheries</a>  &nbsp;&nbsp;' +
  '<a id="disclaimerLabel" style="color:Black"  href="#" onclick="openNewTab(\'https://www.noaa.gov/disclaimer.html\')" >Disclaimer</a> &nbsp;&nbsp;\n' +
  '<a id="privacyPolicyLabel" style="color:Black"  href="#" onclick="openNewTab(\'https://www.fisheries.noaa.gov/privacy-policy\')" >Privacy Policy</a>  &nbsp;&nbsp;' +
  '<span>' +
    '<span class="sz"><a id="shoreZonePageLabel" style="color:Black" href="#" onclick="openNewTab(\'https://www.fisheries.noaa.gov/alaska/habitat-conservation/alaska-shorezone\')" >SZ Homepage</a>  &nbsp;&nbsp;</span>' +
  //  '<a id="metadataLabel" style="color:Black"  href="https://www.fisheries.noaa.gov/webdam/download/70834468" >SZ Metadata</a>  &nbsp;&nbsp;' +
    '<span class="sz"><a id="SZdictonaryLabel" style="color:Black"  href="#" onclick="openNewTab(\'https://alaskafisheries.noaa.gov/mapping/DataDictionary\')" >SZ Data Dictionary</a>  &nbsp;&nbsp;</span>' +
  '</span>' +
  '<span>' +
  '<span class="fa"><a id="faPageLabel" style="color:Black" href="#" onclick="openNewTab(\'https://www.fisheries.noaa.gov/alaska/habitat-conservation/nearshore-fish-atlas-alaska\')" >FA Homepage</a>  &nbsp;&nbsp;</span>' +
    '<span class="fa"><a id="faGuidesLabel" style="color:Black" href="#" onclick="openNewTab(\'assets/NFAA-QuickStartSheet.png\')" >FA Quick Start</a>  &nbsp;&nbsp;</span>' +
    '<span class="fa"><a id="FAdictonaryLabel" style="color:Black"  href="#" onclick="openNewTab(\'assets/NFAA-DataDictionary.pdf\')" >FA Data Dictionary</a>  &nbsp;&nbsp;</span>' +
  '</span>' +
  '<span>' +
    '<span class="ss"><a id="ssPageLabel" style="color:Black" href="#" onclick="openNewTab(\'https://www.fisheries.noaa.gov/alaska/habitat-conservation/alaska-shore-station-database\')" >SS Homepage</a>  &nbsp;&nbsp;</span>' +
    '<span class="ss"><a id="ssMetadataLabel" style="color:Black" href="#" onclick="openNewTab(\'https://media.fisheries.noaa.gov/dam-migration/shorezone-ground-station-metadata.pdf\')" >SS Metadata</a>  &nbsp;&nbsp;</span>' +
  '</span>' +
  '<a id="testLabel" style="color:Black"  href="#" onclick="showSiteInfo()" >Site Info</a>  &nbsp;&nbsp;' +
  '<a id="contactLabel" style="color:Black"  href="#" onclick="openNewTab(\'mailto:Steve.Lewis@noaa.gov\')" >Contact</a>';


function makeHtmlElement(tagName, theId, theClass, theStyle, theContent) {
  let el = document.createElement(tagName);
  if (theId)
    el.setAttribute("id", theId);
  if (theClass)
    el.setAttribute("class", theClass);
  if (theStyle)
    el.setAttribute("style", theStyle);
  if (theContent)
    el.innerHTML = theContent;
  return el;
}

function getEl(id) {
  // If the arguent is a string, returns the element whose id is equal to the argument
  // If not a string, assume the argument is already an element, and return it
  if ((typeof id) === "object")
    return id;
  return document.getElementById(id);
}

function setVisible(id, value) {
  // Show/hide HTML element
  el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  let visibility = "hidden";
  if (value)
    visibility = "inherit";
  el.style.visibility = visibility;
}

function setDisplay(id, value) {
  // Show/hide HTML element   NOTE: If other visible elements are in the parent element, these will shift to fill the missing space
  let el = getEl(id);
  if (!el)
    return;   // do nothing if el doesn't exist
  let display = "none";
  if (value)
    display = "block";
  el.style.display = display;
}

function showHide(id, value, removeSpace) {
  // Show/hide HTML element.  If optional removeSpace parameter is true, then subsequent elements will shift to fill the missing space
  if (removeSpace)
    setDisplay(id, value);
  else
    setVisible(id, value);
}

let closeCode = "setVisible('siteInfoPanel', false)";
let siteInfoHtml = '<b class="bold1">Website Information</b><br><br><br>';
siteInfoHtml += '<b class="bold2">Most recent website update:  </b>' + document.lastModified.split(" ")[0] + '<br><br>';
siteInfoHtml += '<b class="bold2">Fish Atlas database updates:</b><br>';
siteInfoHtml += 'April 2022:  Added data from 1572 sites throughout Alaska';
siteInfoHtml += '<br><br><br><br><button style="position:absolute; right:5px; bottom: 5px" onclick="' + closeCode + '">Close</button>';

function makeSiteInfoPanel() {
  let siteInfoPanel = makeHtmlElement("div", "siteInfoPanel", "dropdown-content-visible", "top:200px;right:200px;padding:10px", siteInfoHtml);
  document.body.appendChild(siteInfoPanel);
  setVisible("siteInfoPanel", false);
}

function makeAddQueryLayerDialog() {
  let theStyle = "display:none";
  let theContent = '<label for="queryLayer_name">Enter a name for the new layer: </label><input type="text" id="queryLayer_name" name="queryLayer_name"><br>';
  theContent += '<label for="queryLayer_where">Enter WHERE clause for the new layer: </label><input type="text" id="queryLayer_where" name="queryLayer_where"><br><br>';
  theContent += '<h4 id="layerAddedLabel">Your new layer has been added, under ShoreZone/Query Layers</h4>';
  let buttonInfo = "Create layer:mapStuff.addQueryLayer();Cancel:setDisplay('queryLayerDiv',false)";
  makeDialog("queryLayerDiv", "Add new query layer", true, null, theStyle, theContent, buttonInfo);
}

function makeDialog(divID, headerText, hasOpacitySlider, theClass, theStyle, theContent, buttonInfo) {
  if (buttonInfo) {
    theContent += '<br>';
    let bArray = buttonInfo.split(";");
    for (let b=0; b < bArray.length; b++) {
      let button = bArray[b].split(":");
      theContent += '<button onclick="' + button[1] + '">' + button[0] + '</button>'
    }
  }
  theContent += "<br>";
  let newDialog = makeDraggablePanel(divID, headerText, hasOpacitySlider, theClass, theStyle, theContent);
  return newDialog;     // unneccessary?
}

function showSiteInfo() {
  setVisible('siteInfoPanel', true);
  //faWidget.deSanitize();
}

function queryServer(url, returnJson, responseHandler, postInfo) {
  let xmlhttp = new XMLHttpRequest();
  xmlhttp.onreadystatechange = function() {
    if (this.readyState === 4 && this.status === 200) {
      let R = this.responseText;
      if (R.slice(0,6) === "ERROR:") {
        alert(R);
        console.log(R);
        //return;
      }
      if (returnJson)
        R = JSON.parse(R);
      responseHandler(R);
    } else {
      //console.log("readyState: " + this.readyState + "     status: " + this.status);
    }
  };
  let completeUrl = url;
  if (returnJson)
    completeUrl += "?f=pjson";
  if (postInfo) {
    xmlhttp.open("POST", completeUrl, true);
    xmlhttp.send(postInfo);
  } else {
    xmlhttp.open("GET", completeUrl, true);
    xmlhttp.send();
  }
}

function populateIdTable(R, idTable, onCompleteFunction) {
  if (R.error) {
    console.log("Map service error:  " + R.error.message);
    return;
  }
  for (let l in R.layers) {
    let o = R.layers[l];
    idTable[o.name] = o.id.toString();
  }
  for (let t in R.tables) {
    let o = R.tables[t];
    idTable[o.name] = o.id.toString();
  }
  if (onCompleteFunction)
    onCompleteFunction();
}

function makeSublayerIdTable(serviceUrl, idTable, onCompleteFunction) {
  queryServer(serviceUrl, true, function(R) {
    populateIdTable(R, idTable, onCompleteFunction);
  });
}

// a HACK to determine if the browser is Safari
//   This method is not generally recommended, but I haven't been able to find a suitable approach
//   using feature detection.  Issue arises in trying to use display:none for select options
function isApple() {
  return navigator.vendor.slice(0,5) === "Apple";
}

