The ShoreZone Application includes pages to show data for:
* Shore Zone
  * https://www.fisheries.noaa.gov/alaska/habitat-conservation/alaska-shorezone
  * https://www.fisheries.noaa.gov/resource/document/introduction-shorezone
  * https://media.fisheries.noaa.gov/2020-09/ShoreZone-Protocol-2017-AKR.pdf?RSScY5o5Q1RKNuGV2daZiExnYGQzx_Ov
* Nearshore Fish Atlas
  * https://www.fisheries.noaa.gov/alaska/habitat-conservation/nearshore-fish-atlas-alaska 
  * https://repository.library.noaa.gov/view/noaa/4358
* Shore Station
  * https://www.fisheries.noaa.gov/resource/data/alaska-shore-station-database

The ShoreZone Production URL is:
https://alaskafisheries.noaa.gov/mapping/sz/

The ShoreZone GitHub location is:
https://github.com/JimNoel/ShoreZoneDev_0807

After checking out the code from GitHub, you will need to download and manually add the following code libraries
* ESRI JavaScript API 
  * As of Aug 8, 2023, we are aiming for Version 4.27
  * https://developers.arcgis.com/javascript/latest/install-and-set-up/
    * You will need set up a free ESRI Account to login
  * https://developers.arcgis.com/javascript/latest/
  * https://developers.arcgis.com/javascript/latest/api-reference/
  * The contents of this library should be placed in ./src/4.27/esri (e.g. ./src/4.27/esri/request.js)
* DOJO (dijit, dojo, dojox)
  * Version 1.17.3 
  * https://dojotoolkit.org/download/
  * The contents of this library should be placed in:
    * ./src/4.27/dijit (e.g. ./src/4.27/digit/digit.js)
    * ./src/4.27/dojo (e.g. ./src/4.27/dojo/dojo.js)
    * ./src/4.27/dijit (e.g. ./src/4.27/dojox/main.js)
* DSTORE
  * Version 1.0.3
  * https://github.com/SitePen/dstore
  * The contents of this library should be placed in ./src/4.27/dstore (e.g. ./src/4.27/dstore/package.js)
* DGRID
  * https://dgrid.io/
  * The contents of this library should be placed in ./src/4.27/dgrid (e.g. ./src/4.27/dgrid/Grid.js)