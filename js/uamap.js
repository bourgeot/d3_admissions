/*
 * Reading the UA Map
 */
function fetchBldg(list) {
	console.log('ding');
	uaBuildings = list;
	console.log(list);
}
var map,
	filePath = '../sites/default/files/data/',
	zoomBox,
	zG,
	buildingShape,
	building = d3.select('#right-column').append('h2').attr('id','building'),
	attrs = d3.select('#right-column').append('em').attr('id','attributes'),
	width = 700,
	height = 600,
	width1 = 300,
	height1 = 300,
	scale,
	center,
	list, script = null,
	uaBuildings;
 

d3.xml(filePath + 'ua-map.svg', "image/svg+xml", function(xml) {
	script = document.createElement('script');
	script.src = 'https://siaapps.uits.arizona.edu/home/web_services/UABuildingLookup.json?wrapper=fetchBldg';
	document.body.appendChild(script);
	document.getElementById('left-column').appendChild(xml.documentElement);
	var svg = d3.selectAll('svg');
	svg.attr('id', 'map')
		.attr('height', height)
		.attr('width', width);
	var vb = svg.attr('viewBox').split(' '); //[minx, miny, width, height]
	center = [(parseFloat(vb[2]) - parseFloat(vb[0]))/2, (parseFloat(vb[3]) - parseFloat(vb[1]))/2];
	console.log(center);
	zoomBox = d3.select('#right-column').insert('div')
		.append('svg')
		.attr('id','zoom-box')
		.attr('width', width1)
		.attr('height', height1)
		.attr('transform', 'translate(-400,-400)scale(4)')
		.attr('viewBox', svg.attr('viewBox'));
	//find the center of the viewbox. 
	zG = zoomBox
		.append('g')
		.attr('transform', svg.select('g').attr('transform'))
		.append('g').attr('id', 'zoom-g');
	buildingShape = zG.append("path");
	svg.selectAll('path')
		.on('mouseover', function(d, i) {
	building.text(this.getAttribute('fme:Name'));
	attrs.html('Space Number: ' + this.getAttribute('fme:SpaceNumText')
		+ '<br/>Building Number: ' + this.getAttribute('fme:SpaceNumLetter')
		+ '<br/>Object ID: ' + this.getAttribute('fme:OBJECTID'));
					zG.selectAll("path").remove();
			map = document.getElementById('map');
			var x = center[0] - d3.mouse(map)[0];
			var y = d3.mouse(map)[1] - center[1];
			zG.attr('transform', 'translate(' + x + ',' + y + ')');
			var b = this.cloneNode(false);
			document.getElementById('zoom-g').appendChild(b);
		});
	
});

