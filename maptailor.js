/**
 * Google Maps Tile Carver for Photoshop
 * 
 * @description Tiles a photoshop image to create a Custom Map Type for Google Maps API, tested with CS4 and CS5
 * @since 2010-09-01
 * @author Will James, http://onNYTurf.com (creator)
 * @author Curtis Wyatt, http://gocalipso.com/
 * @author Nate Bundy, http://www.lemonrage.com/
 * @author Uli Schöberl, http://aplusplus.org
 */



// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// STATIC SETTINGS
// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

var OrgX = 0;   // the Google Maps X value of the tile at the top left corner of your Photoshop document
var OrgY = 0;   // the Google Maps Y value of the tile at the top left corner of your Photoshop document
var PixelWidth = 256; // Your width and height should be 256 unless you override Google's default in a custom map type
var PixelHeight = 256;


// set each file type to true that you wish the script to save out.you may save out all three at the same time if you wish
var saveJPEG = false;
var saveJPEGforWeb = false;
var savePNG = false;
var savePNGforWeb = true;
var saveGIF = false;
var saveQuality = 80;


// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// INTERACTIVE SETTINGS (Dialoges while running)
// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––

var HighestZoomLevel = 0;
var LowestZoomLevel = 0;

//determine Zoom Levels
if(confirm('Should the map be zoomable?')) {
    var UserLevelCount = prompt('How many Zoom Levels do you want?',4);
    HighestZoomLevel = (UserLevelCount) ? UserLevelCount : 4;
} 

var OrgZoomLevel = HighestZoomLevel;

//determine where to save the Tiles
try {
    
    if(!app.activeDocument.fullName.path) {
       throw "UnsavedError";
    }

} catch (er) {
    alert('Please save your document first');
}

var userFolder = Folder.selectDialog('select a folder where the tiles should be saved');
var FolderPath = (userFolder) ? userFolder : app.activeDocument.fullName.path;
FolderPath += '/';


// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––
// END SETTINGS
// ––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––––



var currentDocument = app.activeDocument; // Run the script on the active document

// via http://www.ps-scripts.com/bb/viewtopic.php?p=343
function takeSnapshot () {
   var id686 = charIDToTypeID( "Mk  " );
   var desc153 = new ActionDescriptor();
   var id687 = charIDToTypeID( "null" );
   var ref119 = new ActionReference();
   var id688 = charIDToTypeID( "SnpS" );
   ref119.putClass( id688 );
   desc153.putReference( id687, ref119 );
   var id689 = charIDToTypeID( "From" );
   var ref120 = new ActionReference();
   var id690 = charIDToTypeID( "HstS" );
   var id691 = charIDToTypeID( "CrnH" );
   ref120.putProperty( id690, id691 );
   desc153.putReference( id689, ref120 );
   executeAction( id686, desc153, DialogModes.NO );
}


function revertToLastSnapshot() {
   var docRef = app.activeDocument;
   var hsObj = docRef.historyStates;
   var hsLength = hsObj.length;
   for (var i = hsLength-1; i > -1; i--) {
       if(hsObj[i].snapshot) {
           docRef.activeHistoryState = hsObj.getByName('Snapshot ' + i);
           break;
       }
   }
}


function revertToSnapshot(snapshotID) {
  currentDocument.activeHistoryState = currentDocument.historyStates[snapshotID];
}

function getLastSnapshotID()
{
   var docRef = app.activeDocument;
   var hsObj = docRef.historyStates;
   var hsLength = hsObj.length;
   for (var i = hsLength-1; i > -1; i--) {
       if(hsObj[i].snapshot) {
           return i;
           break;
       }
   }
}

function getVisibleLayers(doc)
{
        var tempArray = new Array();
        for (var i = 0; i < doc.layers.length; i++)
        {
                if (doc.layers[i].visible)
                        tempArray.push(i);
        }
        return tempArray;


}

function isLayerEmpty(doc, layer)
{
  if (!doc) {
    doc = app.activeDocument;
  }
  if (!layer) {
    layer = doc.activeLayer;
  }
  return parseInt(layer.bounds.toString().replace(/\D/g,"")) == 0;


}

function visibleLayersEmpty(doc)
{
        var bool = true;
        if (!doc) {
                doc = app.activeDocument;
        }
        for (var i = 0; i < visibleLayers.length; i++)
        {
                bool = isLayerEmpty(doc,doc.layers[visibleLayers[i]]);
                if (!bool) return bool;
        }
        return bool;


}

var startRulerUnits = app.preferences.rulerUnits; // Save the current preferences
app.preferences.rulerUnits = Units.PIXELS; // Set Photoshop to use pixels

// Find the visible layers
var visibleLayers = getVisibleLayers(currentDocument);

var ZoomLevel = HighestZoomLevel;
var LastZoomLevel = OrgZoomLevel;
var CurrentX = OrgX;
var CurrentY = OrgY;

// Take initial snapshot. We'll go back to this once we're finished to leave the document in the state we started
takeSnapshot();
var InitialSnapshotID = getLastSnapshotID();

// Do the following for each zoom level the user wants
while (ZoomLevel >= LowestZoomLevel)
{
        // add padding to make starting X and Y tile values divisible by 2^(LastZoomLevel - DesiredZoom)

        // first, get X and Y values needed for previous zoom level to resize properly to next zoom level we're outputting
        var ExpectedX = Math.floor(CurrentX / Math.pow(2,LastZoomLevel - ZoomLevel));
        var NewX = ExpectedX * Math.pow(2, LastZoomLevel - ZoomLevel);

        var ExpectedY = Math.floor(CurrentY / Math.pow(2, LastZoomLevel - ZoomLevel));
        var NewY = ExpectedY * Math.pow(2, LastZoomLevel - ZoomLevel);

        var XTilesNeeded = CurrentX - NewX;
        var YTilesNeeded = CurrentY - NewY;

        // Now add padding for the extra tiles needed
        currentDocument.resizeCanvas(currentDocument.width.value + (XTilesNeeded * PixelWidth), currentDocument.height.value + (YTilesNeeded * PixelHeight), AnchorPosition.BOTTOMRIGHT);

        CurrentX = ExpectedX;
        CurrentY = ExpectedY;

        // Ensure total width and height of canvas is a multiple of PixelWidth and PixelHeight respectively
        var BottomPaddingNeeded = (Math.ceil(currentDocument.height.value / PixelHeight) * PixelHeight) - currentDocument.height.value;
        var RightPaddingNeeded = (Math.ceil(currentDocument.width.value / PixelWidth) * PixelWidth) - currentDocument.width.value;
        currentDocument.resizeCanvas(currentDocument.width.value + RightPaddingNeeded, currentDocument.height.value + BottomPaddingNeeded, AnchorPosition.TOPLEFT);

        // Add padding to make number of tiles divisible by 2^(LastZoomLevel- DesiredZoom)
        var NumXTiles = currentDocument.width.value / PixelWidth;
        var NumYTiles = currentDocument.height.value / PixelHeight;
        var NumXTilesNeeded = Math.ceil(NumXTiles / Math.pow(2,LastZoomLevel- ZoomLevel)) * Math.pow(2, LastZoomLevel - ZoomLevel);
        var NumYTilesNeeded = Math.ceil(NumYTiles / Math.pow(2,LastZoomLevel- ZoomLevel)) * Math.pow(2, LastZoomLevel - ZoomLevel);
        NumXTilesNeeded = NumXTilesNeeded - NumXTiles;
        NumYTilesNeeded = NumYTilesNeeded - NumYTiles;
        currentDocument.resizeCanvas(currentDocument.width.value + (NumXTilesNeeded * PixelWidth), currentDocument.height.value + (NumYTilesNeeded * PixelHeight), AnchorPosition.TOPLEFT);
        NumXTiles = NumXTiles + NumXTilesNeeded;
        NumYTiles = NumYTiles + NumYTilesNeeded;

        // Now resize the canvas and image by .5^(LastZoomLevel - ZoomLevel) (Decrease size by 50% for each zoom level)
        if (ZoomLevel < LastZoomLevel)
        {
                var ResizeFactor = Math.pow(0.5, (LastZoomLevel - ZoomLevel));
				currentDocument.resizeImage(currentDocument.width.value * ResizeFactor, currentDocument.height.value * ResizeFactor);
        }

        // Now that we're done resizing the image and canvas, take a snapshot for this zoom level
        takeSnapshot();
        var ZoomLevelSnapshotID = getLastSnapshotID();

        var StartX = CurrentX;
        var StartY = CurrentY;

        var xTiles = parseInt(currentDocument.width.value, 10) / PixelWidth;
        var yTiles = parseInt(currentDocument.height.value, 10) / PixelHeight;

        var TotalTiles = xTiles * yTiles;  //<-- calculate the total number of tiles
        // Counters to track which x value and which y value we are on in our image tile grid
        var xm = 0;
        var ym = 0;

        var TileX = StartX; //<-- Set out first Google X value - later used in file name
        var TileY = StartY; //<-- Set out first Google Y value - later used in file name

        // Cut 'em up
        // For each tile we need to make, we repeat each step in this loop
        for (n=1; n<TotalTiles+1; n++)
        {
                // We cut up tiles column by column
                // I.E. we cut up all the tiles for a given x value
				// before moving on
				// to the next x value.
                // We do this by checking if the y value we are on is
				// the last tile
				// in a column
				//                 // We compare our y counter to our total y number of
				// Tiles, if they
				// are the same is we do the following
                if (parseInt(ym, 10) == parseInt(yTiles, 10))
                {
                        xm += 1; //<-- Up the x value by 1, i.e. we move over to the next column
                        ym = 0;  //<-- Reset the y value to 0 so we start back at the top of our new column
                        TileX += 1; //<-- Increase our Google X value for our file name
                        TileY = StartY;  //We reset our Google Y value for out file name everytime we change columns
                }

                // Based on our our TileWidth and TileHeight and the column we are on we determine our selection origin and area values
                MyXO = xm*(PixelWidth);
                MyXL = xm*(PixelWidth)+(PixelWidth);
                MyYO = ym*(PixelHeight);
                MyYL = ym*(PixelHeight)+(PixelHeight);

                currentDocument.crop(Array(MyXO, MyYO, MyXL, MyYL));

                if (!visibleLayersEmpty(currentDocument))
                {
                        //Save New Doc
                        var saveMe = currentDocument;

                        //Save the file
                        if (saveGIF)
                        {
                                //Set path to file and file name
                                saveFile = new File(FolderPath + ZoomLevel + "_" + TileX + "_" + TileY + ".gif");
                                //Set save options
                                gifSaveOptions = new GIFSaveOptions();
                                gifSaveOptions.colors = 64;
                                gifSaveOptions.dither = Dither.NONE;
                                gifSaveOptions.matte = MatteType.NONE;
                                gifSaveOptions.preserveExactColors = 0;
                                gifSaveOptions.transparency = 1;
                                gifSaveOptions.interlaced = 0;
                                saveMe.saveAs(saveFile, gifSaveOptions, true, Extension.LOWERCASE);
                        }
                        if (savePNG)
                        {
                                //Set path to file and file name
                                saveFile = new File(FolderPath +ZoomLevel + "_" + TileX + "_" + TileY + ".png");
                                pngSaveOptions = new PNGSaveOptions();
                                pngSaveOptions.interlaced = 0;
                                saveMe.saveAs(saveFile, pngSaveOptions, true, Extension.LOWERCASE);
                                
         
                        }
                    
                        if(savePNGforWeb) {
                            
                                saveFile = new File(FolderPath +ZoomLevel + "_" + TileX + "_" + TileY + ".png");
                                exportOptions = new ExportOptionsSaveForWeb();
                                exportOptions.format = SaveDocumentType.PNG;
                                exportOptions.PNG8 = false;
                                exportOptions.quality = saveQuality;
                                saveMe.exportDocument (saveFile, ExportType.SAVEFORWEB, exportOptions);
                        }
                    
                        if (saveJPEG)
                        {
                                //Set path to file and file name
                                saveFile = new File(FolderPath + ZoomLevel + "_" + TileX + "_" + TileY + ".jpg");
                                jpegSaveOptions = new JPEGSaveOptions();
                                jpegSaveOptions.matte = MatteType.NONE;
                                jpegSaveOptions.quality = Math.ceil(saveQuality/12);
                                saveMe.saveAs(saveFile, jpegSaveOptions, true, Extension.LOWERCASE);
                        }
                    
                        
                        if (saveJPEGforWeb)
                        {
                                //Set path to file and file name
                                saveFile = new File(FolderPath + ZoomLevel + "_" + TileX + "_" + TileY + ".jpg");
                                exportOptions = new ExportOptionsSaveForWeb();
                                exportOptions.format = SaveDocumentType.JPEG;
                                exportOptions.matte = MatteType.NONE;
                                exportOptions.quality = saveQuality;
                                saveMe.exportDocument (saveFile, ExportType.SAVEFORWEB, exportOptions);
                            
                        }
                }
                revertToSnapshot(ZoomLevelSnapshotID);
                //saveMe.close(SaveOptions.DONOTSAVECHANGES);

                //Advance Y counter for next image
                ym += 1;

                //Advance Google Y value for next image name
                TileY += 1;
        }
        //revertToLastSnapshot();
        LastZoomLevel = ZoomLevel;
        ZoomLevel--;
}

// Leave the document as we opened it
revertToSnapshot(InitialSnapshotID);

// Restore application preferences
app.preferences.rulerUnits = startRulerUnits; 
