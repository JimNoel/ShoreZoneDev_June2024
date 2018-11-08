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

define([
  "dojo/_base/declare",
  "dojo/_base/lang",
  "dojo/on",
  "dijit/form/Select",
  "dstore/Memory",
  "dstore/Trackable",
  "dgrid/OnDemandGrid",
  "dgrid/extensions/ColumnHider",
  "dgrid/extensions/ColumnReorder",
  "dgrid/extensions/ColumnResizer",
  "dgrid/Selector",
  "esri/tasks/support/Query",
  "esri/tasks/QueryTask",
  "noaa/QueryBasedPanelWidget"
], function(declare, lang, on, Select, Memory, Trackable, OnDemandGrid, ColumnHider, ColumnReorder, ColumnResizer, Selector,
            Query, QueryTask, QueryBasedPanelWidget){


  return declare(QueryBasedPanelWidget, {

    constructor: function(/*Object*/ kwArgs){

      lang.mixin(this, kwArgs);

      this.hideEmptyColumns = true;
      this.store = null;
      this.grid = null;

      this.makeTable = function(fields, features) {
        // Create a dGrid table from returned data
        getEl(this.displayDivName).innerHTML = "";      // clear the DIV

        var unitColumns = [];
        var nonNullCount = new Object();
        var columnStyleHTML = "";

        for (let i=0; i<fields.length; i++) {
          unitColumns.push({
            field: fields[i].name,
            label: fields[i].alias
          });
          var colWidth = (fields[i].alias.length + 1) * 12;
          columnStyleHTML += ".dataTable .field-" + fields[i].name + " { width: " + colWidth + "px;} ";
          nonNullCount[fields[i].name] = 0;
        }

        // Create style-sheet for columns
        var sheet = document.createElement('style');
        sheet.innerHTML = columnStyleHTML;
        document.body.appendChild(sheet);

        var unitData = [];
        for (let i=0; i<features.length; i++) {
          //*JN*/ features[i].attributes["item"] = i;
          unitData.push(features[i].attributes);
          for (a in features[i].attributes) {
            if (features[i].attributes[a]) {
              nonNullCount[a] += 1;
              //features[i].attributes[a] = "<i>" + features[i].attributes[a] + "</i>";
            }
          }
        }
        //this.store = null;
        this.store = new (declare([Memory, Trackable]))({
          data: unitData
        });
/*
        for (var c=0; c<unitColumns.length; c++) {
          var col = unitColumns[c];
          col.hidden = (nonNullCount[col.field]==0);
        }
/**/
        // Instantiate grid
        //this.grid = null;
        this.grid = new (declare([OnDemandGrid, ColumnHider, ColumnReorder, ColumnResizer]))({
          className: "dataTable",
          loadingMessage: 'Loading data...',
          noDataMessage: 'No results found.',
          collection: this.store,
          columns: unitColumns
        }, this.displayDivName);
        this.grid.startup();


        this.grid.on('dgrid-error', function(event) {
          debug('dgrid-error:  ' + event.error.message);
        });

        this.grid.on('dgrid-refresh-complete', function(event) {
          this.repositionTotalLabels(event.grid.columns);
        }.bind(this));

        this.grid.on('dgrid-columnresize', function(event) {
          setTimeout(function(){      // Time delay is necessary because up to 2 column-resize events can be triggered by a single mouse-up event
            this.w.repositionTotalLabels(this.e.grid.columns);
            }.bind({e: event, w: this}), 100);
        }.bind(this));

        this.grid.on('.dgrid-header .dgrid-cell:mouseover', function (event) {
          this.showHeaderTooltip(event);
        }.bind(this));

        this.grid.on('.dgrid-header .dgrid-cell:mouseout', function (event) {
          this.hideGridTooltip(event);
        }.bind(this));

        this.grid.on('.dgrid-content .dgrid-row:mouseover', function (event) {
          var row = this.grid.row(event);
          var rowIndex = event.selectorTarget.rowIndex;
          var associatedGraphic = this.clickableLayer.graphics.items[rowIndex];
          this.showGridTooltip(event, rowIndex, associatedGraphic);
          if (this.clickableLayer.visible) {
            this.displayPlayButton(associatedGraphic);
          }
          // row.element == the element with the dgrid-row class
          // row.id == the identity of the item represented by the row
          // row.data == the item represented by the row
        }.bind(this));

        this.grid.on('.dgrid-content .dgrid-row:mouseout', function (event) {
          this.hideGridTooltip(event);
        }.bind(this));


        this.repositionTotalLabels = function(columns) {
          if (!this.totalFields)
            return;
          var posTop = $(this.footerWrapper).position().top + 2;
          for (f in this.totalLabels) {
            var label = this.totalLabels[f];
            var column = columns[label.colNum];
            var colPos = $(column.headerNode.contents).position();
            label.node.style.left = colPos.left + "px";
          }
        };

        this.showHeaderTooltip = function(event){
          var fieldName = event.selectorTarget.field;
          var description = this.attrName(fieldName,this.UnitAttrsInfo);
          if (description != fieldName) {
            var toolTipText = description;
            var cell=this.grid.cell(event);
            dijit.showTooltip(toolTipText, cell.element);
          }
        };

        this.showGridTooltip = function(event, r, associatedGraphic){
          var cell=this.grid.cell(event);
          if (cell.column) {
            var fieldName = cell.column.field;
            var fieldValueDescr = this.attrValDescription(fieldName, associatedGraphic.attributes);
            if (fieldValueDescr != associatedGraphic.attributes[fieldName]) {
              var toolTipText = fieldValueDescr;
              dijit.showTooltip(toolTipText, cell.element);
            }
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
        this.makeClickableGraphics(features);
        this.makeTable(fields, features);
        getEl(this.featureCountElId).innerHTML = features.length + " " + this.tabName;
        if (this.totalFields) {
          if (features.length === 0) {
            for (l in this.totalLabels)
              this.totalLabels[l].node.innerHTML = "0";
            return;
          }
          var totalsLayerName = this.layerBaseName + this.ddTotalsLayerNameAddOn;
          this.queryTask.url = this.mapServiceLayer.url + "/" + this.sublayerIDs[totalsLayerName].toString();
          this.query.outFields = this.totalFields;
          this.queryTask.execute(this.query).then(function(results){
            var totalValues = results.features[0].attributes;
            for (a in totalValues)
              this.totalLabels[a].node.innerHTML = totalValues[a];
          }.bind(this), function(error) {
            console.log(this.baseName + ":  QueryTask for Totals failed.");
          }.bind(this));

        }

      };


/*
      this.dropdownSelectHandler = function(evt) {
        //alert("You selected " + evt.target.value);
        this.w.dropDownInfo[this.index].SelectedOption = evt.target.value;
        this.w.runQuery(view.extent);
      };
*/

      this.getDropDownOptions = function(ddNum, headerContent) {
        var ddItem = this.dropDownInfo[ddNum];
        var subLayerURL = this.mapServiceLayer.url + "/" + this.sublayerIDs[ddItem.subLayerName];
        var queryTask = new QueryTask(subLayerURL);
        var query = new Query();
        with (query) {
          outFields = ddItem.outFields;
          orderByFields = ddItem.orderByFields;
          where = "";
        }
        queryTask.query = query;
        queryTask.execute(query).then(function(results){
          var options = ddItem.options;
          var outFields = ddItem.outFields;
          for (var i=0;  i<results.features.length; i++) {
            var a = results.features[i].attributes;
            options.push({
              label: a[outFields[0]],
              value: a[outFields[1]]        // a[outFields[1]]
            });
          }
          this.w.makeDropdownOptionsHtml(ddNum, this.headerContent)
        }.bind({ddItem: ddItem, headerContent: headerContent, w: this}));       // best example of .bind?
      };


      this.makeDropdownOptionsHtml = function(ddNum, domId) {
        var ddItem = this.dropDownInfo[ddNum];
        var theHtml = '';
        ddItem.options.forEach(function(item, index, array) {
          theHtml += '<option value="' + item.value + '">' + item.label + '</option>';
        });
        getEl(domId).innerHTML = theHtml;
      };


      this.makeTableFooterHtml = function() {
        var footerDivNode = getEl(this.footerDivName);
        this.footerWrapper = makeHtmlElement("SPAN", null, null, "position: relative; top: 0px; left: 0px");
        footerDivNode.appendChild(this.footerWrapper);
      };


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
            let args = this.objName + ',' + d + ',' + ddItem.domId;
            ddHtml += '<select id="' + ddItem.domId + '" onchange="dropdownSelectHandler(' + args + ')" ></select>&emsp;';
            headerContent.innerHTML += '<span id="' + ddSpanId + '">' + ddHtml + '</span>';
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

        var cbID = this.baseName + 'Checkbox_showFeatures';
        var cbSpanId = cbID.replace("_","Span_");
        let args = this.objName + '.clickableLayer,' + cbID;
        var cbHtml = '&emsp;<input id="' + cbID + '" type="checkbox" checked onclick="checkbox_showFeatures_clickHandler(' + args + ')">Show markers&emsp;';
        headerContent.innerHTML += '<span id="' + cbSpanId + '">' + cbHtml + '</span>';
        getEl(cbID).checked = this.clickableLayer.visible;

      };

      this.setHeaderItemVisibility = function() {
        for (var c=0; c< this.headerContent.children.length; c++)
          this.headerContent.children[c].style.display = "none";
        for (c in this.visibleHeaderElements)
          getEl(this.visibleHeaderElements[c]).style.display = "inline";
      }

      this.makeTableHeaderHtml();
      if (this.footerDivName)
        this.makeTableFooterHtml();

    }

  });


});

