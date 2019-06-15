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


var selectColor = "#DCEEFF";
var unselectColor = "";   // "white";


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
      var a = template.split("@");
      for (var i=0; i<a.length; i++)
        if (a[i] in attrs) {
          a[i] = attrs[a[i]];
        }
      return a.join("");
    },
*/

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

      this.hideEmptyColumns = true;
      this.store = null;
      this.grid = null;
      this.selectedRow = null;


      this.makeTable = function(fields, features) {
        // Create a dGrid table from returned data
        var tableColumns = [];
        var nonNullCount = new Object();
        var columnStyleCSS = "";

        for (var f in this.calcFields) {
          var p =0;
          if (this.calcFields[f].afterField)
            p = this.featureOutFields.indexOf(this.calcFields[f].afterField);     // Find insertion point for calculated field (default is 0)
          var newField = {
            name: this.calcFields[f].name,
            alias: this.calcFields[f].name,
            type: "string"
          };
          fields.splice(p + 1, 0, newField);
        }



        for (var i=0; i<fields.length; i++) {
          // Use supplied title for column name
          var title = getIfExists(this,"specialFormatting." + fields[i].name + ".title");
          if (title === null)
            title = fields[i].alias;

          tableColumns.push({
            field: fields[i].name,
            label: title,
            formatter: function(value){
              return value       // This causes dGrid to treat values as HTML code
            },
          });

          // If field column width is specified in widget settings, use that.  Otherwise, default to fit title
          var colWidth = getIfExists(this,"specialFormatting." + fields[i].name + ".colWidth");
          if (!colWidth)
            colWidth = (title.length) * 15;

          columnStyleCSS += ".dataTable .field-" + fields[i].name + " { width: " + colWidth + "px;} ";
          nonNullCount[fields[i].name] = 0;
        }

        // Create style-sheet for columns
        var sheet = document.createElement('style');
        sheet.innerHTML = columnStyleCSS;
        document.body.appendChild(sheet);

        var tableData = [];


        for (var i=0; i<features.length; i++) {

          for (f in this.calcFields)      // Make duplicate fields:  Value is the same, attribute name has '2' added to end
            features[i].attributes[this.calcFields[f].name] = "0";      //Insert new attribute with dummy value for calculated field

          var origAttrs = Object.assign({},features[i].attributes);     // Make a "copy" of the attributes object
          for (a in features[i].attributes)
            if (features[i].attributes[a]) {
              var useCommas = getIfExists(this,"specialFormatting." + a + ".useCommas");
              if (useCommas)
                features[i].attributes[a] = formatNumber_Commas(features[i].attributes[a]);
              var dateFormat = getIfExists(this,"specialFormatting." + a + ".dateFormat");
              if (dateFormat)
                features[i].attributes[a] = formatNumber_Date(features[i].attributes[a]);
              var numDecimals = getIfExists(this,"specialFormatting." + a + ".numDecimals");
              if (numDecimals)
                features[i].attributes[a] = features[i].attributes[a].toFixed(numDecimals);
              var template = getIfExists(this,"specialFormatting." + a + ".html");
              if (template) {     // If template exists, use this to replace attribute value with HTML code
                var fmtInfo = this.specialFormatting[a];
                if (fmtInfo.plugInFields) {
                  var args = fmtInfo.args;
                  for (p in fmtInfo.plugInFields)
                    args = args.replace("{" + p + "}", origAttrs[fmtInfo.plugInFields[p]]);
                  features[i].attributes[a] = template.replace("{args}", args);
                }
              }
              if (features[i].attributes[a]) {
                nonNullCount[a] += 1;
              }
          }

          if (this.idField) {     // For idField, insert span for identifying original row number, so correct feature is identified regardless of current table order
            var idFieldValue = features[i].attributes[this.idField];
            features[i].attributes[this.idField] = idFieldValue + "<span id='" + this.baseName + "@" + i + "@'></span>";
            // For identifying the equivalent row in the table, on feature click
            // "@" used for easy splitting out of values
          }

          tableData.push(features[i].attributes);
        }
        this.store = new (declare([Memory, Trackable]))({
          data: tableData
        });

        for (var c=0; c<tableColumns.length; c++) {
          var col = tableColumns[c];
          col.hidden = (nonNullCount[col.field]===0);       // TODO: sometimes can't show column subsequently?
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
          debug('dgrid-error:  ' + event.error.message);
        });

        // This doesn't work when using Grid instead of OnDemandGrid
        // TODO: Implement SingleQuery, to get dgrid-refresh-complete?  (Tried once, didn't work.)
        this.grid.on('dgrid-refresh-complete', function(event) {
          var rows = event.grid._rows;
          for (var r=0; r<rows.length; r++)
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
          var row = this.grid.row(event);
          var rowIndex = event.selectorTarget.rowIndex;
          var gObjFieldHtml = this.store.data[rowIndex][this.idField];
          var gObjIndex = event.selectorTarget.innerHTML.split("@")[1];
          var associatedGraphic = this.clickableLayer.graphics.items[gObjIndex];
          this.showGridTooltip(event, rowIndex, associatedGraphic);
          if (this.clickableLayer.visible) {
            this.displayPlayButton(associatedGraphic);
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

/*
        this.grid.watch("_rows", function() {
          alert("Hey!");
        });
*/

        this.repositionTotalLabels = function(columns) {
          if (!this.totalOutFields)
            return;
          var posTop = $(this.footerWrapper).position().top + 2;
          for (f in this.totalLabels) {
            var label = this.totalLabels[f];
            var column = columns[label.colNum];
            var colPos = $(column.headerNode.contents).position().left;
            if (this.baseName === "faSpTable")    //TODO:  This is not working correctly for draggable panels
              colPos = colPos - 300;              // Temporary HACK
            label.node.style.left = colPos + "px";
          }
        };

        this.showHeaderTooltip = function(event){
          var fieldName = event.selectorTarget.field;
          var description = this.attrName(fieldName);
          if (description !== fieldName) {
            var toolTipText = description;
            var cell=this.grid.cell(event);
            dijit.showTooltip(toolTipText, cell.element);
          }
        };

        this.showGridTooltip = function(event, r, associatedGraphic){
          try {     //JN
            var cell = this.grid.cell(event);
            if (cell.column) {
              var fieldName = cell.column.field;
              var fieldValueDescr = this.attrValDescription(fieldName, associatedGraphic.attributes);
              if (fieldValueDescr !== associatedGraphic.attributes[fieldName]) {
                var toolTipText = fieldValueDescr;
                dijit.showTooltip(toolTipText, cell.element);
              }
            }
          } catch(err) {
            // TODO: Figure this out
            console.log("ERROR in showGridTooltip");
          }
        };

        this.hideGridTooltip = function(event){
          var cell=this.grid.cell(event);
          dijit.hideTooltip(cell.element);
        };

      }

      this.processData = function(results) {
        //console.log("processData: Table");
        var fields = results.fields;
        var features = results.features;
        getEl(this.featureCountElId).innerHTML = features.length + " " + this.tabName;
        getEl(this.displayDivName).innerHTML = "";      // clear the DIV
        if (this.noFeatures(features))
          return;

        this.makeClickableGraphics(features);
        this.makeTable(fields, features);
        if (this.totalOutFields) {
          if (features.length === 0) {
            for (l in this.totalLabels)
              this.totalLabels[l].node.innerHTML = "0";
            return;
          }
          //var totalsLayerName = this.layerBaseName + this.ddTotalsLayerNameAddOn;
          this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[this.totalsLayerName].toString();
          this.query.outFields = this.totalOutFields;
          this.query.orderByFields = null;
          this.queryTask.execute(this.query).then(function(results){
            var totalValues = results.features[0].attributes;
            for (a in totalValues)
              this.totalLabels[a].node.innerHTML = totalValues[a];
            this.repositionTotalLabels(this.grid.columns);
          }.bind(this), function(error) {
            console.log(this.baseName + ":  QueryTask for Totals failed.");
          }.bind(this));

        }

      };


      this.getDropDownOptions = function(ddNum, headerContent) {
        var ddItem = this.dropDownInfo[ddNum];
        var subLayerURL = this.mapServiceLayer.url + "/" + this.sublayerIDs[ddItem.subLayerName];
        var queryTask = new QueryTask(subLayerURL);
        var query = new Query();
        with (query) {
          outFields = ddItem.ddOutFields;
          orderByFields = ddItem.orderByFields;
          where = "";
        }
        queryTask.query = query;
        queryTask.execute(query).then(function(results){
          var options = ddItem.options;
          var ddFields = ddItem.ddOutFields;
          for (var i=0;  i<results.features.length; i++) {
            var a = results.features[i].attributes;
            var v = a[ddFields[1]];
            var extentStr = null;
            if (a["Envelope"])
              extentStr = a["Envelope"];
              //v += ":" + a["Envelope"];
            options.push({
              label: a[ddFields[0]],
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
        var ddItem = this.dropDownInfo[ddNum];
        var options = ddItem.options;
        var theHtml = '';
        for (i in options) {
          var extentStr = '';
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
        var footerDivNode = getEl(this.footerDivName);
        this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
        footerDivNode.appendChild(this.footerWrapper);
      };
*/


      this.makeTableHeaderHtml = function() {
        var headerDivNode = getEl(this.headerDivName);
        var headerContent = document.createElement("SPAN");
        this.headerContent = headerContent;
        headerDivNode.appendChild(headerContent);

        if (this.tableHeaderTitle)
          headerContent.innerHTML = '&emsp;<label id="' + this.baseName + 'TableHeaderTitle" class="tableHeaderTitle">' + this.tableHeaderTitle + ' &emsp;</label>';

        if (this.dropDownInfo) {
          for (d in this.dropDownInfo) {
            var ddItem = this.dropDownInfo[d];
            ddItem.domId = this.baseName + "Dropdown_" + ddItem.ddName;
            var ddSpanId = ddItem.domId.replace("_","Span_");
            var ddHtml = '&emsp;<LABEL class="boldLabel">' + ddItem.ddName + ': </LABEL>';
            var args = this.objName + ',' + d + ',' + ddItem.domId;
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

        var fCtID = this.baseName + 'Label_featureCount';
        this.featureCountElId = fCtID;
        var fCtSpanId = fCtID.replace("_","Span_");
        var fCtHtml = '&emsp;<LABEL class="boldLabel" id="' + fCtID + '"></LABEL>&emsp;';
        var spanHtml = '<span id="' + fCtSpanId + '">' + fCtHtml + '</span>';
        headerContent.innerHTML += spanHtml;

        if (this.clickableLayer) {
          var cbID = this.baseName + 'Checkbox_showFeatures';
          var cbSpanId = cbID.replace("_","Span_");
          var args = this.objName + '.clickableLayer,' + cbID;
          var cbHtml = '&emsp;<input id="' + cbID + '" type="checkbox" checked onclick="checkbox_showFeatures_clickHandler(' + args + ')">Show markers&emsp;';
          headerContent.innerHTML += '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
          getEl(cbID).checked = this.clickableLayer.visible;
        }

        // Total Species Data
        if (this.speciesTableInfo) {
          var spTableSpanId = this.baseName + 'IconSpeciesTable';
          var spTableHtml = '&emsp;<LABEL class="boldLabel">' + this.speciesTableInfo.iconLabel + '</LABEL>&ensp;';
          spTableHtml += "<img src='assets/images/table.png' onclick='mapStuff.openSpeciesTable(" + this.speciesTableInfo.args + ")' height='15' width='15' alt=''>";
          headerContent.innerHTML += '<span id="' + spTableSpanId + '">' + spTableHtml + '</span>';
        }
      };

      this.setHeaderItemVisibility = function() {
        for (var c=0; c< this.headerContent.children.length; c++)
          this.headerContent.children[c].style.display = "none";
        for (c in this.visibleHeaderElements)
          getEl(this.visibleHeaderElements[c]).style.display = "inline";
      }

      this.highlightAssociatedRow = function(graphic) {
        this.unHighlightCurrentRow();
        var r = graphic.attributes.item;
        var rowId = this.baseName + "@" + r + "@";      // Embedded in idField at feature creation
        this.selectedRow = getEl(rowId).parentNode.parentNode;
        this.selectedRow.style.backgroundColor = selectColor;
        if (!isInViewport(this.selectedRow,this.grid.bodyNode))
          this.selectedRow.scrollIntoView();
      }

      this.unHighlightCurrentRow = function() {
        if (this.selectedRow)
          this.selectedRow.style.backgroundColor = unselectColor;
      }

      this.makeTableHeaderHtml();
/*
      if (this.footerDivName)
        this.makeTableFooterHtml();
*/
      /*JN*/ console.log("Looky here!  " + this.objName);

    },

    makeFooterElements: function() {
       if (!this.inherited(arguments))     // Run inherited code from QueryBasedPanelWidget
         return;      // If no footer created, then don't execute the rest of the function
/*
      var footerDivNode = getEl(this.footerDivName);
      footerDivNode.innerHTML = "";
      this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0; left: 0");
      footerDivNode.appendChild(this.footerWrapper);
*/
      // make LABEL elements for totals
      if (this.totalOutFields) {
        this.footerWrapper.innerHTML = "";
        var fields = this.totalOutFields;
        this.totalLabels = {};
        for (f in fields) {
          var fieldName = fields[f];
//         var colNum = this.tabInfo[this.currTab].featureOutFields.indexOf(fields[f]);
          var colNum = this.featureOutFields.indexOf(fields[f]);
          if (colNum === -1)
            this.totalLabels[fieldName] = null;
          else {
            this.totalLabels[fieldName] = {
              colNum: colNum,
              node: makeHtmlElement("LABEL", null, null, "position: absolute; top: 0; left: 0px", "Total")
            }
            this.footerWrapper.appendChild(this.totalLabels[fieldName].node);
          }
        }
      }
      console.log("QueryBasedPanelWidget:  makeFooterElements");
    }

    });


});

