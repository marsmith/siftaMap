
var layerList = [
	{layerID: "1", layerName: "NY WSC Sub-district", outFields: ["subdist","FID"],dropDownID: "WSCsubDist"},
	{layerID: "2", layerName: "Senate District", outFields: ["NAMELSAD","FID","Rep_Name"],dropDownID: "SenateDist"},
	{layerID: "3", layerName: "Assembly District", outFields: ["NAMELSAD","FID","AD_Name"], dropDownID: "AssemDist"},
	{layerID: "4", layerName: "Congressional District",	outFields: ["NAMELSAD","FID","CD_Name"], dropDownID: "CongDist"},
	{layerID: "5", layerName: "County",	outFields: ["County_Nam","FID"],dropDownID: "County"},
	{layerID: "6",layerName: "Hydrologic Unit",	outFields: ["HUC_8","FID","HU_8_Name"],	dropDownID: "HUC8"}	
];

var allLayers = [
    { 
        "groupHeading": "Filters",
        "showGroupHeading": false,
        "includeInLayerList": false,
        "layers": {
            "Gages" : {
                "url": "https://www.sciencebase.gov/arcgis/rest/services/Catalog/56ba63bae4b08d617f6490d2/MapServer/0", 
				"visible": true, 
				"opacity": 0.8,
                "wimOptions": {
                    "type": "layer",
                    "layerType": "agisFeature",
                    "includeInLayerList": true
                }
            },
		}
	},
    {
        "groupHeading": "Filters",
        "showGroupHeading": true,
        "includeInLayerList": true,
        "layers": {
			"USGS Sub-district" : {
                "url": "https://www.sciencebase.gov/arcgis/rest/services/Catalog/56ba63bae4b08d617f6490d2/MapServer",
				"layers": [1,2,3,4,5,6], 
				"visible": false, 
				"opacity": 0.8,
                "wimOptions": {
                    "type": "layer",
                    "layerType": "agisDynamic",
                    "includeInLayerList": true
                }
            }
        }
    }
];

var ny = {
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {"state":"ny"},
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[-80.035400390625, 40.455307212131494], [-80.035400390625, 45.19752230305682],[-71.663818359375, 45.19752230305682],[-71.663818359375,40.455307212131494],[-80.035400390625,40.455307212131494]]]
      }
    }
  ]
}

var siteData;
var layerLabels;
var visibleLayers = [];
var identifiedFeature;
var popup;
var mapServer;
var tempSiteData = [];
var badSites = [];
var siteTypes = [];
var map;
var layer;
var fiscalYear;

$( document ).ready(function() {

	/* create map */
	map = L.map('mapDiv',{ zoomControl: false }).setView([42.7, -76.2], 7);
	new L.Control.Zoom({ position: 'topright' }).addTo(map);
	var layer = esri.basemapLayer('NationalGeographic', {opacity: 0.7}).addTo(map);

	//get fiscal year
	var d = new Date();
	var month = d.getMonth(); 
	var year = d.getFullYear();
	if (month <= 8) fiscalYear = year;
	if (month >= 9) fiscalYear = year + 1;

	setupDataFilters();
	parseBaseLayers();
	//summarizeSites(ny);

	$.getJSON('SIFTAList.geojson', function (geojson) {		
		siteData = geojson;
		siteTypes = ["gw", "sw", "clim", "misc", "qw"];
	});
	
	//LISTENERS
	 $("#mobile-main-menu").click(function(event) {
		 $('body').toggleClass('isOpenMenu')
	 })

    $(".dataFilterSelect").change(function(event) {

	});

	$(".geoFilterSelect").change(function(event) {
		
		$("#loadingResults").show();

		var layerID = $("#" + event.target.id + " :selected").attr('layerID');
		var value = $("#" + event.target.id + " :selected").attr('value');
		var name = $("#" + event.target.id + " :selected").text();
		
		console.log('Dropdown filter selected: ', layerID,value,name);
		if (layerID.length < 1) {
			map.graphics.clear();
			featureLayer.clearSelection();
			return;
		}

		mapServer.query().layer(layerID).returnGeometry(true).where("FID = " + value).run(function(error, featureCollection){
			summarizeSites(featureCollection);
		});
	});
	
	//set up click listener for map querying
	map.on('click', function (e) {
		if (visibleLayers.length > 0) {
			mapServer.identify().on(map).at(e.latlng).layers("visible:" + visibleLayers[0]).run(function(error, featureCollection){
			  if (featureCollection.features.length > 0) {
				$.each(featureCollection.features, function (index,value) {
	
					if (map.hasLayer(identifiedFeature)) map.removeLayer(identifiedFeature);
					identifiedFeature = L.geoJson(value).addTo(map)
					
					$.each(layerList, function (index, layerInfo) {
						var popupContent = '<h5>' + layerInfo.layerName + '</h5>';
						
						if (visibleLayers[0] == layerInfo.layerID) {
							$.each(value.properties, function (key, field) {
								if (layerInfo.outFields.indexOf(key) != -1) {								
									if (key != "FID") popupContent += '<strong>' + field + '</strong></br>';
								}
							});
							
							popup = L.popup()
							.setLatLng(e.latlng)
							.setContent(popupContent)
							.openOn(map);
						}
					});
				});
			  }
			  else {
				//pane.innerHTML = 'No features identified.';
			  }
			});
		}
	});	
	
	//click listener for regular button
	$('#baseLayerToggles').on("click", '.layerToggle', function(e) {
		
		var layerID = $(this).attr('value');
		var divID = $(this).attr('id');
		
		//clear all check marks
		$('.lyrTogDiv').find('i.glyphspan').attr("class","glyphspan glyphicon glyphicon-unchecked");
									
		//remove any selection
		if (map.hasLayer(identifiedFeature)) map.removeLayer(identifiedFeature);						
		
		//remove any popups
		if (popup) map.closePopup();

		//layer toggle
		console.log('current visible layers: ', visibleLayers);
		
		//if layer is already on the map
		if (visibleLayers == layerID) {
			console.log('map already has this layer: ',divID, layerID);
			visibleLayers = [];
			map.removeLayer(mapServer);
			console.log('current visible layers: ', visibleLayers);
			
		} else {
			console.log('map DOES NOT have this layer: ',divID, layerID);
			$('#' + divID).find('i.glyphspan').toggleClass('glyphicon-check glyphicon-unchecked');
			visibleLayers = [layerID]
			mapServer.setLayers(visibleLayers);
			map.addLayer(mapServer);
			console.log('current visible layers: ', visibleLayers);
		}
	});
	
	//click listener for regular button
	$('#gageToggles').on("click", '.layerToggle', function(e) {
		
		var divID = $(this).attr('id');
		
		//toggle checkbox
		$('#' + divID).find('i.glyphspan').toggleClass('glyphicon-check glyphicon-unchecked');
		
		//remove any popups
		if (popup) map.closePopup();
									
		//remove any selection
		if (map.hasLayer(window[divID])) {
			map.removeLayer(window[divID])
		}
		else {
			map.addLayer(window[divID]);
		}			
	});	
});
	
$(document).ajaxStop(function () {
	if (siteData.features.length > 1) {
		
		console.log('siteCount: ',siteData.features.length);
		console.log('bad Sites: ', badSites.length);
		console.log(siteData);
		parseGeoJSON();
		
		$("#loadingGages").hide();
	}
});
	

function parseBaseLayers() {
	$.each(allLayers, function (index,group) {
		console.log('processing: ', group.groupHeading)

		//sub-loop over layers within this groupType
		$.each(group.layers, function (mapServerName,mapServerDetails) {

			if (mapServerDetails.wimOptions.layerType === 'agisFeature') {	
				featureLayer = esri.featureLayer({url:mapServerDetails.url});
				//addLayer(group.groupHeading, group.showGroupHeading, layer, mapServerName, mapServerDetails);
			}

			else if (mapServerDetails.wimOptions.layerType === 'agisDynamic') {
				mapServer = esri.dynamicMapLayer(mapServerDetails);
				addMapLayer(mapServer, mapServerName, mapServerDetails);
				
				setupGeoFilters(layerList);
			}
		
		});  
	});
}

function summarizeSites(featureCollection) {
	
	//get the first feature and add to map 
	if(featureCollection.features.length > 0){
		
		$.each(featureCollection.features, function (index,value) {
			
			if (map.hasLayer(identifiedFeature)) map.removeLayer(identifiedFeature);
			if (!featureCollection.features[0].properties.state) identifiedFeature = L.geoJson(value).addTo(map);
			
			//$('#resultsData').html('<h4>' + name + '</h4>');
			
			//do clip for each site type
			$.each(siteTypes, function (index,siteType) {

				console.log(map.hasLayer(window[siteType + 'Sites']))
								
				//check to make sure the site type layer is active
				if (map.hasLayer(window[siteType + 'Sites'])) {
					
					//clean up map layers
					if (map.hasLayer(window[siteType + 'Sites_clip_geojson'])) map.removeLayer(window[siteType + 'Sites_clip_geojson']);
					if (map.hasLayer(window[siteType + 'Sites_clip_Layer'])) map.removeLayer(window[siteType + 'Sites_clip_Layer']);
					
					var geojson = window[siteType + 'Sites'].toGeoJSON();
					window[siteType + 'Sites_clip_geojson'] = turf.within(geojson, featureCollection);
					
					$('#resultsData').append('<p><strong>Total ' + siteType + ' sites: ' + window[siteType + 'Sites_clip_geojson'].features.length + '</strong></p>');
					
					//get unique CollectionDescription codes
					var collectionDescriptions = {};
					$.each(window[siteType + 'Sites_clip_geojson'].features, function(i,e) {
						collectionDescriptions[this.properties.CollectionDescription] = (collectionDescriptions[this.properties.CollectionDescription] || 0) + 1;
					});

					var $table1 = $('<table class="table table-condensed" style="margin:0px;font-size:10px;"/>');
					
					$.each(collectionDescriptions, function(i,v) {
						$table1.append('<tr><td>' + i + '</td><td>' + v + '</td>');
					});
					$('#resultsData').append($table1);
					$('#resultsData').append('</br>');
					
					var $table2 = $('<table class="table table-condensed" style="margin:0px;font-size:10px;"/>');
					
					$.each(window[siteType + 'Sites_clip_geojson'].features, function (index,site) {
						$table2.append('<tr><td>' + site.properties.SiteNo + '</td><td>' + site.properties.SiteNo + '</td></tr>')
						
					});
					
					$('#resultsData').append($table2);
					$('#resultsData').append('<hr>');

					if (!featureCollection.features[0].properties.state) {
						window[siteType + 'Sites_clip_Layer'] = L.geoJson(window[siteType + 'Sites_clip_geojson'], {
						pointToLayer: function (feature, latlng) {
							return L.circleMarker(latlng, {
								radius: 10,
								fillColor: "#ff7800",
								color: "#ff8000",
								weight: 1,
								opacity: 1,
								fillOpacity: 0.8
								});
							}
						}).addTo(map);
					}
				}
					
			});
			
			$("#loadingResults").hide();				
			if (featureCollection.features[0].properties.state) return;
			map.fitBounds(identifiedFeature.getBounds());
			
		});
	}
}

function parseGeoJSON() {
	$.each(siteData.features, function (index, siteGeoJSON) {
		//console.log('here', siteGeoJSON)

		siteGeoJSON.properties.collectionCodeList = [];
		siteGeoJSON.properties.collectionCategoryList = [];

		//pull out category and collection codes
		$.each(siteGeoJSON.properties.AgmtInfo, function (index, info) {
			console.log(index, info);

			if(info.CollectionCode && siteGeoJSON.properties.collectionCodeList.indexOf(info.CollectionCode) == -1) {
				siteGeoJSON.properties.collectionCodeList.push(info.CollectionCode);
			}
			if(info.CollectionCategory && siteGeoJSON.properties.collectionCategoryList.indexOf(info.CollectionCategory) == -1) {
				//console.log(siteGeoJSON.properties.collectionCategoryList);
				siteGeoJSON.properties.collectionCategoryList.push(info.CollectionCategory);

				//keep track of any new collection categories
				if(siteTypes.indexOf(info.CollectionCategory) == -1) {
					siteTypes.push(info.CollectionCategory);
				}
			}
			
		});

		siteData.features.push(siteGeoJSON);
	});

	//showPoints()
}

function buildGeoJSON(siftaSite) {

	//dumb check for good site number [was finding some with periods]
	if (!/^\d+$/.test(siftaSite.SiteNo)) {
		console.error("There is a problem with this site number: ", siftaSite.SiteNo)
		badSites.push(siftaSite);
		return;
	}

	//console.log('in queryNWIS: ', siftaSite);
	$.ajax({
		url:'http://waterservices.usgs.gov/nwis/site/?format=mapper,1.0&sites=' + siftaSite.SiteNo,
		dataType: 'xml',
		success: function(document){
			$(document).find("site").each(function(){
				var siteNumber = siftaSite.SiteNo;
				var lat = $(this).attr('lat');
				var lng = $(this).attr('lng');
				var siteGeoJSON = { 
					"type": "Feature",
					"geometry": {"type": "Point", "coordinates": [parseFloat(lng), parseFloat(lat)]},
					"properties": siftaSite
				};

				siteGeoJSON.properties.collectionCodeList = [];
				siteGeoJSON.properties.collectionCategoryList = [];
				//console.log(siteGeoJSON)

				//pull out category and collection codes
				$.each(siftaSite.SiteInfo, function (index, info) {

					if(info.CollectionCode && siteGeoJSON.properties.collectionCodeList.indexOf(info.CollectionCode) == -1) {
						siteGeoJSON.properties.collectionCodeList.push(info.CollectionCode);
					}
					if(info.CollectionCategory && siteGeoJSON.properties.collectionCategoryList.indexOf(info.CollectionCategory) == -1) {
						//console.log(siteGeoJSON.properties.collectionCategoryList);
						siteGeoJSON.properties.collectionCategoryList.push(info.CollectionCategory);

						//keep track of any new collection categories
						if(siteTypes.indexOf(info.CollectionCategory) == -1) {
							siteTypes.push(info.CollectionCategory);
						}
					}
					
				});

				siteData.features.push(siteGeoJSON);		
			});
		},
		error: function(){
			badSites.push(siftaSite);
			console.error("There was an error with NWIS query for:  ", siftaSite.SiteNo);
		}
	});
}

function showPoints() {
	$("#loadingGages").hide();
		
	$.each(siteTypes, function(index,siteType) {
		
		var icon = L.icon({iconUrl: 'images/' + siteType + '_act_16.png',iconSize: [16, 22]});
		if(window[siteType + 'Sites']) window[siteType + 'Sites'] 
		window[siteType + 'Sites'] = L.geoJson(siteData, {
			onEachFeature: function (feature, layer) {

				//build site info display for popup
				var siteInfoContent = '';
				var siteInfoTab = '';

				var agreementNumber = 1;
				$.each(feature.properties.SiteInfo , function(index, data) {
					if (data.Agreement) {
						var startDate = new Date(data.Agreement.StartDate);
						var endDate = new Date(data.Agreement.EndDate);
						var today = new Date();

						if(today > startDate && today < endDate) {
							
							var tableData = '<tr><td>Start Date</td><td>' + data.Agreement.StartDate+ '</td></tr>' +
										 '<tr><td>End Date</td><td>' + data.Agreement.EndDate + '</td></tr>' + 
										 '<tr><td>Customer Name</td><td>' + data.Agreement.CustomerName + '</td></tr>' + 
										 '<tr><td>Customer Funding</td><td>$' + data.Agreement.FundingCustomer + '</td></tr>' + 
										 '<tr><td>USGS CWP Funding</td><td>$' + data.Agreement.FundingUSGSCWP + '</td></tr>';
			
							siteInfoTab += '<li role="presentation"><a href="#agreement' + agreementNumber + '" aria-controls="agreement' + agreementNumber + '" role="tab" data-toggle="tab">Agreement ' + agreementNumber + '</a></li>';
							siteInfoContent += '<div role="tabpanel" class="tab-pane" id="agreement' + agreementNumber + '"><table class="table table-condensed">' + tableData + '</table></div>';
							agreementNumber++;
						} else {
							//console.log('not valid date');
						}
					}
				});
				//var popupTemplate =  '<h5>' + feature.properties.SiteNo + '</h5><table class="table table-condensed" style="font-size:8px;"><tr><td>Site Name</td><td>' + feature.properties.SiteInfo.SiteName + '</td></tr><tr><td>Site Type</td><td>' + feature.properties.collectionCategoryList + '</td></tr><tr><td>Collection Code</td><td>' + feature.properties.collectionCodeList + '</td></tr><tr><td>NWIS Web link</td><td><a href="http://waterdata.usgs.gov/nwis/inventory?agency_code=USGS&site_no=' + feature.properties.SiteNo + '" target="_blank">link</a></td></tr><tr><td>SIMS link</td><td><a href="http://sims.water.usgs.gov/SIMSClassic/StationInfo.asp?office_id=375&site_id=' + feature.properties.SiteNo + '}" target="_blank">link</a></td></tr>' + siteInfo + '</table>'

				var popupTemplate = '<h5>' + feature.properties.SiteNo + '</h5><ul class="nav nav-tabs" role="tablist"><li role="presentation" class="active"><a href="#home" aria-controls="home" role="tab" data-toggle="tab">Site Info</a></li>' + siteInfoTab + '</ul><div class="tab-content"><div role="tabpanel" class="tab-pane active" id="home"><table class="table table-condensed"><tr><td>Site Name</td><td>' + feature.properties.SiteInfo.SiteName + '</td></tr><tr><td>Site Type</td><td>' + feature.properties.collectionCategoryList + '</td></tr><tr><td>Collection Code</td><td>' + feature.properties.collectionCodeList + '</td></tr><tr><td>NWIS Web link</td><td><a href="http://waterdata.usgs.gov/nwis/inventory?agency_code=USGS&site_no=' + feature.properties.SiteNo + '" target="_blank">link</a></td></tr><tr><td>SIMS link</td><td><a href="http://sims.water.usgs.gov/SIMSClassic/StationInfo.asp?office_id=375&site_id=' + feature.properties.SiteNo + '}" target="_blank">link</a></td></tr></table></div>' + siteInfoContent + '</div>';
		
				//console.log(popupTemplate);
				layer.bindPopup(popupTemplate);
			},
			pointToLayer: function (feature, latlng) {
				if (feature.properties.collectionCategoryList.indexOf(siteType) != -1) return L.marker(latlng, {icon: icon});
			}
		}).addTo(map);
					
		$('#gageToggles').append('<div class="btn-group-vertical lyrTogDiv" style="cursor: pointer;" data-toggle="buttons"> <button id="' + siteType + 'Sites"type="button" class="btn btn-default active layerToggle" aria-pressed="true" style="font-weight: bold;text-align: left"><i class="glyphspan glyphicon glyphicon-check"></i><span>&nbsp;&nbsp; SiFTA ' + siteType + ' Sites&nbsp;&nbsp;<img alt="Legend Swatch" src="images/' + siteType + '_act_16.png" /></span></button></div>');		
	});

}
	
function setupGeoFilters(layerList) {
	
	$.each(layerList, function(index,value) {
		
		//append a new dropdown
		$("#geoFilterSelect").append("<h5>" + value.layerName + "</h5><select id='" + value.dropDownID + "' class='geoFilterSelect' style='margin-bottom:10px;'></select>");

		//execute the query task then populate the dropdown menu with list
		mapServer.query().layer(value.layerID).returnGeometry(false).fields(value.outFields).where("1=1").run(function(error, featureCollection){

			var features = featureCollection.features;             
			for(var i=0; i<features.length;i++){
				//console.log('adding: ',features[i].properties[value.outFields[0]], 'to the div: ',value.dropDownID);
				
				$("#" + value.dropDownID).append( $('<option></option>').attr('layerID',value.layerID).val(features[i].properties[value.outFields[1]]).html(features[i].properties[value.outFields[0]]) );
			}
			//sort the options list 
			$("#" + value.dropDownID).html($("#" + value.dropDownID + " option").sort(function (a, b) {
				return a.text == b.text ? 0 : a.text < b.text ? -1 : 1
			}))
			//add the default option
			$("#" + value.dropDownID).prepend("<option layerID='' selected='selected'>Select a " + value.layerName + "</option>");

		});
		//break the loop for testing
		//return false;
	});
}

function setupDataFilters() {
	
	//append a new dropdown
	$("#dataFilterSelect").append("<h5>Fiscal Year</h5><select id='fiscalYearSelect' class='filterSelect' style='margin-bottom:10px;'></select>");

	//add values for +/- 5 years
    var startYear = fiscalYear - 5;
	var endYear = fiscalYear + 5
	while ( startYear <= endYear) {
		$("#fiscalYearSelect").append( $('<option></option>').attr('value',startYear).text(startYear));
		startYear++;
	}

	//make current year selected
	$("#fiscalYearSelect option[value='" + fiscalYear + "']").attr("selected", "selected");
}

function addMapLayer(mapServer, mapServerName, mapServerDetails) {
	
	$.getJSON(mapServerDetails.url + '/legend?f=json', function (legendResponse) {
			$.each(legendResponse.layers, function (index,legendValue) {
					
				$.each(layerList, function (index,layerValue) {
					
				if (legendValue.layerId == layerValue.layerID) {
					
					$('#baseLayerToggles').append('<div class="btn-group-vertical lyrTogDiv" style="cursor: pointer;" data-toggle="buttons"> <button id="' + camelize(layerValue.layerName) + '" value="' + layerValue.layerID + '"type="button" class="btn btn-default active layerToggle" aria-pressed="true" style="font-weight: bold;text-align: left"><i class="glyphspan glyphicon glyphicon-unchecked"></i><span>&nbsp;&nbsp;' + layerValue.layerName + '&nbsp;&nbsp;<img alt="Legend Swatch" src="data:image/png;base64,' + legendValue.legend[0].imageData + '" /></span></button></div>');
					}
			})
		});
	});
}

function camelize(str) {
	return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(letter, index) {
	return index == 0 ? letter.toLowerCase() : letter.toUpperCase();
	}).replace(/\s+/g, '');
}

function setBasemap(basemap) {
	if (layer) {
		map.removeLayer(layer);
	}
	layer = esri.basemapLayer(basemap);
	map.addLayer(layer);
	if (layerLabels) {
		map.removeLayer(layerLabels);
	}

	if (basemap === 'Gray' || basemap === 'Imagery' || basemap === 'Terrain') {

		layerLabels = esri.basemapLayer(basemap + 'Labels');
		map.addLayer(layerLabels);
	}
}

$('.basemapBtn').on('click',function() {
	var baseMap = this.id.replace('btn','');

	// https://github.com/Esri/esri-leaflet/issues/504 submitted issue that esri-leaflet basemaps dont match esri jsapi

	switch (baseMap) {
		case 'Streets': baseMap = 'Streets'; break;
		case 'Satellite': baseMap = 'Imagery'; break;
		case 'Topo': baseMap = 'Topographic'; break;
		case 'Terrain': baseMap = 'Terrain'; break;
		case 'Gray': baseMap = 'Gray'; break;
		case 'NatGeo': baseMap = 'NationalGeographic'; break;
	}

	setBasemap(baseMap);

});
