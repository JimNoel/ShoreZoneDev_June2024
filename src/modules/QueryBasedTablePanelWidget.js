/**
 * Class QueryBasedTablePanelWidget
 *
 * Widget for display of table with map
 *   subclass of QueryBasedPanelWidget
 *
 * Constructor arguments:
 *    mapServiceLayer: MapImageLayer
 *    subLayerName: String     name of a sublayer of mapServiceLayer
 *    panel: ContentPane    panel where processed query results are displayed
 *    -- perhaps other args for outFields and where clause?
 */


let selectColor = "#DCEEFF";
let unselectColor = "";   // "white";
let padLength = 10;     // left-pad numeric values to same string length (10), so they sort correctly
let padChars = "&nbsp;";    // HTML space escape character

let formatValue = function(value) {
  if (value===null || (typeof value)!=="number")
    return value;
  let formatting = this.f[this.n];
  return formatNumber(value, formatting);
}

let formatNumber = function(value, formatting) {
  if (!formatting)
    return value;
  let newValue = value;
  if (formatting.useCommas)
    newValue = formatNumber_Commas(value);
  else if (formatting.numDecimals >= 0)
    newValue = value.toFixed(formatting.numDecimals);
  else if (formatting.dateFormat)
    newValue = formatNumber_Date(value);
  newValue = padString(newValue, padLength, "left", padChars);    // pad to the left, so numbers (as strings) sort correctly
/*
  if (typeof value === "number")
    newValue = '<div style="text-align: right">' + newValue + '</div>';     // right-align if numeric
*/
  return newValue
};


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
  "esri/geometry/support/webMercatorUtils",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, on, Select, Memory, Trackable, Grid, ColumnHider, ColumnReorder, ColumnResizer, Selector, Selection,
            webMercatorUtils, Query, QueryTask, QueryBasedPanelWidget){


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
      this.origVisibleHeaderElements = this.visibleHeaderElements;
      this.columnsStyleSheet = document.createElement('style');
      document.body.appendChild(this.columnsStyleSheet);

/*
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
*/

      this.showCsvDownloadDialog = function() {
        csvDownloadWidget = this;
        let dfltFileName = "TableData";
        if (this.draggablePanelId)
          dfltFileName = getEl(this.draggablePanelId + "_headerText").innerText;
        else if (this.tabInfo)
          dfltFileName = this.tabInfo[this.currTab].tabTitle;
        else if (this.popupTitle)
          dfltFileName = this.popupTitle;
        dfltFileName += ".csv";
        let fileNameEl = getEl("text_dlFileName");
        fileNameEl.value = dfltFileName;
        let fileName = dfltFileName.split(".")[0] + ".csv";     // ensure the name has ".csv" extension
        let downloadPanel = getEl("downloadPanel");
        downloadPanel.value = dfltFileName;
        setVisible("downloadTypeDiv", this.rawDownloadOption);
        setVisible(downloadPanel, true);
      };

      this.csvQueryResponseHandler = function(results) {
        setDisplay("dlWaitMsg", false);
        setVisible("downloadPanel", false);
        results = JSON.parse(results);
        downloadCsv(results.csv, this.makeHeaderCsv(true));
      }

      this.queryCsvData = function() {
        let theUrl = this.makeCustomRestQueryUrl("", this.customRestService.downloadSql, "csv");
        queryServer(theUrl, false, this.csvQueryResponseHandler.bind(this))
      };

      this.makeHeaderCsv = function(forRawData) {
        let csv = '"Table ';
        if (forRawData)
          csv = '"Raw data ';
        csv += ' download from NOAA Fisheries Nearshore Fish Atlas of Alaska, ';
        let today = new Date();
        csv += today.toDateString() + '"\n';
        csv += '"' + downloadPanel.value.split('.')[0] + '"\n\n';
        if (forRawData)
          csv = "Raw  Fish Atlas data\n\n"
        csv += "Selection Criteria:\n";
        let baseWhere = this.customRestService.baseWhere;
        if (baseWhere)
          csv += baseWhere.replace("=",",") + "\n";
        for (let d=0; d<this.dropDownInfo.length; d++) {
          let ddInfo = this.dropDownInfo[d];
          if (this.dropdownElements.includes(ddInfo.wrapperId)) {
            let v = ddInfo.SelectedOption;
            if (!["showCol", "All"].includes(v)) {
              let i = ddInfo.options.findIndex(obj => obj.value === v);
              let L = ddInfo.options[i].label;
              csv += ddInfo.whereField + "," + v + "\n";
            }
          }
        }

        let extent = this.customRestService.extent;
        if (extent) {
          let swLonLat = webMercatorUtils.xyToLngLat(extent.xmin, extent.ymin);
          let neLonLat = webMercatorUtils.xyToLngLat(extent.xmax, extent.ymax);
          csv += "Longitude,Between " + swLonLat[0] + " and " + neLonLat[0] + " degrees\n";
          csv += "Latitude,Between " + swLonLat[1] + " and " + neLonLat[1] + " degrees\n";
        }

        return csv + "\n";
      };

      this.getCsvFromTable = function() {
        if (!this.downloadExcludeFields) {
          alert("ERROR: This table is not set up for downloading.");
          return;
        }
        let data = this.store.data;
        let columns = [];
        var csv = '';
        for (c in this.grid.columns) {
          let column = this.grid.columns[c];
          let fName = column.field;
          if (!this.downloadExcludeFields.includes(fName) && !column.hidden) {
            columns.push(fName);
            let columnLabel = null;
            let specialFormatting = this.specialFormatting[fName];
            if (specialFormatting)
              columnLabel = specialFormatting.title;
            if (!columnLabel)
              columnLabel = fName;
            if (csv !== '')
              csv += ',';
            csv += '"' + columnLabel + '"';
          }
        }
        csv += '\n';
        for (let r=0; r<data.length; r++) {
          let row = data[r];
          let rowCsv = '';
          //for (c in this.grid.columns) {
          for (let c=0; c<columns.length; c++) {
            let fName = columns[c];     // this.grid.columns[c].field;     //
            //if (!this.downloadExcludeFields.includes(fName)) {
            let value = row[fName];
            if (!value)
              value = "";
            if (typeof value === "string")
              value = '"' + stripHtml(value) + '"';     // value.split("<")[0];
            let specialFormatting = this.specialFormatting[fName];
            if (specialFormatting && specialFormatting.dateFormat)
              value = '"' + formatNumber_Date(value) + '"';
            if (rowCsv !== '')
              rowCsv += ',';
            rowCsv += value;
            //}
          }
          csv += rowCsv + '\n';
        }
        return csv;
      };

/*
      this.downloadTableData = function() {
        if (!this.downloadExcludeFields) {
          alert("ERROR: This table is not set up for downloading.");
          return;
        }
        let data = this.store.data;

        let columns = [];
        var csv = '';
        for (c in this.grid.columns) {
          let column = this.grid.columns[c];
          let fName = column.field;
          if (!this.downloadExcludeFields.includes(fName) && !column.hidden) {
            columns.push(fName);
            let columnLabel = null;
            let specialFormatting = this.specialFormatting[fName];
            if (specialFormatting)
              columnLabel = specialFormatting.title;
            if (!columnLabel)
              columnLabel = fName;
            if (csv !== '')
              csv += ',';
            csv += '"' + columnLabel + '"';
          }
        }
        csv += '\n';

        for (let r=0; r<data.length; r++) {
          let row = data[r];
          let rowCsv = '';
          //for (c in this.grid.columns) {
          for (let c=0; c<columns.length; c++) {
            let fName = columns[c];     // this.grid.columns[c].field;     //
            //if (!this.downloadExcludeFields.includes(fName)) {
              let value = row[fName];
              if (!value)
                value = "";
              if (typeof value === "string")
                value = '"' + stripHtml(value) + '"';     // value.split("<")[0];
              let specialFormatting = this.specialFormatting[fName];
              if (specialFormatting && specialFormatting.dateFormat)
                value = '"' + formatNumber_Date(value) + '"';
              if (rowCsv !== '')
                rowCsv += ',';
              rowCsv += value;
            //}
          }
          csv += rowCsv + '\n';
        }
        let dfltFileName = "TableData.csv";
        if (this.draggablePanelId)
          dfltFileName = getEl(this.draggablePanelId + "_headerText").innerText + ".csv";
        else if (this.tabInfo)
          dfltFileName = this.tabInfo[this.currTab].tabTitle + ".csv";
        else if (this.popupTitle)
          dfltFileName = this.popupTitle + ".csv";
        let hiddenElement = getEl("hidden_downloadTable");
        // Using encodeURIComponent instead of encodeURI to ensure that # and other special characters are encoded
        hiddenElement.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
        //download_csv(csv, dfltFileName, this.rawDownloadOption);
      }
*/

      this.makeTable = function(fields, features) {     // Generate data table.  If no new features, then empty the DOM for the table
        // Create a dGrid table from returned data
        getEl(this.displayDivName).innerHTML = "";      // clear the DIV
        if (features.length === 0)
          return;

        let tableColumns = [];
        let nonNullCount = new Object();
        nonNullList = new Object();       //Lists of unique values found
        let maxChars = new Object();
        let totals = {};
        if (this.summaryInfo && this.summaryInfo.totals) {
          totals = this.summaryInfo.totals;
        }
        let columnStyleCSS = "";

        if (this.calcFields)
          for (let f in this.calcFields) {
            let p = -1;
            let calcField = this.calcFields[f];
            if (calcField.afterField)
              p = fields.findIndex(obj => obj.name == calcField.afterField);
            let newField = {
              name: calcField.name,
              alias: calcField.name,
              type: "string"
            };
            fields.splice(p + 1, 0, newField);
          }

        for (let i=0; i<fields.length; i++) {
/*
          // Use supplied title for column name
          let title = getIfExists(this,spclFmtChain + ".title");
          if (title === null)
            title = fields[i].alias;

          let hidden = getIfExists(this,spclFmtChain + ".hidden");

          let formatter = formatValue.bind({f: this.specialFormatting, n: fields[i].name});

          tableColumns.push({
            field: fields[i].name,
            label: title,
            hidden: hidden,
            formatter: formatter
          });

          // If field column width is specified in widget settings, use that.  Otherwise, default to fit title
          let colWidth = getIfExists(this,spclFmtChain + ".colWidth");
          if (!colWidth)
            colWidth = (title.length) * 15;

          columnStyleCSS += ".dataTable .field-" + fields[i].name + " { width: " + colWidth + "px;} ";

*/
          // Initialize lists, counts, totals
          let fName = fields[i].name;
          nonNullCount[fName] = 0;
          nonNullList[fName] = [];     //Lists of unique values found
          maxChars[fName] = 0;
          if (totals[fName]) {
            totals[fName].value = 0;
          }
        }

/*
        // Create style-sheet for columns
        let sheet = document.createElement('style');
        sheet.innerHTML = columnStyleCSS;
        document.body.appendChild(sheet);
*/

        let tableData = [];

        for (let i=0; i<features.length; i++) {

          for (f in this.calcFields)      // Make duplicate fields:  Value is the same, attribute name has '2' added to end
            features[i].attributes[this.calcFields[f].name] = "0";      //Insert new attribute with dummy value for calculated field

          let origAttrs = Object.assign({},features[i].attributes);     // Make a "copy" of the attributes object
          for (a in features[i].attributes)
            if (features[i].attributes[a] !== null) {

              let longValue = getIfExists(this,"specialFormatting." + a + ".longValue");
              if (longValue) {          // If longValue exists, use this to replace short value with long value
                if (longValue.lookupColName) {
                  let widget = this;      // default:  look up values from a field in the current widget
                  if (longValue.widget)
                    widget = eval(longValue.widget);    // look up values from a field in another widget
                  let value = features[i].attributes[a];
                  let newValue = widget.attrValDescription(longValue.lookupColName, value);
                  if (longValue.removeUpTo) {
                    let p = newValue.indexOf(longValue.removeUpTo);
                    newValue = newValue.slice(p+1);
                  }
                  features[i].attributes[a] = newValue;
                } else {      // Look up from explicit list contained in longValue object
                  let newValue = longValue[features[i].attributes[a]];
                  if (newValue)
                    features[i].attributes[a] = newValue;
                }
              }

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

              let nullDisplay = getIfExists(this,"specialFormatting." + a + ".nullDisplay");
              if (nullDisplay && features[i].attributes[a]!=="")
                features[i].attributes[a] = nullDisplay;


              if (features[i].attributes[a]) {
                nonNullCount[a] += 1;
                const v = features[i].attributes[a].toString();
                let l = stripHtml(v).length;
                if (l > maxChars[a])
                  maxChars[a] = l;
                const f = legendFilters.findIndex(obj => obj.fieldName === a);
                let ddIndex = -1;
                if (this.dropDownInfo)
                  ddIndex = this.dropDownInfo.findIndex(obj => obj.ddName === a);
                if ((f !== -1) || (ddIndex !== -1)) {
                  if (!nonNullList[a].includes(v))
                    nonNullList[a].push(v);
                }
                if (totals[a]) {
                  totals[a].value += features[i].attributes[a];
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

        //let columnWidths = [];

        for (let i=0; i<fields.length; i++) {
          let spclFmtChain = "specialFormatting." + fields[i].name;
          // Use supplied title for column name
          let title = getIfExists(this,spclFmtChain + ".title");
          if (title === null)
            title = fields[i].alias;

          let hidden = getIfExists(this,spclFmtChain + ".hidden");

          let formatter = formatValue.bind({f: this.specialFormatting, n: fields[i].name});

          tableColumns.push({
            field: fields[i].name,
            label: title,
            hidden: hidden,
            formatter: formatter
          });

          // If field column width is specified in widget settings, use that.  Otherwise, default to fit title
          // TODO: Possibly, use maxChars to modify colWidth
          let colWidth = getIfExists(this,spclFmtChain + ".colWidth");
          //columnWidths[i] = colWidth;
          if (!colWidth)
            colWidth = title.length * 15;
          let bgColorCss = "background-color: transparent;"     // This ensures that the column color reverts back to default on switching tabs
/*
          if (this.extraColumns && this.extraColumns.includes(fields[i].name))
            bgColorCss = "background-color: cornsilk;"
*/
/*
          if (colWidth === -1)
            columnStyleCSS += ".dataTable .field-" + fields[i].name + " {width: auto;" + bgColorCss + "} ";
          else
*/
            columnStyleCSS += ".dataTable .field-" + fields[i].name + " {width: " + colWidth + "px;" + bgColorCss + "} ";

/*
          nonNullCount[fields[i].name] = 0;
          nonNullList[fields[i].name] = [];     //Lists of unique values found
          maxChars[fields[i].name] = 0;
*/
        }

        this.columnsStyleSheet.innerHTML = columnStyleCSS;
/*
        // Create style-sheet for columns
        let sheet = document.createElement('style');
        sheet.innerHTML = columnStyleCSS;
        document.body.appendChild(sheet);
*/

        filterLegend(this.mapServiceLayer.title, nonNullList);

        this.store = new (declare([Memory, Trackable]))({
          data: tableData
        });

        // Hide any columns that don't have data
        for (let c=0; c<tableColumns.length; c++) {
          let col = tableColumns[c];
          if (this.columnsHideable)
            col.hidden = (nonNullCount[col.field]===0)?true:false;
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
        this.hideHiddenItems();

        //this.SetColumnWidths(columnWidths);

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
              //let dataPresentField = A[2];
              let cellValue = row.data[A[2]];
              let w = eval(A[0]);
              if (cellValue && cellValue!=="") {      // (sometimes the query can return NULL instead of empty string)
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
                updateNoFeaturesMsg([w], w.noDataMsg);
                //showEnabledDisabled(w.baseName, false, w.noDataMsg);
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
            let column = null;      // columns[label.colNum];     // superceded by following lines
            for (c in columns) {
              if (columns[c].field === f)
                column = columns[c];
            }
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

      // Run queryTask.executeForCount to get counts of unique field values.  (Currently used in Fish Atlas, for counts of Hauls & Species.)
      this.queryDistinctCounts = function(f) {
        let countInfo = this.summaryInfo.counts[f];

        // customRestService option
        if (countInfo.serviceUrl) {
          let theUrl = this.makeCustomRestQueryUrl("", countInfo.sqlTemplate, "count");
          if (this.query.where !== "")
            theUrl += " Where " + this.query.where;
          queryServer(theUrl, false, function(results){
            this.countQueryResponseHandler(results, f);
          }.bind(this));
          return;
        }

        // If not customRestService, then use ArcGIS query
        let queryTask = new QueryTask();
        queryTask.url = this.mapServiceQueryUrl(countInfo.tableName);      // this.mapServiceLayer.url + "/" + this.sublayerIDs[countInfo.tableName];
        let query = new Query();
          query.where = this.query.where;
          query.outFields = [countInfo.countField];
          query.returnDistinctValues = true;

        queryTask.executeForCount(query).then(function(results){
          this.countQueryResponseHandler(results, f);
          //this.totalLabels[f].node.innerHTML = formatNumber(results, this.specialFormatting[f]);
        }.bind(this), function(error) {
          console.log(this.baseName + ":  QueryTask for distinct counts on " + f + " failed.");
        }.bind(this));
      }

      this.countQueryResponseHandler = function(results, f) {
        this.totalLabels[f].node.innerHTML = formatNumber(results, this.specialFormatting[f]);
      }

      this.setTotals = function(features) {
        if (!this.totalOutFields)
          return;
        if (features.length === 0) {
          for (l in this.totalLabels)
            this.totalLabels[l].node.innerHTML = "0";
          return;
        }

        let totals = this.summaryInfo.totals;
        for (f in totals) {
          this.totalLabels[f].node.innerHTML = formatNumber(totals[f].value, this.specialFormatting[f]);
        }

        let counts = this.summaryInfo.counts;
        for (f in counts) {
          this.queryDistinctCounts(f);
        }

        this.repositionTotalLabels(this.grid.columns);
      };


      this.processFeatures_Widget = function(features) {
        this.makeTable(this.fields, features);
        this.setTotals(features);
      };

      this.processDropdownQueryResults = function(results, ddItem, w) {
        ddItem.options = [];    // ddItem.noSelOption;
        let options = ddItem.options;
        if (ddItem.showColumnOption) {
          options.push(ddItem.showColumnOption);
          ddItem.showColOption_Id = ddItem.ddId + "_optionShowCol";
          if (this.extraColumns)
            ddItem.showColOption_Visible = this.extraColumns.includes(ddItem.columnField);
        }
        if (!ddItem.noSelOption)
          ddItem.noSelOption = dfltNoSelOption;
        options.push(ddItem.noSelOption);
        let ddFields = ddItem.ddOutFields;
        for (let i=0;  i<results.features.length; i++) {
          let a = results.features[i].attributes;
          let v = a[ddFields[0]];
          if (ddFields.length >= 2)    // If only 1 item in ddFields, set v to that, otherwise set v to the 2nd item.
            v = a[ddFields[1]];
          let extentStr = null;
          if (a["Envelope"])
            extentStr = a["Envelope"];
          let theLabel = a[ddFields[0]];
          let buttonLabel = theLabel;       // "buttonLabel" stores the text that will be displayed on the dropdown button, to indicate the current selection
          if (ddItem.labelTemplate) {       // "labelTemplate" is used for multi-field options, for example:  "[common name] - [scientific name]"
            theLabel = "";
            buttonLabel = null;
            let arr = ddItem.labelTemplate.split(",");
            for (let j=0; j<arr.length; j++) {
              if (arr[j].startsWith("*")) {
                let s = a[arr[j].slice(1)];
                if (s) {              // Avoids adding "null" if s is null
                  theLabel += s;
                  if (!buttonLabel)
                    buttonLabel = s;    // Set "buttonLabel" to first non-null value
                }
              }
              else
                theLabel += arr[j];
            }
          }
          if (buttonLabel)      // If all fields used in generating the label are null, then don't include
            options.push({
              label: theLabel,
              value: v,
              extent: extentStr,
              buttonLabel: buttonLabel
            });
        }
        w.makeDropdownOptionsHtml(ddItem)
      };

      this.updateAllDropdowns = function(theWhere) {
        if (!this.dropDownInfo)
          return;
        if (theWhere)
          theWhere = theWhere.replace(/WHERE /i,"");      // Remove leading WHERE
        for (let d=0; d<this.dropDownInfo.length; d++) {
          let ddItem = this.dropDownInfo[d];
          if (!ddItem.SelectedOption)
            ddItem.SelectedOption = ddItem.initialSelectedOption;
          if (ddItem.liveUpdate && this.dropdownElements.includes(ddItem.wrapperId))
            this.upDateDropdown(ddItem, theWhere);
        }
      };

      this.filterDropdown = function(ddItem, where, comSci) {
        if (typeof ddItem === "string")     // ddItem argument can be either object or string.  If string, reset to appropriate object
          ddItem = this.getddItem(ddItem);

        if (ddItem.customRestService) {
          // This section handles queries using the new custom REST service
          let R = ddItem.customRestService;
          let theUrl = R.serviceUrl + "?sql=" + R.sqlTemplate;
          if (where)
            where = " WHERE " + where;
          else
            where = "";
          theUrl = theUrl.replace("{W}", where);
          queryServer(theUrl, false, function(results) {
            results = JSON.parse(results);
            this.processDropdownQueryResults(results, ddItem, this);
            //console.log("filterDropdown response");
          }.bind(this));
          return;
        }

        // This remaining code handles the old style using ArcGIS mapping service
        let subLayerURL = this.mapServiceQueryUrl(ddItem.subLayerName);     // this.mapServiceLayer.url + "/" + this.sublayerIDs[ddItem.subLayerName];
        let queryTask = new QueryTask(subLayerURL);
        let query = new Query();
        query.outFields = ddItem.ddOutFields;
        if (comSci) {  // If comSci present, change ordering and label template
          ddItem.comSci = comSci;
          ddItem.orderByFields = ddItem.comSciSettings[comSci].orderByFields;
          ddItem.labelTemplate = ddItem.comSciSettings[comSci].labelTemplate;
        }
        query.orderByFields = ddItem.orderByFields;
        query.where = "";
        if (where !== null)
          ddItem.ddWhere = where;
        query.where = ddItem.ddWhere;
        queryTask.query = query;
        queryTask.execute(query).then(function(results){
          this.w.processDropdownQueryResults(results, this.ddItem, this.w);
        }.bind({ddItem: ddItem, w: this}))/*.else({
          console.log("Query error in filterDropdown");
        })*/;

      };


      this.makeDropdownOptionsHtml = function(ddItem) {
        let options = ddItem.options;
        let theHtml = '';
        if (!ddItem.SelectedOption)
          ddItem.SelectedOption = ddItem.initialSelectedOption;
        for (i in options) {
          theHtml += '<option value="' + options[i].value + '"';
          if (options[i].value==="showCol" && ddItem.showColOption_Id)
            theHtml += ' id="' + ddItem.showColOption_Id + '"';
          if (options[i].value === ddItem.SelectedOption)
            theHtml += ' selected';
          if (options[i].extent)
            theHtml += ' extent="' + options[i].extent + '"';
          theHtml += '>' + options[i].label + '</option>';
        }
        getEl(ddItem.ddId).innerHTML = theHtml;
      };


/*
      this.makeTableFooterHtml = function() {
        let footerDivNode = getEl(this.footerDivName);
        this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
        footerDivNode.appendChild(this.footerWrapper);
      };
*/

      this.insertDropdowns = function(ddItem) {
        let html = ddItem.htmlTemplate;
        let a = html.split("{");
        for (let i=1; i<a.length; i++) {
          let p = a[i].indexOf("}");
          let ddName = a[i].slice(0, p);
          let htmlInsert = this.dropDownInfo.find(function(ddItem){
            return ddItem.ddName === ddName;
          });
          html = html.replace("{" + ddName + "}", htmlInsert.wrapperDom.outerHTML);
        }
        return html;
      };

      this.getddItem = function(ddName) {
        let ddIndex = this.dropDownInfo.findIndex(function(f){
          return f.ddName === ddName;
        });
        return this.dropDownInfo[ddIndex];

      };

/*
      this.filterDropdown = function(ddName, where, comSci) {
        this.queryDropDownOptions(this.getddItem(ddName), where, comSci);
      };
*/

      this.handleDependentDropdowns = function(ddInfo) {
        console.log("handleDependentDropdowns");
        let where = "";
        if (ddInfo.SelectedOption !== "All")
          where =  ddInfo.whereField + "=" + ddInfo.SelectedOption;
        for (let i=0; i<ddInfo.dependentDropdowns.length; i++) {
          let ddName = ddInfo.dependentDropdowns[i];
          this.filterDropdown(ddName, where);
        }
      };

      // Same header is shared by all tabs (some elements are hidden), so this is run just once, regardless of whether there are multiple tabs
      this.makeTableHeaderHtml = function() {
        let headerDivNode = getEl(this.headerDivName);
        let headerContent = document.createElement("SPAN");
        this.headerContent = headerContent;
        headerDivNode.appendChild(headerContent);

        headerContent.innerHTML = '';

//        let downloadFtnText = this.objName + ".downloadTableData()";
        let downloadFtnText = this.objName + ".showCsvDownloadDialog()";
        headerContent.innerHTML += '<span id="' + this.baseName + 'TableDownload"><img src="assets/images/floppy16x16.png" title="Download table data" class="tableHeaderIcon" onclick="' + downloadFtnText + '"></span>';

        if (this.tableHeaderTitle)
          headerContent.innerHTML += '&emsp;<label id="' + this.baseName + 'TableHeaderTitle" class="tableHeaderTitle">' + this.tableHeaderTitle + ' &emsp;</label>';

        if (this.radioFilterInfo) {
          let buttons = this.radioFilterInfo.buttons;
          let checkedIndex = this.radioFilterInfo.checked;
          let whereField = this.radioFilterInfo.whereField;
          let name = 'stuff';
          let radioHtml = '';
          for (let b=0; b<buttons.length; b++) {
            let A = buttons[b].split(":");
            let where = '';
            if (A[1])
              where = whereField + "=" + A[1];
            radioHtml += '<input type="radio" name="' + name + '" value="' + where + '"';
            if (b === checkedIndex)
              radioHtml += ' checked';
            let functionCall = "radioSelectHandler(" + this.objName + ",'" + where + "')";
            radioHtml += ' onclick="' + functionCall + '"><label>' + A[0] + '</label>&emsp; '
          }
          headerContent.innerHTML += '<span id="' + this.baseName + 'RadioFilter">' + radioHtml + '</span>';
        }

        if (this.optionalFieldInfo) {
          let optionalFieldInfo = this.optionalFieldInfo;
          let addlHeaderHtml = optionalFieldInfo.headerTemplate.replace(/\{0\}/g,optionalFieldInfo.checkboxId).replace("{w}",this.objName);
          headerContent.innerHTML += '<span id="' + this.baseName + 'Extra">' + addlHeaderHtml + '</span>';
        }

        if (this.dropDownInfo) {
          for (d in this.dropDownInfo) {
            let ddItem = this.dropDownInfo[d];
            let ddTitle = ddItem.ddName;    // Text for label in from of dropdown
            if (ddItem.ddTitle)
              ddTitle = ddItem.ddTitle;
            ddItem.ddWhere = "";
            ddItem.uniqueName = this.baseName + ddItem.ddName;
            ddItem.ddId = ddItem.uniqueName + "_Dropdown";      //this.baseName + "Dropdown_" + ddItem.ddName;
            ddItem.wrapperId = ddItem.uniqueName + "_ddWrapper";
            //let ddSpanId = ddItem.ddId.replace("_","Span_");
            ddItem.wrapperDom = makeHtmlElement("span", ddItem.wrapperId, "dropdown");   // The SPAN for the dropdown, that will be added to the header
            if (ddItem.layerSubNames)     // Only do if not using customRestService
              ddItem.excludedNames = ddItem.layerSubNames;
            if (!ddItem.expandPanelId)      // If it's part of an expand panel, element will be added to separate dropdown dialog later
              headerContent.appendChild(ddItem.wrapperDom);    // add the wrapper for the dropdown to the header
            let args = this.objName + ',' + d;

            if (ddItem.htmlTemplate) {
              ddItem.wrapperDom.innerHTML = this.insertDropdowns(ddItem);
            } else {
              ddItem.selectDom = makeHtmlElement("select", ddItem.ddId);
              ddItem.selectDom.setAttribute('onchange', 'dropdownSelectHandler(' + args + ')');
              ddItem.wrapperDom.innerHTML = '&emsp;<LABEL class="boldLabel">' + ddTitle + ': </LABEL>';
              ddItem.wrapperDom.appendChild(ddItem.selectDom);
              ddItem.wrapperDom.innerHTML += '&emsp;';
              ddItem.initialSelectedOption = ddItem.SelectedOption
              if (ddItem.subLayerName || ddItem.customRestService) {
                if (!ddItem.noInitialQuery)
                  this.filterDropdown(ddItem, null);
              } else {
                this.makeDropdownOptionsHtml(ddItem);
              }
            }
          }
        }

        let fCtID = this.baseName + 'Label_featureCount';
        let fCtSpanId = fCtID.replace("_","Span_");
        let fCtHtml = '&emsp;<LABEL class="boldLabel" id="' + fCtID + '"></LABEL>&emsp;';
        let spanHtml = '<span id="' + fCtSpanId + '">' + fCtHtml + '</span>';
        this.featureCountElId = fCtID;
        this.featureCountTemplate = "{0} items";
//        this.featureCountTemplate = "{0} {1}";    // old code -- current code uses "items" for everything

        //let titleEl = getEl("tableQueryExpando_Title");
        //titleEl.innerHTML = spanHtml;
        headerContent.innerHTML += spanHtml;

        if (this.clickableLayer) {
          this.cbID = this.baseName + 'Checkbox_showFeatures';
          let cbSpanId = this.cbID.replace("_","Span_");
          let args = this.objName + ',' + this.cbID;
          let cbHtml = '&emsp;<input id="' + this.cbID + '" type="checkbox" checked onclick="checkbox_showFeatures_clickHandler(' + args + ')">Show popups&emsp;';
          //titleEl.innerHTML = '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
          headerContent.innerHTML += '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
          getEl(this.cbID).checked = this.clickableLayer.visible;
        }

        // Total Species Data
        if (this.speciesTableInfo) {
          let spTableSpanId = this.baseName + 'IconSpeciesTable';
          let spTableHtml = '&emsp;<LABEL class="boldLabel">' + this.speciesTableInfo.iconLabel + '</LABEL>&ensp;';
          spTableHtml += "<img src='assets/images/table.png' class='tableHeaderIcon' onclick='mapStuff.openSpeciesTable(" + this.speciesTableInfo.args + ")' height='15' width='15' alt='' title='Show species table for all of Alaska'>";
          headerContent.innerHTML += '<span id="' + spTableSpanId + '">' + spTableHtml + '</span>';
        }
      };

      this.setHeaderItemVisibility = function(addlNames) {
        for (let c=0; c< this.headerContent.children.length; c++)
          this.headerContent.children[c].style.display = "none";
        let nameList = this.visibleHeaderElements;
        if (addlNames)
          nameList = nameList.concat(addlNames);
        for (c in nameList)
          getEl(nameList[c]).style.display = "inline";
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
/*  // JN: Is this still needed?
          if (colHeader.indexOf("\n") !== -1)      // Handle case where field title wraps due to decreased space
            colHeader = colHeader.slice(2);
*/
          if (!excludeCols.includes(colHeader)) {
            let value =row.data[this.grid.columns[i].field];
            let origValue = value;
            if (colHeader === "" && value.includes("title=")) {
              let p = value.indexOf("title=");
              colHeader = value.slice(p).split("'")[1];
            }
            if (value) {
              if (typeof value === "string")
                value = value.replace("actionIcon", "actionIconPopup");    // If it's an icon with class "actionIcon", change to class for display in popup
              value = this.attrValDescription(th[i].field, value);      // Apply value description (SZ Units)
              let formatter = this.grid.columns[i].formatter;
              if (formatter && (typeof value)==="number")
                value = formatter(value);     // Apply numeric format, if numeric
              if (colHeader !== "")
                colHeader += ":";
              h += "<div><b>" + colHeader + "</b>&nbsp;&nbsp;" + value + "</div>";
            }
          }
        }
        let newDiv = makeHtmlElement("DIV",null,null, null, h);
        return newDiv;
        //return h;
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
          let colNum = this.featureOutFields.indexOf(fields[f]);
          if (colNum === -1)
            this.totalLabels[fieldName] = null;
          else {
            this.totalLabels[fieldName] = {
              colNum: colNum,     // This is probably moot now, as column number is now based on a search of DGrid columns
              node: makeHtmlElement("LABEL", null, "totalBox", "position: absolute; top: 0; left: 0px", "Total")
            }
            this.footerWrapper.appendChild(this.totalLabels[fieldName].node);
          }
        }
      }
    }

    });


});

