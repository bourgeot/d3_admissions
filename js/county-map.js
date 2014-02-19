//this presupposes both d3 and topojson and dc and crossfilter.
//declare some stuff.

var width = 720,
	height = 400,
	centered;
//crossfilter
var students, 
	retention,
	byAdmitTerm,
	byZip,
	bySchool,
	byState,
	byFate;
var projection = d3.geo.albersUsa().scale(800).translate([width/2 - 35, height/2]);

var path = d3.geo.path()
	.projection(projection);
	
var svg = d3.select("div#visualization").append("svg")
	.attr("width", width)
	.attr("height", height);
var schoolsDiv = d3.select("div#visualization").append("div");
	schoolsDiv.attr("id", "schools-table");
	schoolsDiv.append("a").attr("class", "reset").attr("href", 'javascript:schoolsTable.filterAll();dc.redrawAll();')
		.attr("style", 'display: none;').html('reset');
//var schoolsTable =  dc.dataTable("div#schools-table");
var rowDiv = d3.select("div#visualization").append("div");
	rowDiv.attr("id", "terms-row-chart");
	rowDiv.append("a").attr("class", "reset").attr("href", 'javascript:termRowChart.filterAll();dc.redrawAll();')
		.attr("style", 'display: none;').html('reset');
var termRowChart = dc.rowChart("div#terms-row-chart");
var fateDiv = d3.select("div#visualization").append("div");
	fateDiv.attr("id", "fate-pie-chart");
var fatePieChart = dc.pieChart("div#fate-pie-chart");
	
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.style("opacity", 0);

	
var g = svg.append("g");
function clicked(d) {
	var x, y, k;
	if (d && centered !== d) {
		var centroid = path.centroid(d);
		x = centroid[0];
		y = centroid[1];
		k = 1;
		centered = d;
		//console.log(d.properties.postal);
		byState.filter(d.properties.postal);
		dc.redrawAll();
	}
	else {
		x = width/2;
		y = height/2;
		k = 1;
		centered = null;
		byState.filter();
		dc.filterAll();
		dc.redrawAll();
	}
	g.selectAll("path")
		.classed("active", centered && function(d) { return d === centered; });
	
	g.transition()
		.duration(1500)
		.attr("transform", "translate(" + width/2 + "," + height/2 + ")scale(" + k + ") translate(" + -x + "," + -y + ")")
		.style("stroke-width", 1.5 / k + "px");
}
/*d3.json("sites/default/files/data/us.json", function(error, topology) {
	//var s = crossfilter(topology);
	//var states = s.dimension(function(d) {return
	//console.log(topology.objects);
	//console.log(topojson.feature(topology, topology.objects.state).features);
	g.append("g")
		.attr("id", "states")
		.selectAll("path")
			.data(topojson.feature(topology, topology.objects.states).features)
		.enter()
			.append("path")
			.attr("class", function(d) {
				return d.properties.STUSPS10 + ' ' + d.properties.NAME10 + ' state';
			})
			.attr("d", path)
			.on("click", clicked);
	var cities;
	var terms;
	d3.tsv("sites/default/files/data/term_legend.txt", function(error, legend) {
		terms = legend;
		//console.log(terms);
	});*/
	//define the map section
	d3.json("sites/all/modules/d3_admissions/data/us-states.json", function(error, topology) {
		//console.log(topojson.feature(topology, topology.objects.states).features);
		g.append("g")
			.attr("id", "states")
			.selectAll("path")
			.data(topojson.feature(topology, topology.objects.states).features)
		.enter()
				.append("path")
				.attr("d", path)
				.attr("id", function(d) {return d.properties.postal;})
				.attr("class", function(d) {return d.properties.name + ' state';})
				.on("click", clicked)
				.on("mouseover", function(d) {
					tooltip.transition()
						.duration(200)
						.style("opacity", .9);
					tooltip.html(d.properties.name)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on("mouseout", function(d) {
					tooltip.transition()
						.duration(200)
						.style("opacity", 0);
				});
		//load the student data section
		d3.tsv("sites/all/modules/d3_admissions/data/UAFrosh.txt", function(error, data) {
			students = data;

			//crossfilter
			retention = crossfilter(data);
			//define dimensions
			byAdmitTerm = retention.dimension(function(d) {return d.OIRPSTerm;});
			byZip = retention.dimension(function(d) {return d.Zipcode;});
			bySchool = retention.dimension(function(d) {return d.descr50;});
			byState = retention.dimension(function(d) {return d.schoolstate;});
			byFate = retention.dimension(function(d) {
				var psTerm = {"Fall 2007": '2074', "Fall 2008": '2084'};
				var terms = 1;
				if (d.grad_term != 'NONE') {
					return 'Graduated';
				}
				else if (d.last_enrolled_term == '2134') {
					return 'Returning';
				}
				else {
					terms = parseInt(d.last_enrolled_term) - parseInt(psTerm[d.OIRPSTerm]);
					return 'Elsewhere';
				}
				console.log(psTerm[d.OIRPSTerm]);
			});
			//render the dc term row chart
			termRowChart.width(350).height(200).margins({ top: 10, right: 10, bottom: 20, left: 40})
				.dimension(byAdmitTerm)
				.group(byAdmitTerm.group())
				.transitionDuration(500);
			fatePieChart.width(200).height(200).radius(80)
			    .colors(['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb'])
    // (optional) define color domain to match your data domain if you want to bind data or color
    .colorDomain([-1750, 1644])
    // (optional) define color value accessor
    //.colorAccessor(function(d, i){return d.value;})
				.dimension(byFate)
				.group(byFate.group());
			//schoolsTable.title('Top 20 UA-Grad-Producing High Schools');

				
				
			dc.renderAll();
		});
	/*d3.tsv("sites/default/files/data/Fall2007.txt", function(error, data) {
			//console.log(data);
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
					tooltip.html(d.Zipcode)
						.style("left", (d3.event.pageX) + "px")
						.style("top", (d3.event.pageY - 28) + "px");
				})
				.on("mouseout", function(d) {
					tooltip.transition()
						.duration(500)
						.style("opacity", 0);
				});
			/**************
				* crossfilter section
				* 
				* dimensions State, Zip, Entering Term, Fate, School
			*/
			/*var admissions = crossfilter(data);
			var termsEnrolled = admissions.dimension(function(d) {
				return d.STRM;
			});
			termsEnrolledGroup = termsEnrolled.group().reduceCount();
				
			termRowChart.width(350).height(200).margins({ top: 10, right: 10, bottom: 20, left: 40})
				.dimension(termsEnrolled)
				.group(termsEnrolledGroup)
				.transitionDuration(500);
			
			
			dc.renderAll();
	});*/	
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