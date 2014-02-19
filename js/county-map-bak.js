//this presupposes both d3 and topojson

var width = 960,
height = 500;
/*
var projection = d3.geo.mercator()
	.center([0, 5])
	.scale(900)
	.rotate([-180, 0]);
*/
var projection = d3.geo.albersUsa();

var path = d3.geo.path()
	.projection(projection)
	.pointRadius(1.5);
	
var svg = d3.select("div#visualization").append("svg")
	.attr("width", width)
	.attr("height", height);

var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);
	
var g = svg.append("g");

d3.json("sites/default/files/data/us.json", function(error, topology) {
	var s = crossfilter(topology);
	//var states = s.dimension(function(d) {return
	//console.log(topology.objects);
	g.selectAll("path")
		.data(topojson.feature(topology, topology.objects.states).features)
		.enter()
		.append("path")
		.attr("d", path);
	var cities;
	d3.json("/survey-info/zip-codes", function(error, data) {
			console.log(data);
			g.selectAll("circle")
				.data(data)
				.enter()
				.append("circle")
				.attr("cx", function(d) {
					return projection([parseFloat(d.longitude), parseFloat(d.latitude)])[0];
				})
				.attr("cy", function(d) {
					return projection([parseFloat(d.longitude), parseFloat(d.latitude)])[1];
				})
				.attr("r", 1.5)
				.style("fill", "green")
				.on("mouseover", function(d) {
					tooltip.transition()
							.duration(200)
							.style("opacity", .9);
					tooltip.html(d.zip)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on("mouseout", function(d) {
					tooltip.transition()
						.duration(500)
						.style("opacity", 0);
				});		
	});	
	/*d3.tsv("sites/default/files/data/2013urban.txt", 
		function(d) {
			return {
				name: d.NAME, 
				y: +d.INTPTLAT,
				x: +d.INTPTLONG
			};
		},
		function(error, datax) {
			//console.log(rows);
			g.selectAll("circle")
				.data(datax)
				.enter()
				.append("circle")
				.attr("cx", function(d) {
					return projection([d.x, d.y])[0];
				})
				.attr("cy", function(d) {
					return projection([d.x, d.y])[1];
				})
				.attr("r", 3.5)
				.style("fill", "blue")
				.on("mouseover", function(d) {
					tooltip.transition()
							.duration(200)
							.style("opacity", .9);
					tooltip.html(d.name)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on("mouseout", function(d) {
					tooltip.transition()
						.duration(500)
						.style("opacity", 0);
				});
		}
	);*/
	
});