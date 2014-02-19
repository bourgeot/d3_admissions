/*
 * Reading the UA Map
 */
 
var map,
	filePath = 'sites/default/files/data/',
	i,
	j,
	k,
	zoomBox,
	width,
	height,
	scale;
d3.html(filepath + 'ua-map.svg', function(error, data) {
	console.log(data);
	map = data;
});