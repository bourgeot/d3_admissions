/*
 * This script will show a map of the US with a layer of zip codes for high schools.
 * Clicking on the state will cause a list of high schools that are in that state to appear.
 * By default the list will just be all the high schools in the set sorted by alpha (the first
 * 25 will be shown).
 */
 
//declare some stuff.
var rootContainer = "#visualization",
	dataPath = "../sites/all/modules/d3_admissions/data/",
	lastAvailableTerm = '2134',
	width = 710, 
	height = 400, 
	centered,
	schools = [],
	feeders = [],
	geography = [],
	schoolsByState,
	schoolsByZip,
	schoolsByCity,
	schoolsByName,
	schoolCountByState,
	schoolCountByZip,
	schoolCountByCity;

var frosh = [],
	froshByState,
	froshBySchoolID,
	froshByAdmitTerm,
	froshByZip,
	froshByFate,
	froshGradsByState,
	froshGradsBySchoolID,
	fateBySchool,
	fateByState,
	quantize;

var overlayPieChart,
	admitTermRowChart,
	usMap,
	stateBarChart,
	gradRateBarChart,
	admitCountBarChart,
	stateBar2,
	fatePieChart,
	schoolsBarChart;
	
//Page set up
/****************************
 * Introduction
 ****************************/
var intro = '<h2>UA Freshman Class of 2007 and 2008: Attendance and Retention Rates for States and High Schools</h2>'
	+ '<h3>(Domestic ABOR Freshmen from US High Schools, admitted and in attendance from  Fall 2007 and Fall 2008 through Fall 2013)</h3>';

d3.select("#information").append("div").attr("id", "introduction").html(intro);
//create the supporting dc chart divs
var container;
/****************************
 * Headcount Row Chart
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id","headcount");
container.append("strong")
	.attr("class", "chart-title")
	.text("Headcount by Admit Term ");
container.append("span").attr("class", "headcount-filter filter");
container.append("a")
	.attr("class", "reset")
	.text(' reset')
	.attr("href", 'javascript:admitTermRowChart.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;');	
container.append("div").attr("class", "clearfix");
admitTermRowChart = dc.rowChart("#headcount");	
/****************************
 * Fate Pie Chart
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id", "fate");
container.append("strong")
	.attr("class", "chart-title")
	.text("Outcomes: Where are they Now? ");
container.append("span").attr("class", "fate-filter filter");
container.append("a")
	.attr("class", "reset")
	.text(' reset')
	.attr("href", 'javascript:fatePieChart.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;');	
container.append("div").attr("class", "clearfix");
fatePieChart = dc.pieChart("#fate");
/****************************
 * School Information Table
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id", "schools");
container.append("strong")
	.attr("class", "chart-title")
	.text("School Performance ");
var tColumns = ['School', 'City', 'Admits', 'Grads', 'Rate'];
var schoolsTable = container.append("table");
schoolsTable.append("caption").text("(UA partner schools appear in bold face)");
var tableHeader = schoolsTable.append("thead");
var tr = tableHeader.append("tr");
tr.selectAll("th").data(tColumns)
	.enter()
	.append("th").text(function(d) {return d;});
var schoolsTBody = schoolsTable.append("tbody");	
/****************************
 * Map
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id", "us-map");
container.append("strong")
	.attr("class", "chart-title")
	.text("Graduation Rates ");
container.append("span").attr("class", "state-filter filter");
container.append("a")
	.attr("class", "reset")
	.text(' reset')
	.attr("href", 'javascript:usMap.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;');	
container.append("div").attr("class", "clearfix");
usMap = dc.geoChoroplethChart("#us-map");	

//create the map container
var svg = d3.select("#visualization").append("svg")
	.attr("width", width)
	.attr("height", height)
	.attr("id", "map");	
//stateBarChart
var stateBarDiv = d3.select("div#visualization").append("div");
stateBarDiv.attr("id","state-bar-chart");
stateBarDiv.append("h2")
	.attr("class", "title")
	.html("HeadCount By State");
stateBarDiv.append("a")
	.attr("class", "reset")
	.attr("href", 'javascript:stateBarChart.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;').html('reset');
stateBarChart = dc.barChart("#state-bar-chart");
stateBar2 = d3.select(rootContainer).append("div");
stateBar2.attr("id", "grad-count-bar-chart");
stateBar2.append("h2")
	.attr("class", "title")
	.html("Graduate Count By State");
stateBar2.append("a")
	.attr("class", "reset")
	.attr("href", 'javascript:gradCountRowChart.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;').html('reset');
gradRateBarChart = dc.barChart("#grad-count-bar-chart");

	//set up the tooltip container
var tooltip = d3.select("body").append("div")
	.attr("class", "tooltip")
	.attr("id", "tooltip")
	.style("opacity", 0);

	//set up a pie chart for inside the tool tip
	var pieOverlay = tooltip.append("div")
		.attr("id", "pie-overlay")
		.style("opacity", 0);


var g = svg.append("g");
//var gSchools = svg.append("g");
	//gSchools.attr("id", "schools-g");
//set up the data table

/*tr.selectAll("td")
	.data(function(d) {return d; })
	.enter().append("td")
	.text(function(d) {return d;});*/
/* 
 * Set up the color scale based on the number of schools in the state. 
 * Eventually this scale will be used for admits by state and grads by state.
 */
var quantize = d3.scale.quantize()
	.domain([0.3, 0.7])
	.range(d3.range(9).map(function(i) {return "q" + i + "-9";}));

//var color = d3.scale.threshold().domain([
	
/*******************
 * The Map setup
 *******************/
var projection = d3.geo.albersUsa().scale(800).translate([width/2 + 30, height/2]);
var path = d3.geo.path().projection(projection);


//define the map section
d3.json(dataPath + "us-states.json", function(error, topology) {
	//console.log(topojson.feature(topology, topology.objects.states).features);
	geography = topology;
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
			var sCnt = 0;
			var gCnt = 0;
			var mCnt = 0;
			var aCnt = 0;
			if ( schoolsByState !== undefined) {
				//console.log(d.properties.postal);
				//schoolsByState.filter(d.properties.postal);
				sCnt = schoolsByState.filter(d.properties.postal).top(Infinity).length;
				schoolsByState.filterAll();
			}
			if (froshByState !== undefined) {
				froshByFate.filterAll();
				froshByState.filterAll();
				froshByState.filter(d.properties.postal);
				aCnt = froshByState.top(Infinity).length;
				gCnt = froshByFate.filter('Graduated').top(Infinity).length;
				froshByFate.filterAll();
				froshByState.filterAll();
			}
			tooltip.transition()
				.duration(200)
				.style("opacity", .9);
			tooltip.html(d.properties.name + ': ' + sCnt + ' schools<br/>' + gCnt + ' Grads<br/>' + aCnt + ' Admits<br/>' + d3.round(gCnt*100/aCnt, 2) + '%')
				.style("left", (d3.event.pageX + 3) + "px")
				.style("top", (d3.event.pageY - 28) + "px");
		})
		.on("mouseout", function(d) {
			tooltip.transition()
				.duration(200)
				.style("opacity", 0);
		});

	/*
	 * Load the schools after the states have been displayed.
	 */
	d3.tsv(dataPath + "us-schools.txt", function(error, data) {
		//map the data
		data.forEach(function(d) {
				d.county = d.County_Name;
				d.latitude = +d.Latitude;
				d.longitude = +d.Longitude;
				d.city = d.Place_Name;
				d.zip = d.Zipcode;
				d.state = d.State_Code;
				d.school = d.SchoolName;
				d.schoolID = d.Ext_Org_ID;
				d.feeder = false;
		});
		//add an svg 'g' to the map 
		g.append("g")
			.attr("id", "schools");		
		
		schools = crossfilter(data);
		//define the dimensions
		schoolsByState = schools.dimension(function(d) { return d.state; });
		schoolsByName = schools.dimension(function(d) {return d.school;});
		schoolsGroupByState = schoolsByState.group();  //default is identity, so this should return d;
		schoolsCountByState = schoolsByState.group().reduceCount();
		schoolsByZip = schools.dimension(function(d) { return d.zip;});
		schoolsByCity = schools.dimension(function(d) {return d.city;});

		//load the feeder schools and mark them.
		d3.tsv(dataPath + "ua-feeder-schools.txt", function(error, feeders) {
			var candidates;
			feeders.forEach(function(d) {
				if ( schoolsByName !== undefined && schoolsByState !== undefined) {
				//schoolsByState.filter(d.properties.postal);
					candidates = schoolsByState.filter(d.STATE).top(Infinity);
					schoolsByState.filterAll();
					candidates.forEach(function(c) {
						if (d.SCHOOL == c.school && d.CITY == c.city) {
							//console.log(c);
							c.feeder = true;
							//console.log(hit);
						}
					});
				}
			});
		});
	});
		//now load the student data.
		d3.tsv(dataPath + "ua-frosh.txt", function(error, kids) {
			//mapping
			kids.forEach(function(d) {
				d.emplid = d.EMPLID;
				d.strm = d.STRM;
				d.gradTerm = d.grad_term;
				d.lastTerm = d.last_enrolled_term;
				d.cumGPA = +d.cum_gpa;
				d.schoolID = d.ext_org_id;
				d.admitType = d.appllevelabor;
				d.admitTerm = d.OIRPSTerm;
				d.state = d.schoolstate;
			});

			frosh = crossfilter(kids);
			//define dimensions
			froshByAdmitTerm = frosh.dimension(function(d) {return d.admitTerm;});
			//byZip = frosh.dimension(function(d) {return d.Zipcode;});
			froshBySchoolID = frosh.dimension(function(d) {return d.schoolID;});
			froshByState = frosh.dimension(function(d) {return d.state;});
			froshByFate = frosh.dimension(function(d) {return fate(d); }); 
			//fateByState 
			fateByState = froshByState.group()
				.reduce(fateReduceAdd, fateReduceRemove, fateReduceInitial);
			//fateByState.order(function(p) {return p.totalAttendedUA;});
			fateBySchool = froshBySchoolID.group()
				.reduce(fateReduceAdd, fateReduceRemove, fateReduceInitial);
			//console.log(fateBySchool.order(function(p) {return p.totalGraduatedUA;}).top(5));
			/********************
			 *
			 * Map coloring
			 *
			 ********************/
			/* 
			 * Set up the color scale based on the graduation rate in the state. 
			 * 
			 */
			quantize = d3.scale.quantize()
				.domain([0.3, 0.8])
				.range(d3.range(9).map(function(i) {return "q" + i + "-9";}));
						//if the state map has been loaded, add a class to each state which quantizes it
			d3.select("#states").selectAll("path").attr("class", 
				function(d) {
					var q = fateByState.all();
					var ss = '';
					var z;
					for (z = 0; z < q.length; z++) {
						if (q[z].key == d.properties.postal) {
							ss = q[z].value.gradRate;
						}
					}
						return d.properties.name + ' state ' + quantize(ss);
				});			
			admitTermRowChart
				.elasticX(true)
				.width(350)
				.height(200)
				.dimension(froshByAdmitTerm)
				.group(froshByAdmitTerm.group());
			fatePieChart
				.width(350)
				.height(200)
				.radius(90)
				.dimension(froshByFate)
				.group(froshByFate.group())
				.legend(dc.legend())
				.renderLabel(false)
				.ordinalColors(['red', 'green', 'blue']);
			fatePieChart.cx(0);
				var ww = [];
				//fateByState.order(function(p) {return p.totalAttendedUA;}).top(Infinity).forEach(function(d) {ww.push(d.key);});
				fateByState.order(function(p) {return p.gradRate;}).top(Infinity).forEach(function(d) {ww.push(d.key);});		
			//console.log(fateByState.order(function(p) {return p.gradRate;}).top(Infinity));
			
// dc.js map part...to see if I understand it.
			usMap
				.width(680)
				.height(400)
				.title(function(p) {
					return p.key + " " + p.value.gradRate;
				})
				.dimension(froshByState)
				.projection(projection)
				.group(fateByState)
				.colorAccessor(function(p) { return p.gradRate;})
				.colorDomain([0.3, 0.8])
				.colors(d3.scale.quantize().range(["rgb(247,251,255)","rgb(222,235,247)","rgb(198,219,239)",
					"rgb(158,202,225)", "rgb(107,174,214)", "rgb(66,146,198)", "rgb(33,113,181)", "rgb(8,81,156)", "rgb(8,48,107)"]))
				.overlayGeoJson(topojson.feature(topology, topology.objects.states).features, "states", 
					function(d) {return d.properties.postal;}
					);
				usMap.on("filtered", function(chart, filter) {
					alert(filter);
				});
			stateBarChart
				.width(750)
				.height(300)
				.margins({top: 40, right: 50, bottom: 30, left: 60})
				.dimension(froshByState)
				.group(fateByState)
				.valueAccessor(function(p) { return p.value.totalAttendedUA;})
				.x(d3.scale.ordinal().domain(ww))
				.y(d3.scale.linear().domain([0, 1000]))
				.xUnits(dc.units.ordinal)
				.centerBar(false)
				.elasticY(false);
			gradRateBarChart
				.width(700)
				.height(300)
				.margins({top: 40, right: 40, bottom: 30, left: 50})
				.dimension(froshByState)
				.group(fateByState)
				.valueAccessor(function(p) {return p.value.gradRate;})
				.x(d3.scale.ordinal().domain(ww))
				.y(d3.scale.linear().domain([0, 1]))
				.xUnits(dc.units.ordinal)
				.centerBar(false)
				.elasticY(false);
			
			dc.renderAll();
			
				
	});
	
});
	function clicked(d) {
	//console.log(path.bounds(d));
	var x, y, k, bounds, data, students;
		//schoolsByState.filterAll();
		froshByState.filter(d.properties.postal);
		schoolsByState.filter(d.properties.postal);
		data = schoolsByState.top(Infinity);
		students = fateBySchool.all();
		updateSchools(data,students);
	if (d && centered !== d) {
		var centroid = path.centroid(d);
		x = centroid[0];
		y = centroid[1];
		k = 3;
		bounds = path.bounds(d);
		centered = d;
		//console.log(d.properties.postal);

		//console.log(schoolsByState.filter(d.properties.postal).top(Infinity));

		//console.log(data[0]);
		d3.select('#schools')
			.selectAll("circle")
			.data(data)
			.enter()
			.append("circle")
			.attr("cx", function(d) {
				var p = projection([d.longitude, d.latitude]);
				if (p !== null) {
					return p[0];
				};
			})
			.attr("cy", function(d) {
				var p = projection([d.longitude, d.latitude]);
				if (p !== null) {
					return p[1];
				};
			})
			.attr("r", 1.5)
			.attr("id", function(d) {return d.schoolID;})
			.style("fill", "firebrick")
			.on("mouseover", function(d) {
				tooltip.transition()
						.duration(200)
						.style("opacity", .9);
				tooltip.html(d.school)
					.style("left", (d3.event.pageX + 3) + "px")
					.style("top", (d3.event.pageY - 28) + "px");
			})
			.on("mouseout", function(d) {
				tooltip.transition()
					.duration(500)
					.style("opacity", 0);
			});
		g.transition()
			.duration(750)
			.attr("transform", 
				"translate(" + projection.translate() + ")"
				+ "scale(" + .95 / Math.max((bounds[1][0] - bounds[0][0])/width, (bounds[1][1] - bounds[0][1])/height) + ")"
				+ "translate(" + -(bounds[1][0] + bounds[0][0])/2 + ", " + -(bounds[1][1] + bounds[0][1])/2 + ")" );					
		dc.redrawAll();
	}
	else {
		x = width/2;
		y = height/2;
		k = 1;
		centered = null;
		froshByState.filterAll();
		schoolsByState.filterAll();
		dc.redrawAll();
		d3.select("#schools")
			.selectAll("circle")
			.data([])
			.exit()
			.remove();
		g.transition().duration(750).attr("transform", "");
	}
	/*g.selectAll("path")
		.classed("active", centered && function(d) { return d === centered; });*/
	
	/*g.transition()
		.duration(1000)
		.attr("transform", "translate(" + width/2 + "," + height/2 + ")scale(" + k + ") translate(" + -x + "," + -y + ")")
		.style("stroke-width", 1.5 / k + "px");*/

}

//crossfilter functions
//fate  -- definition  REQUIRES lastAvailableTerm to be defined
function fate(d) {
	if (d.gradTerm != 'NONE') {
		return 'Graduated';
	}
	else if (d.lastTerm == lastAvailableTerm) {
		return 'Returning';
	}
	else {
		return 'Elsewhere';
	}
}

//fate-- fateReduceAdd, fateReduceRemove, fateReduceInitial
// p is the transient instance of the reduced object for a particular key
//v is the current record (from http://stackoverflow.com/questions/16767231)
function fateReduceInitial() {
	return {
		totalAttendedUA: 0,
		totalGraduatedUA: 0,
		totalElsewhere: 0,
		totalReturningToUA: 0,
		gradRate:0,
		attritionRate:0
	};
}
function fateReduceAdd(p, v) {
	if (fate(v) == 'Graduated') {
		p.totalAttendedUA++;
		p.totalGraduatedUA++;
	}
	if (fate(v) == 'Returning') {
		p.totalAttendedUA++;
		p.totalReturningToUA++;
	}
	if (fate(v) == 'Elsewhere') {
		p.totalAttendedUA++;
		p.totalElsewhere++;
	}
	if (p.totalAttendedUA > 0) {
		p.gradRate = p.totalGraduatedUA/p.totalAttendedUA;
		p.attritionRate = p.totalElsewhere/p.totalAttendedUA;
	}
	else {
		p.gradRate = 0;
		p.attritionRate = 0;
	}
	return p;
}
function fateReduceRemove(p, v) {
	if (fate(v) == 'Graduated') {
		p.totalAttendedUA--;
		p.totalGraduatedUA--;
	}
	if (fate(v) == 'Returning') {
		p.totalAttendedUA--;
		p.totalReturningToUA--;
	}
	if (fate(v) == 'Elsewhere') {
		p.totalAttendedUA--;
		p.totalElsewhere--;
	}
	if (p.totalAttendedUA > 0) {
		p.gradRate = p.totalGraduatedUA/p.totalAttendedUA;
		p.attritionRate = p.totalElsewhere/p.totalAttendedUA;
	}
	else {
		p.gradRate = 0;
		p.attritionRate = 0;
	}
	return p;
}
function updateSchools(schools, students) {
	//school, city, admits, grads, rate
		schoolsTBody.selectAll("tr")
			.data([])
			.exit()
			.remove();
	
	schools.forEach(function(d) {
		//froshBySchoolID.filter(d.schoolID);
		//console.log(d.schoolID);
		var a = 0, b = 0;
		fateBySchool.all().forEach(function(e) {
			if(e.key == d.schoolID) {
				a = e.value.totalAttendedUA;
				b = e.value.totalGraduatedUA;
			}
		});
		if (a > 0) {
			schoolsTBody.append("tr")
				.attr("class", 'feeder-' + d.feeder)
				
				.data([d.school, d.city, a, b, d3.round(b*100/a, 2) + '%'])
				.enter()
				.selectAll("td").append("td")
				.text(function(e) {return e;});
		}
		froshBySchoolID.filterAll();
		}
	);
	console.log(schoolsTBody.selectAll("tr").data());
}