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

function showHide(id, value) {
  // Show/hide HTML element.
  // Uses setDisplay() if "display" parameter is present, uses setVisible() if "visibility" parameter is present, otherwise logs error in console
  // Eventually replace setVisible() and setDisplay() with this?
  let style = getEl(id).style;
  let hasDisplay = false;
  let hasVisibility = false;
  for (let i=0; i<style.length; i++) {
    if (style[i] === "display")
      hasDisplay = true;
    if (style[i] === "visibility")
      hasVisibility = true;
  }
  if (hasDisplay)
    setDisplay(id, value);
  else if (hasVisibility)
    setVisible(id, value);
  else
    console.log("ERROR:  Can't apply showHide() function to " + id + ", as the element has neither 'visibility' nor 'display' properties")
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
  let theStyle = "position:absolute; top:150px; left:100px; visibility:hidden";
  let theContent = '<div class="show_rmvSpace">';
  theContent += '<label for="queryLayer_name">Enter a name for the new layer: </label>&emsp;<input type="text" id="queryLayer_name" name="queryLayer_name"><br><br>';
  theContent += '<label for="queryLayer_where">Enter WHERE clause for the new layer: </label>&emsp;<input type="text" id="queryLayer_where" name="queryLayer_where"><br><br>';
  theContent += '</div>';
  theContent += '<h4 class="hide_rmvSpace" id="layerAddedLabel">Your new layer has been added, and will be visible on the map shortly!</h4><br>';
  let buttonInfo = [
    "Create layer:mapStuff.addQueryLayer():show_rmvSpace",
    "Cancel:setDisplay('queryLayerDiv',false):show_rmvSpace",
    "Close:setDisplay('queryLayerDiv',false):hide_rmvSpace"
  ];
  makeDialog("queryLayerDiv", "Add new query layer", true, null, theStyle, theContent, buttonInfo);
}

function showEditQueryLayerDialog(item) {
  let theStyle = "position:absolute; top:150px; left:100px; visibility:inherit";
  let theContent = '<h3>Edit layer settings for  ' + item.layer.title + '</h3>';
  // Change layer name
  theContent += '<label for="layerNameText"><b>Layer name: </b></label>&emsp;';
  theContent += '<input type="text" id="layerNameText" value="' + item.layer.title + '"><br><br>';
  // Change definition expression
  theContent += '<label for="defExprText"><b>Definition expression: </b></label>&emsp;';
  theContent += '<input type="text" id="defExprText" value="' + item.layer.definitionExpression + '"><br><br>';
  // Change color
  theContent += '<label><b>Click on the color swatch to select a new color: </b></label>&emsp;';
//  let swatchHtml = item.panel.content.innerHTML.replace('listItemSwatch', 'dialogSwatch');
  let colorHtml = 'value=' + item.layer.renderer.symbol.color.toHex();
//  theContent += /*swatchHtml +*/ '<input ' + colorHtml + ' id="colorPicker" type="color" onchange="changeDialogSwatchColor(' + item.layer.id + ')"><br>';
  theContent += '<input ' + colorHtml + ' id="colorPicker" type="color"><br>';
  let buttonInfo = [
    "Apply changes:applyChanges(" + item.layer.id + ")",
    "Cancel:getEl('editQueryLayerDiv').remove()"
    //"Close:setDisplay('queryLayerDiv',false):hide_rmvSpace"
  ];
  makeDialog("editQueryLayerDiv", "Edit query layer", true, null, theStyle, theContent, buttonInfo);
}

function changeDefinitionExpression(id) {
  let newExpr = getEl('defExprText').value;
  getEl('dialogSwatch' + id).style.backgroundColor = newExpr;
}

/*
function changeDialogSwatchColor(id) {
  let newColor = getEl('colorPicker').value;
  getEl('dialogSwatch' + id).style.backgroundColor = newColor;
}
*/

function swapClasses(elName, class1, class2) {
  // Find all elements under elName having class of either class1 or class2, and swap the classes.
  //   Currently this is used to alternately show or hide elements, with class1/class2 being either "show_rmvSpace" or "hide_rmvSpace"
  let theEl = getEl(elName);
  let class1Els = theEl.querySelectorAll("." + class1);    // theEl.getElementsByClassName(class1);
  let class2Els = theEl.querySelectorAll("." + class2);    // theEl.getElementsByClassName(class2);
  for (let e=0; e<class1Els.length; e++)
    class1Els.item(e).setAttribute("class",class2);
  for (let e=0; e<class2Els.length; e++)
    class2Els.item(e).setAttribute("class",class1);
}

function makeDialog(divID, headerText, hasOpacitySlider, theClass, theStyle, theContent, buttonInfo) {
  if (buttonInfo) {
    theContent += '<br>';
    //let bArray = buttonInfo.split(";");
    for (let b=0; b < buttonInfo.length; b++) {
      let button = buttonInfo[b].split(":");
      let classParam = '';
      if (button[2])
        classParam = 'class="' + button[2] + '" ';
      theContent += '<button ' + classParam + 'onclick="' + button[1] + '">' + button[0] + '</button>&emsp;'
    }
  }
  theContent += "<br>";
//  let newDialog = makeDraggablePanel(divID, headerText, hasOpacitySlider, theClass, theStyle, theContent);
  let newDialog = makePanel(divID, theContent, theStyle);
  return newDialog;     // unneccessary?
}

function applyChanges(layerId) {
  let theLayer = szMapServiceLayer.allSublayers.find(function(layer){
    return layer.id === layerId;
  });
  let hexColor = getEl('colorPicker').value;
  theLayer.renderer.symbol.color = mapStuff.hexToColor(hexColor);     // change layer color
  getEl('listItemSwatch'+layerId).style.backgroundColor = hexColor;     // change layerList swatch color
  theLayer.title = getEl('layerNameText').value;
  theLayer.definitionExpression = getEl('defExprText').value;
  view.extent = view.extent;      // Refresh the map
  let newHtml = '<h3>Your changes have been made, and should be visible in the map shortly!</h3><br><button onclick="';
  let onclickAction = "getEl('editQueryLayerDiv').remove()";
  newHtml += onclickAction + '">Close</button>';
  getEl('editQueryLayerDiv').innerHTML = newHtml;
}

function getListItemInfo() {
  console.log("getListItemInfo");
}

function showSiteInfo() {
  setVisible('siteInfoPanel', true);
  getListItemInfo()
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

