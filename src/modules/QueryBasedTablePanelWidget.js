/**
 * Class QueryBasedTablePanelWidget
 *
 * Widget for display of table with map
 *   subclass of QueryBasedPanelWidget
 *
 * Constructor arguments:
 *    mapServiceLayer: MapImageLayer
 *    layerName: String     name of a sublayer of mapServiceLayer
 *    panel: ContentPane    panel where processed query results are displayed
 *    -- perhaps other args for outFields and where clause?
 */


let selectColor = "#DCEEFF";
let unselectColor = "";   // "white";
let padLength = 10;     // left-pad numeric values to same string length (10), so they sort correctly
let padChars = "&nbsp;";    // HTML space escape character

let formatValue = function(value) {
  if (value === null)
    return value;
  let formatting = this.f[this.n];
/*
  if (formatting.plugInFields)
    return fillTemplate(value, formatting);
  else
*/
    return formatNumber(value, formatting);
}

let formatNumber = function(value, formatting) {
  if (!formatting)
    return value;
  let newValue = value;
  if (formatting.useCommas)
    newValue = formatNumber_Commas(value);
  else if (formatting.numDecimals)
    newValue = value.toFixed(formatting.numDecimals);
  else if (formatting.dateFormat)
    newValue = formatNumber_Date(value);
  newValue = padString(newValue, padLength, "left", padChars);
/*
  if (typeof value === "number")
    newValue = '<div style="text-align: right">' + newValue + '</div>';     // right-align if numeric
*/
  return newValue
};

/*
let fillTemplate = function(value, formatting) {
  if (!formatting)
    return value;
  let newValue = value;
  let template = formatting.html;
  if (template) {
    if (formatting.showWhen) {
      if (newValue === formatting.showWhen)
        newValue = template;
      else
        newValue = "";
    }
    let plugInFields = formatting.plugInFields;
    if ((newValue!=="") && plugInFields) {
      let args = formatting.args;
      for (p in plugInFields)
        args = args.replace("{" + p + "}", features[i].attributes[plugInFields[p]]);
      newValue = template.replace("{args}", args);
    }
  }
  return newValue;
}
*/


define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dijit/form/Select",
  "dstore/Memory",
  "dstore/Trackable",
  "dgrid/Grid",
  //"dgrid/OnDemandGrid",           // Optionally, use the "OnDemandGrid" class for Grid instead of the "Grid" class
  "dgrid/extensions/ColumnHider",
  "dgrid/extensions/ColumnReorder",
  "dgrid/extensions/ColumnResizer",
  "dgrid/Selector",
  "dgrid/Selection",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, on, Select, Memory, Trackable, Grid, ColumnHider, ColumnReorder, ColumnResizer, Selector, Selection,
            Query, QueryTask, QueryBasedPanelWidget){


  return declare(QueryBasedPanelWidget, {

/*OBS
    replaceNamesWithValues: function(template, attrs) {
      let a = template.split("@");
      for (let i=0; i<a.length; i++)
        if (a[i] in attrs) {
          a[i] = attrs[a[i]];
        }
      return a.join("");
    },
*/

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

      this.hasTable = true;

      this.hideEmptyColumns = true;
      this.store = null;
      this.grid = null;
      this.selectedRow = null;


      this.makeTable = function(fields, features) {
        // Create a dGrid table from returned data
        let tableColumns = [];
        let nonNullCount = new Object();
        nonNullList = new Object();       //Lists of unique values found
        //let maxValue = new Object();
        let columnStyleCSS = "";

        if (this.calcFields)
          for (let f in this.calcFields) {
            let p = -1;
            if (this.calcFields[f].afterField)
              p = fields.findIndex(obj => obj.name == this.calcFields[f].afterField);
            let newField = {
              name: this.calcFields[f].name,
              alias: this.calcFields[f].name,
              type: "string"
            };
            fields.splice(p + 1, 0, newField);
          }



        for (let i=0; i<fields.length; i++) {
          // Use supplied title for column name
          let title = getIfExists(this,"specialFormatting." + fields[i].name + ".title");
          if (title === null)
            title = fields[i].alias;

          let hidden = getIfExists(this,"specialFormatting." + fields[i].name + ".hidden");

          let formatter = formatValue.bind({f: this.specialFormatting, n: fields[i].name});
/*
          let plugInFields = getIfExists(this,"specialFormatting." + fields[i].name + ".plugInFields");
          if (plugInFields)
*/

          tableColumns.push({
            field: fields[i].name,
            label: title,
            hidden: hidden,
            formatter: formatter
          });


          // If field column width is specified in widget settings, use that.  Otherwise, default to fit title
          let colWidth = getIfExists(this,"specialFormatting." + fields[i].name + ".colWidth");
          if (!colWidth)
            colWidth = (title.length) * 15;

          columnStyleCSS += ".dataTable .field-" + fields[i].name + " { width: " + colWidth + "px;} ";
          //columnStyleCSS += ".dataTable .field-" + fields[i].name + " { width: " + colWidth + "px; text-align: right} ";

          nonNullCount[fields[i].name] = 0;
          nonNullList[fields[i].name] = [];     //Lists of unique values found
          //maxValue[fields[i].name] = 0;
        }

        // Create style-sheet for columns
        let sheet = document.createElement('style');
        sheet.innerHTML = columnStyleCSS;
        document.body.appendChild(sheet);

        let tableData = [];


        for (let i=0; i<features.length; i++) {

          for (f in this.calcFields)      // Make duplicate fields:  Value is the same, attribute name has '2' added to end
            features[i].attributes[this.calcFields[f].name] = "0";      //Insert new attribute with dummy value for calculated field

          let origAttrs = Object.assign({},features[i].attributes);     // Make a "copy" of the attributes object
          for (a in features[i].attributes)
            if (features[i].attributes[a] !== null) {

              let template = getIfExists(this,"specialFormatting." + a + ".html");
              if (template) {     // If template exists, use this to replace attribute value with HTML code
                let fmtInfo = this.specialFormatting[a];
                if (fmtInfo.showWhen) {
                  if (features[i].attributes[a] === fmtInfo.showWhen)
                    features[i].attributes[a] = template;
                  else
                    features[i].attributes[a] = "";
                }
                if ((features[i].attributes[a]!=="") && fmtInfo.plugInFields) {
                  let args = fmtInfo.args;
                  for (p in fmtInfo.plugInFields)
                    args = args.replace("{" + p + "}", origAttrs[fmtInfo.plugInFields[p]]);
                  features[i].attributes[a] = template.replace("{args}", args);
                }
              }

              if (features[i].attributes[a]) {
                nonNullCount[a] += 1;
                const f = legendFilters.findIndex(obj => obj.fieldName === a);
                if (f !== -1) {
                  const v = features[i].attributes[a].toString();
                  if (!nonNullList[a].includes(v))
                    nonNullList[a].push(v);
                }
              }
          }

          if (this.idField) {     // For idField, insert span for identifying original row number, so correct feature is identified regardless of current table order
            let idFieldValue = features[i].attributes[this.idField];
            features[i].attributes[this.idField] = idFieldValue + "<span id='" + this.baseName + "@" + i + "@'></span>";
            // For identifying the equivalent row in the table, on feature click
            // "@" used for easy splitting out of values
          }

          tableData.push(features[i].attributes);
        }

        filterLegend(this.mapServiceLayer.title, nonNullList);

        this.store = new (declare([Memory, Trackable]))({
          data: tableData
        });

        // Hide any columns that don't have data
        for (let c=0; c<tableColumns.length; c++) {
          let col = tableColumns[c];
          if (nonNullCount[col.field]===0)
            col.hidden = true;       // TODO: sometimes can't show column subsequently?
        }

        // Instantiate grid
        this.grid = new (declare([Grid, ColumnHider, ColumnReorder, ColumnResizer, Selection]))({
          className: "dataTable",
          loadingMessage: 'Loading data...',
          noDataMessage: 'No results found.',
          //collection: this.store,     // If using OnDemandGrid, include this
          columns: tableColumns
        }, this.displayDivName);
        //this.grid.startup();              // If using OnDemandGrid, include this
        this.grid.renderArray(tableData);   // If using Grid, include this

        this.grid.on('dgrid-error', function(event) {
          console.log('dgrid-error:  ' + event.error.message);
        });

        // This doesn't work when using Grid instead of OnDemandGrid
        // TODO: Implement SingleQuery, to get dgrid-refresh-complete?  (Tried once, didn't work.)
        this.grid.on('dgrid-refresh-complete', function(event) {
          let rows = event.grid._rows;
          for (let r=0; r<rows.length; r++)
            rows[r].setAttribute("id", "tableRow" + r);
          this.repositionTotalLabels(event.grid.columns);
        }.bind(this));

        this.grid.on('dgrid-columnresize', function(event) {
          setTimeout(function(){      // Time delay is necessary because up to 2 column-resize events can be triggered by a single mouse-up event
            this.w.repositionTotalLabels(this.e.grid.columns);
            }.bind({e: event, w: this}), 100);
        }.bind(this));

        this.grid.on('.dgrid-header .dgrid-cell:mouseover', function (event) {
          this.unHighlightCurrentRow();     // If row has been highlighted due to feature mouseover, this unhighlights it
          this.showHeaderTooltip(event);
        }.bind(this));

        this.grid.on('.dgrid-header .dgrid-cell:mouseout', function (event) {
          this.hideGridTooltip(event);
        }.bind(this));

        this.grid.on('.dgrid-content .dgrid-row:mouseover', function (event) {
          if (this.noGeometry)
            return;
          let row = this.grid.row(event);
          let rowIndex = event.selectorTarget.rowIndex;
          let gObjFieldHtml = this.store.data[rowIndex][this.idField];
          let gObjIndex = event.selectorTarget.innerHTML.split("@")[1];
          let associatedGraphic = this.clickableLayer.graphics.items[gObjIndex];
          this.showGridTooltip(event, rowIndex, associatedGraphic);
          if (this.clickableLayer.visible) {
            this.displayPlayButton(associatedGraphic, row);
          }
          // row.element === the element with the dgrid-row class
          // row.id === the identity of the item represented by the row
          // row.data === the item represented by the row
        }.bind(this));

        this.grid.on('.dgrid-content .dgrid-row:mouseout', function (event) {
          if (this.noGeometry)
            return;
          this.hideGridTooltip(event);
        }.bind(this));

        // If any row-associated wigets, update them when the row is clicked
        this.grid.on('.dgrid-content .dgrid-row:click', function (event) {
          let subWidgetInfo = this.tabInfo[this.currTab].subWidgetInfo;
          if (subWidgetInfo) {
            console.log("update row-associated widgets");
            let row = this.grid.row(event);

            let rowIndex = event.selectorTarget.rowIndex;
            let gObjFieldHtml = this.store.data[rowIndex][this.idField];
            let gObjIndex = event.selectorTarget.innerHTML.split("@")[1];
            //let associatedGraphic = this.clickableLayer.graphics.items[gObjIndex];

            for (let i=0; i<subWidgetInfo.length; i++) {
              let A = subWidgetInfo[i].split(":");
              let dataPresentField = A[2];
              let w = eval(A[0]);
              if (row.data[dataPresentField] !== "") {
                let whereField = A[1];
                let theValue = stripHtml(row.data[whereField]);
                if (A[3] === "string")                  // Check if string or numeric.  If numeric, A[3] probably isn't there.
                  theValue = "'" + theValue + "'";      // If it's a string then add quotes
                let theWhere = whereField + "=" + theValue;
                if (!w.queryPending) {
                  w.queryPending = true;
                  w.runQuery(null, {theWhere});
                }
              } else {
                showPanelContents(w.baseName, false, w.noDataMsg);
              }
            }
          }
        }.bind(this));

        /*
                this.grid.watch("_rows", function() {
                  alert("Hey!");
                });
        */

        this.repositionTotalLabels = function(columns) {
          if (!this.totalOutFields)
            return;
          let posTop = $(this.footerWrapper).position().top + 2;
          for (f in this.totalLabels) {
            let label = this.totalLabels[f];
            let column = columns[label.colNum];
            let colPos = $(column.headerNode.contents).position().left;
            if (this.baseName === "faSpTable")    //TODO:  This is not working correctly for draggable panels
              colPos = colPos - 300;              // Temporary HACK
            label.node.style.left = colPos + "px";
          }
        };

        this.showHeaderTooltip = function(event){
          let fieldName = event.selectorTarget.field;
          let description = this.attrName(fieldName);
          if (description !== fieldName) {
            let toolTipText = description;
            let cell=this.grid.cell(event);
            dijit.showTooltip(toolTipText, cell.element);
          }
        };

        this.showGridTooltip = function(event, r, associatedGraphic){
          try {     //JN
            let cell = this.grid.cell(event);
            if (cell.column) {
              let fieldName = cell.column.field;
              let fieldValue = associatedGraphic.attributes[fieldName];
              if (!fieldValue)
                return;
              let fieldValueDescr = this.attrValDescription(fieldName, fieldValue);
              if (fieldValueDescr !== fieldValue) {
                let toolTipText = fieldValueDescr;
                dijit.showTooltip(toolTipText, cell.element);
              }
            }
          } catch(err) {
            // TODO: Figure this out
            console.log("ERROR in showGridTooltip");
          }
        };

        this.hideGridTooltip = function(event){
          let cell=this.grid.cell(event);
          dijit.hideTooltip(cell.element);
        };

      }


      this.processFeatures = function(features) {
        getEl(this.displayDivName).innerHTML = "";      // clear the DIV
        this.makeClickableGraphics(features);
        this.makeTable(this.fields, features);
        if (this.totalOutFields) {
          if (features.length === 0) {
            for (l in this.totalLabels)
              this.totalLabels[l].node.innerHTML = "0";
            return;
          }
          //let totalsLayerName = this.layerBaseName + this.ddTotalsLayerNameAddOn;
          this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.totalsLayerName].toString();
          this.query.outFields = this.totalOutFields;
          this.query.orderByFields = null;
          this.queryTask.execute(this.query).then(function(results){
            let totalValues = results.features[0].attributes;
            for (a in totalValues)
              this.totalLabels[a].node.innerHTML = formatNumber(totalValues[a], this.specialFormatting[a]);
            this.repositionTotalLabels(this.grid.columns);
          }.bind(this), function(error) {
            console.log(this.baseName + ":  QueryTask for Totals failed.");
          }.bind(this));

        }

      };


      this.getDropDownOptions = function(ddNum, headerContent) {
        let ddItem = this.dropDownInfo[ddNum];
        let subLayerURL = this.mapServiceLayer.url + "/" + this.sublayerIDs[ddItem.subLayerName];
        let queryTask = new QueryTask(subLayerURL);
        let query = new Query();
        with (query) {
          outFields = ddItem.ddOutFields;
          orderByFields = ddItem.orderByFields;
          where = "";
        }
        queryTask.query = query;
        queryTask.execute(query).then(function(results){
          let options = ddItem.options;
          let ddFields = ddItem.ddOutFields;
          for (let i=0;  i<results.features.length; i++) {
            let a = results.features[i].attributes;
            let v = a[ddFields[1]];
            let extentStr = null;
            if (a["Envelope"])
              extentStr = a["Envelope"];
            let theLabel = a[ddFields[0]];
            if (ddItem.labelTemplate) {
              theLabel = "";
              let arr = ddItem.labelTemplate.split(",");
              for (let j=0; j<arr.length; j++) {
                if (arr[j].startsWith("*"))
                  theLabel += a[arr[j].slice(1)];
                else
                  theLabel += arr[j];
              }
            }
            options.push({
              label: theLabel,
              value: v,
              extent: extentStr
            });
          }
          this.w.makeDropdownOptionsHtml(ddNum, this.headerContent)
        }.bind({ddItem: ddItem, headerContent: headerContent, w: this}))/*.else({
          console.log("Query error in getDropDownOptions");
        })*/;
      };


      this.makeDropdownOptionsHtml = function(ddNum, domId) {
        let ddItem = this.dropDownInfo[ddNum];
        let options = ddItem.options;
        let theHtml = '';
        for (i in options) {
          let extentStr = '';
          if (options[i].extent)
            extentStr = 'extent="' + options[i].extent + '" ';
          theHtml += '<option ' + extentStr + 'value="' + options[i].value + '">' + options[i].label + '</option>';
        }
/*
        ddItem.options.forEach(function(item, index, array) {
        });
*/
        getEl(domId).innerHTML = theHtml;
      };


/*
      this.makeTableFooterHtml = function() {
        let footerDivNode = getEl(this.footerDivName);
        this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
        footerDivNode.appendChild(this.footerWrapper);
      };
*/


      this.makeTableHeaderHtml = function() {
        let headerDivNode = getEl(this.headerDivName);
        let headerContent = document.createElement("SPAN");
        this.headerContent = headerContent;
        headerDivNode.appendChild(headerContent);

        if (this.tableHeaderTitle)
          headerContent.innerHTML = '&emsp;<label id="' + this.baseName + 'TableHeaderTitle" class="tableHeaderTitle">' + this.tableHeaderTitle + ' &emsp;</label>';

        if (this.dropDownInfo) {
          for (d in this.dropDownInfo) {
            let ddItem = this.dropDownInfo[d];
            ddItem.domId = this.baseName + "Dropdown_" + ddItem.ddName;
            let ddSpanId = ddItem.domId.replace("_","Span_");
            let ddHtml = '&emsp;<LABEL class="boldLabel">' + ddItem.ddName + ': </LABEL>';
            let args = this.objName + ',' + d + ',' + ddItem.domId;
            ddHtml += '<select id="' + ddItem.domId + '" onchange="dropdownSelectHandler(' + args + ')" ></select>&emsp;';
            headerContent.innerHTML += '<span id="' + ddSpanId + '">' + ddHtml + '</span>';
            ddItem.dom = getEl(ddItem.domId);
            if (ddItem.subLayerName) {
              this.getDropDownOptions(d, ddItem.domId);
            } else {
              this.makeDropdownOptionsHtml(d, ddItem.domId);
            };
          }
        }

        let fCtID = this.baseName + 'Label_featureCount';
        this.featureCountElId = fCtID;
        let fCtSpanId = fCtID.replace("_","Span_");
        let fCtHtml = '&emsp;<LABEL class="boldLabel" id="' + fCtID + '"></LABEL>&emsp;';
        let spanHtml = '<span id="' + fCtSpanId + '">' + fCtHtml + '</span>';

        //let titleEl = getEl("tableQueryExpando_Title");
        //titleEl.innerHTML = spanHtml;
        headerContent.innerHTML += spanHtml;

        if (this.clickableLayer) {
          this.cbID = this.baseName + 'Checkbox_showFeatures';
          let cbSpanId = this.cbID.replace("_","Span_");
          let args = this.objName + ',' + this.cbID;
          let cbHtml = '&emsp;<input id="' + this.cbID + '" type="checkbox" checked onclick="checkbox_showFeatures_clickHandler(' + args + ')">Show markers&emsp;';
          //titleEl.innerHTML = '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
          headerContent.innerHTML += '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
          getEl(this.cbID).checked = this.clickableLayer.visible;
        }

        // Total Species Data
        if (this.speciesTableInfo) {
          let spTableSpanId = this.baseName + 'IconSpeciesTable';
          let spTableHtml = '&emsp;<LABEL class="boldLabel">' + this.speciesTableInfo.iconLabel + '</LABEL>&ensp;';
          spTableHtml += "<img src='assets/images/table.png' onclick='mapStuff.openSpeciesTable(" + this.speciesTableInfo.args + ")' height='15' width='15' alt='' title='Show species table for all of Alaska'>";
          headerContent.innerHTML += '<span id="' + spTableSpanId + '">' + spTableHtml + '</span>';
        }
      };

      this.setHeaderItemVisibility = function() {
        for (let c=0; c< this.headerContent.children.length; c++)
          this.headerContent.children[c].style.display = "none";
        for (c in this.visibleHeaderElements)
          getEl(this.visibleHeaderElements[c]).style.display = "inline";
      }

      // Highlight row associated with the graphic feature, and return the DGrid row
      this.highlightAssociatedRow = function(graphic) {
        this.unHighlightCurrentRow();
        let r = graphic.attributes.item;
        let rowId = this.baseName + "@" + r + "@";      // Embedded in idField at feature creation
        this.selectedRow = getEl(rowId).parentNode.parentNode;
        this.selectedRow.style.backgroundColor = selectColor;
        if (!isInViewport(this.selectedRow,this.grid.bodyNode))
          this.selectedRow.scrollIntoView();
        let dataRow = this.selectedRow.parentNode.parentNode.rowIndex;
        return this.grid.row(dataRow);
      }

      this.unHighlightCurrentRow = function() {
        if (this.selectedRow)
          this.selectedRow.style.backgroundColor = unselectColor;
      }

      this.rowHtmlToLines = function(row) {
        console.log("rowHtmlToLines");
        let th = this.grid.headerNode.getElementsByTagName("TH");
        let tr = row.element;
        let td = tr.getElementsByTagName("TD");
        let h = "";
        let excludeCols = [];
        if (this.tabInfo) {
          let currTabInfo = this.tabInfo[this.currTab];
          if (currTabInfo.popupExcludeCols)
            excludeCols = currTabInfo.popupExcludeCols;
        }
        for (i=0; i<td.length; i++) {
          let colHeader = this.attrName(th[i].innerText);
          if (!excludeCols.includes(colHeader)) {
            let value =row.data[this.grid.columns[i].field];
            if (colHeader === "" && value.includes("title=")) {
              let p = value.indexOf("title=");
              colHeader = value.slice(p).split("'")[1];
            }
            if (value) {
              if (typeof value === "string")
                value = value.replace("actionIcon", "actionIconPopup");    // If it's an icon with class "actionIcon", change to class for display in popup
              value = this.attrValDescription(th[i].field, value);
              if (colHeader !== "")
                colHeader += ":";
              h += "<div><b>" + colHeader + "</b>&nbsp;&nbsp;" + value + "</div>";
            }
          }
        }
        return h;
      }

      this.makeTableHeaderHtml();
/*
      if (this.footerDivName)
        this.makeTableFooterHtml();
*/

    },

    makeFooterElements: function() {
       if (!this.inherited(arguments))     // Run inherited code from QueryBasedPanelWidget
         return;      // If no footer created, then don't execute the rest of the function
/*
      let footerDivNode = getEl(this.footerDivName);
      footerDivNode.innerHTML = "";
      this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
      footerDivNode.appendChild(this.footerWrapper);
*/
      // make LABEL elements for totals
      if (this.totalOutFields) {
        this.footerWrapper.innerHTML = "";
        let fields = this.totalOutFields;
        this.totalLabels = {};
        for (f in fields) {
          let fieldName = fields[f];
//         let colNum = this.tabInfo[this.currTab].featureOutFields.indexOf(fields[f]);
          let colNum = this.featureOutFields.indexOf(fields[f]);
          if (colNum === -1)
            this.totalLabels[fieldName] = null;
          else {
            this.totalLabels[fieldName] = {
              colNum: colNum,
              node: makeHtmlElement("LABEL", null, "totalBox", "position: absolute; top: 0; left: 0px", "Total")
            }
            this.footerWrapper.appendChild(this.totalLabels[fieldName].node);
          }
        }
      }
    }

    });


});

