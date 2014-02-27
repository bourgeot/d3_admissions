/*
 * This script will show a map of the US with a layer of zip codes for high schools.
 * Clicking on the state will cause a list of high schools that are in that state to appear.
 * 
 * Working on performance updates. Split F, T, and R data into three different files. Loading is
 * user controlled. The ordinal scales are annoying so refactoring the data so terms are in PS format
 * and converted to dates in the visualization (e.g. 2074 is Fall 2007). updateSchools is clumsy,
 * so I am changing it to not redo what it has already done.
 * Functionality to add includes making individual schools a filter option.
 */

 
 
//declare some stuff.
var rootContainer = "#visualization",
	dataContainer = '#data',
	dataPath = "../sites/all/modules/d3_admissions/data/",
	lastAvailableTerm = '2134',
	width = 620, 
	height = 350, 
	chartWidth = 325,
	centered,
	population = 'freshmen',
	schoolFile,
	kidFile,
	schools,
	feeders = [],
	geography = [],
	stateLabels = [],
	//schoolList = [],
	schoolsByState,
	schoolsByName,
	schoolsByZip,
	schoolsByCity,
	schoolsByID;

var schoolsTBody, rows;
	
var frosh,
	froshByState,
	froshBySchoolID,
	froshByAdmitTerm,
	froshByZip,
	froshByFate,
	froshByFateGrad,
	fateByAdmitTerm,
	froshGradsByState,
	froshGradsBySchoolID,
	fateBySchool,
	fateByState;

var overlayPieChart,
	admitTermRowChart,
	usMap,
	stateBarChart,
	gradRateBarChart,
	admitCountBarChart,
	trendLinesChart,
	fatePieChart,
	schoolsBarChart;

//Page set up
/****************************
 * Introduction
 ****************************/
var intro = '<h2>UA Incoming Classes from 2007 through 2010: Attendance and Retention Rates for States and Schools</h2>'
	+ '<h3>(Domestic undergraduates from US Schools, admitted and in attendance; data through Fall 2013)</h3>'
	+ '<br/><strong>Select a population: </strong><select id="population"><option selected="selected" value="freshmen">Freshmen</option>'
	+ '<option value="transfers">Transfers</option><option value="readmits">Re-admits</option></select>';

d3.select("#information").append("div").attr("id", "introduction").html(intro);
d3.select("#population").on('change', function() {
	population = this.options[this.selectedIndex].value;
	dc.filterAll();
	schoolsTBody.selectAll('tr').remove();
	visualize(population);
	
});
	
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
	.text('Reset All')
	.attr("href", 'javascript:dc.filterAll();dc.redrawAll();')
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
container = d3.select(dataContainer)
	.append("div")
	.attr("id", "schools");
container.append("strong")
	.attr("class", "chart-title table-title")
	.text("School Performance: Nationwide");
var tColumns = ['[*]','School', 'Location', 'Admits', 'Grads', 'Rate'];
var schoolsTable = container.append("table");
schoolsTable.append("caption").text("(UA partner schools appear in bold face)");
var tableHeader = schoolsTable.append("thead");
var tr = tableHeader.append("tr");
tr.selectAll("th").data(tColumns)
	.enter()
	.append("th")
		.attr("id", function(d) {return d;})
		.text(function(d) { 
			if (d == 'Rate') {
				return 'Rate (%)';
			}
			else {
				return d;
			}
		})
		.on("click", sortBy);
schoolsTBody = schoolsTable.append("tbody");	

/****************************
 * Stacked Bar chart
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id", "trendlines");
trendLinesChart = dc.compositeChart("#trendlines");	
/****************************
 * Map
 ****************************/
container = d3.select(rootContainer)
	.append("div")
	.attr("id", "us-map");
container.append("strong")
	.attr("class", "chart-title")
	.text("Graduation Rates By State ");
container.append("span").attr("class", "note").text("(hover to see summary statistics, click to filter.)");
container.append("span").attr("class", "state-filter filter");
container.append("a")
	.attr("class", "reset")
	.text(' reset')
	.attr("href", 'javascript:usMap.filterAll();dc.redrawAll();')
	.attr("style", 'display: none;');	
//container.append("div").attr("class", "clearfix");
usMap = dc.geoChoroplethChart("#us-map");	



/*******************
 * The Map setup
 *******************/
var projection = d3.geo.albersUsa().scale(700).translate([width/2 + 30, height/2]);
var path = d3.geo.path().projection(projection);

d3.tsv(dataPath + "state_labels.txt", function(error, l) {
	stateLabels = l;});
//initial setup 
visualize(population);
//
function visualize(population) {
	schools = [];
	frosh = [];
	rows = [];
	//define the population to use
	if (population == 'freshmen') {
		schoolFile = 'us-schools-f.txt';
		//kidFile = 'ua-new-f.txt';
		kidFile = 'f-test.txt';
	}
	else if (population == 'transfers') {
		schoolFile = 'us-schools-xr.txt';	
		kidFile = 'x-test.txt';
	}
	else {
		schoolFile = 'us-schools-xr.txt';
		kidFile = 'r-test.txt';
	}
//define the map section
	d3.json(dataPath + "us-states.json", function(error, topology) {
	//console.log(topojson.feature(topology, topology.objects.states).features);
	geography = topology;
	/*
	 * Load the schools after the states have been displayed.
	 */
	d3.tsv(dataPath + schoolFile, function(error, sList) {
		//map the data
		sList.forEach(function(d) {
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
		/*g.append("g")
			.attr("id", "schools");		*/
		
		schools = crossfilter(sList);
		//define the dimensions
		schoolsByState = schools.dimension(function(d) { return d.state; });
		schoolsByName = schools.dimension(function(d) {return d.school;});
		//schoolsCountByState = schoolsByState.group().reduceCount();
		//schoolsByZip = schools.dimension(function(d) { return d.zip;});
		//schoolsByCity = schools.dimension(function(d) {return d.city;});
		schoolsByID = schools.dimension(function(d) {return d.schoolID;});

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

		//now load the student data.
		//d3.tsv(dataPath + "ua-frosh.txt", function(error, data) {
		d3.tsv(dataPath + kidFile, function(error, data) {
			//mapping
			data.forEach(function(d) {
					d.emplid= d.EMPLID,
					d.strm= d.STRM,
					d.gradTerm= d.grad_term,
					d.lastTerm= d.last_enrolled_term,
					d.schoolID= d.ext_org_id,
					d.state= d.schoolstate,
					d.admitTerm= d.EntryTerm
			});
			frosh = crossfilter(data);
			//define dimensions
			froshByAdmitTerm = frosh.dimension(function(d) {return d.admitTerm;});
			//byZip = frosh.dimension(function(d) {return d.Zipcode;});
			froshBySchoolID = frosh.dimension(function(d) {return d.schoolID;});
			froshByState = frosh.dimension(function(d) {return d.state;});
			froshByFate = frosh.dimension(function(d) {return fate(d); });
			froshByFateGrad = froshByFate.group().reduce(fateGradAdd, fateGradRemove, fateGradInit);
			//froshByType = frosh.dimension(function(d) {return d.admitType;});
			//fateByState 
			fateByAdmitTerm = froshByAdmitTerm.group().reduce(fateReduceAdd, fateReduceRemove, fateReduceInitial);
			fateByState = froshByState.group()
				.reduce(fateReduceAdd, fateReduceRemove, fateReduceInitial);
			//fateByState.order(function(p) {return p.totalAttendedUA;});
			fateBySchool = froshBySchoolID.group()
				.reduce(fateReduceAdd, fateReduceRemove, fateReduceInitial);
			//console.log(fateBySchool.order(function(p) {return p.totalGraduatedUA;}).top(5));
			/********************
			 *
			 * dc.js Chart Definitions
			 *
			 ********************/
			
			admitTermRowChart
				.elasticX(true)
				.width(chartWidth)
				.height(200)
				.dimension(froshByAdmitTerm)
				.label(termLabeler)
				.title(function(p) {
					return termLabeler(p.key) + ": " + p.value + ' Attending';
				})
				.ordinalColors(['orange'])
				.group(froshByAdmitTerm.group())
				.on("filtered", updateSchools);
			fatePieChart
				.width(chartWidth)
				.height(200)
				.radius(90)
				.innerRadius(30)
				.dimension(froshByFate)
				.group(froshByFate.group())
				.legend(dc.legend())
				.renderLabel(false)
				.ordinalColors(['red', 'green', 'blue'])
				.on('filtered', updateSchools);
			fatePieChart.cx(0);
			trendLinesChart
				.width(600)
				.height(250)
				.dimension(froshByAdmitTerm)
				//.x(d3.scale.linear().domain([2074,2104]))
				.x(d3.scale.ordinal().domain(['2074', '2084', '2094', '2104']))
				.xUnits(dc.units.ordinal)
				.xAxisLabel("Admit Term")
				.yAxisPadding("10%")
				//.xAxisPadding("10%")
				.margins({top: 10, right: 50, bottom: 50, left: 50})
				.shareColors(true)
				.brushOn(false)
				.shareTitle(false)
				.ordinalColors(['green', 'orange', 'teal'])
				.elasticY(true)
				.elasticX(false)
				.legend(dc.legend().x(425).y(50))
				.renderHorizontalGridLines(true)
				.compose([
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Graduated UA")
						.renderDataPoints({radius: 5, fillOpacity: 0.8, strokeOpacity: 0.8})
						.title(function(d) { return termLabeler(d.key) + ': ' + d.value.totalGraduatedUA + ' Graduated';})
						.valueAccessor(function(d) {return d.value.totalGraduatedUA;}),
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Attended UA")
						.renderDataPoints({radius: 5, fillOpacity: 0.8, strokeOpacity: 0.8})
						.title(function(d) {return termLabeler(d.key) + ': ' + d.value.totalAttendedUA + ' Attending';})
						.valueAccessor(function(d) {return d.value.totalAttendedUA;}),
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Graduated or Returning to UA")
						.renderDataPoints({radius: 5, fillOpacity: 0.8, strokeOpacity: 0.8})
						.dashStyle([3,3])
						.title(function(d) {
							var m = parseInt(d.value.totalReturningToUA) + parseInt(d.value.totalGraduatedUA);
							return termLabeler(d.key) + ': ' + m + ' Graduated or Returning';})
						.valueAccessor(function(d) {return d.value.totalGraduatedUA + d.value.totalReturningToUA;})
					]);
			trendLinesChart.xAxis().tickFormat(termLabeler);
			trendLinesChart.renderlet(function(chart) {
				var tix, cx = [];
				var circles = chart.select('g._0').selectAll('circle.dot');
				circles[0].forEach(function(val, idx) { cx.push(val.getAttribute('cx')); });
				//console.log(cx);
				tix = chart.select('g.x').selectAll('g.tick.major');
				tix[0].forEach(function(val, idx) {
					val.setAttribute('transform', 'translate(' + cx[idx] + ',0)');
				});
			});
			
// dc.js map part...to see if I understand it.
			usMap
				.width(680)
				.height(400)
				.title(function(p) {
					var sName = p.key;
					stateLabels.forEach(function(s) {	if(s.state == p.key) { sName = s.name;}});
					if(p.value !== undefined) {
						return sName + "\nGraduation Rate: " + d3.round(p.value.gradRate * 100, 0) + '%'
							+ "\nAttended UA: " + p.value.totalAttendedUA
							+ "\nGraduated: " + p.value.totalGraduatedUA;
					}
					else {
						return sName + '\nNo UA Attendees';
					}
				})
				.dimension(froshByState)
				.projection(projection)
				.group(fateByState)
				.filterPrinter(function(filter) {return 'Current Filter: ' + filter;})
				.colorAccessor(function(p) {
					if (p !== undefined) {
						return p.gradRate;
					}
					else {
						return 0;
					}
				})
				.colorDomain([0.3, 0.8])
				.colors(d3.scale.quantize().range(["rgb(247,251,255)","rgb(222,235,247)","rgb(198,219,239)",
					"rgb(158,202,225)", "rgb(107,174,214)", "rgb(66,146,198)", "rgb(33,113,181)", "rgb(8,81,156)", "rgb(8,48,107)"]))
				.overlayGeoJson(topojson.feature(topology, topology.objects.states).features, "states", 
					function(d) {return d.properties.postal;}
				)
				.on('filtered', updateSchools);
			updateSchools();
			dc.renderAll();
			dc.redrawAll();
		});
	});
});

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
function fateGradInit() {
	return 0;
}
function fateGradAdd(p, v) {
	if (fate(v) == 'Graduated') {
		return p + 1;
	}
}
function fateGradRemove(p, v) {
	if (fate(v) == 'Graduated') {
		return p - 1;
	}
}
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

function updateSchools() {
	/*
	 * Trying this with data joins. the the list of schools by id will always be a superset of the
	 * fate by id. D3's data joins may work handily here.
	*/ 
	//fateByState is not automatically filtered as a result of how usMap works.
	//var list, rows;
	var list;
		if (usMap.filters().length > 0) {
		froshByState.filterAll();
		froshByState.filterFunction(function(d) {
				return usMap.filters().indexOf(d) > -1;
		});
	}
	list = fateBySchool.order(function(d) {return d.totalAttendedUA;}).top(Infinity).filter(function(d) { return d.value.totalAttendedUA > 0;});
	//list = fateBySchool.top(Infinity);
	//update the schools table using enter, update, and exit routines.
	//the data join
	rows = schoolsTBody.selectAll("tr")
		.data(list, function(d) {return d.key;});

	//update what needs updating--in this case it is the attended, grad, and rate values
	rows.selectAll("td")
		.data(function(d) {
			var sch, name = '', location = '';
			//console.log(d);
			//var s = schoolsByID.filter(d.key).top(1)[0];
			sch = schoolsByID.filter(d.key).top(1);
			if(sch[0] !== undefined) {
				name = sch[0].school;
				location = sch[0].city + ', ' + sch[0].state;
			}
			return ['*',name, location, d.value.totalAttendedUA, d.value.totalGraduatedUA, d3.round(d.value.gradRate * 100, 2)];
		})
		.on('click', filterSchool)
		.html(function(d) {
			if(d=='*') {
				//build a checkbox that filters on that school
				return '<input type="checkbox">';
			}
			else {
				return d;
			}
		});
		
		
	//rows.attr("style", "display: run-in; color: green;");
	//add new rows
	rows.enter().append("tr")
		.attr("class", function(d) {
			schoolsByID.filterAll();
			var f = false, sch;
			sch = schoolsByID.filter(d.key).top(1);
			if(sch[0] !== undefined) {
				f = sch[0].feeder;
			}
			return 'feeder-' + f;
		})
			//return 'feeder-' + d.feeder;
		.selectAll("td")
		.data(function(d) {
			var sch, name = '', location = '';
			//console.log(d);
			//var s = schoolsByID.filter(d.key).top(1)[0];
			sch = schoolsByID.filter(d.key).top(1);
			if(sch[0] !== undefined) {
				name = sch[0].school;
				location = sch[0].city + ', ' + sch[0].state;
			}
			return ['*',name, location, d.value.totalAttendedUA, d.value.totalGraduatedUA, d3.round(d.value.gradRate * 100, 2)];})
		.enter()
		.append("td")
		.on('click', filterSchool)
		.html(function(d) {
			if(d=='*') {
				//build a checkbox that filters on that school
				return '<input type="checkbox">';
			}
			else {
				return d;
			}
		});
	//remove old ones
	rows.exit().remove();
	sortBy('Admits');
	
}

function sortBy(d) {
	/* 
	 * d is the name of the column. since the column names
	 * are the same as the properties of the data set, which is contained in 
	 * schoolList, the sort can be done straightforwardly.
	 */
	//
	//first remove the sorted class strings from all the other column headings
	
	// ** NOTE: THIS ASSUMES rows IS DEFINED.
	rows = schoolsTBody.selectAll("tr");
	//console.log(rows);
	var element;
	var parm = d.toLowerCase();
	var classes = [];
	var i, j, sorted = false;
	//if (parm == 'rate (%)') { parm = 'rate'; }
	for (i = 0; i < tColumns.length; i++) {
		element = document.getElementById(tColumns[i]);
		if (element.id != d) {
			classes = element.className.split(" ");
			for (j = 0; j < classes.length; j++) {
				if (classes[j] == 'sorted-asc' || classes[j] == 'sorted-desc') {
					classes[j] = '';
					//remove the little arrow
					element.innerHTML = element.innerHTML.substr(0, element.innerHTML.length - 1); 
				}
			}
			//now put the class string back
			element.className = classes.join(" ");
		}
		else {
			if (this !== element) {
				//the sort request did not originate in the column header
				//so treat this like a brand new sort and clear the sort from the  class strings
				classes = element.className.split(" ");
				for (j = 0; j < classes.length; j++) {
					if (classes[j] == 'sorted-asc' || classes[j] == 'sorted-desc') {
						classes[j] = '';
						//remove the little arrow
						element.innerHTML = element.innerHTML.substr(0, element.innerHTML.length - 1); 
					}
				}
				//now put the class string back
				element.className = classes.join(" ");
			}
		}
	}
	element = document.getElementById(d);
	classes = element.className.split(" ");
	for(i = 0; i < classes.length; i++) {
		switch(classes[i]) {
			case 'sorted-desc':
				classes[i] = 'sorted-asc';
				//schoolList.sort(function(a, b) { return d3.ascending(a[parm], b[parm]);});
				
				rows.sort(function(a, b) {
					var schA, schB;
					var txtA = '', txtB = '';
					switch(parm) {
						case 'school':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].school;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].school;
							}
							return d3.ascending(txtA, txtB);
							break;
						case 'location':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].city + schA[0].state;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].city + schB[0].state;
							}
							return d3.ascending(txtA, txtB);
							break;
						case 'admits':
							return d3.ascending(a.value.totalAttendedUA, b.value.totalAttendedUA);
							break;
						case 'grads':
							return d3.ascending(a.value.totalGraduatedUA, b.value.totalGraduatedUA);
							break;
						case 'rate':
							return d3.ascending(a.value.gradRate, b.value.gradRate);
							break;
						default:
							return d3.ascending(a.value.totalAttendedUA, b.value.totalAttendedUA);
					}
				});
				sorted = true;
				element.innerHTML = element.innerHTML.substr(0, element.innerHTML.length - 1);
				element.innerHTML += '&#x25B2';
				break;
			case 'sorted-asc':
				//schoolList.sort(function(a, b) { return d3.descending(a[parm], b[parm]);});
				rows.sort(function(a, b) {
					var schA, schB;
					var txtA = '', txtB = '';
					switch(parm) {
						case 'school':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].school;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].school;
							}
							return d3.descending(txtA, txtB);
							break;
						case 'location':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].city + schA[0].state;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].city + schB[0].state;
							}
							return d3.descending(txtA, txtB);
							break;
						case 'admits':
							return d3.descending(a.value.totalAttendedUA, b.value.totalAttendedUA);
							break;
						case 'grads':
							return d3.descending(a.value.totalGraduatedUA, b.value.totalGraduatedUA);
							break;
						case 'rate':
							return d3.descending(a.value.gradRate, b.value.gradRate);
							break;
						default:
							return d3.descending(a.value.totalAttendedUA, b.value.totalAttendedUA);
					}
				});
				classes[i] = 'sorted-desc';
				sorted = true;
				element.innerHTML = element.innerHTML.substr(0, element.innerHTML.length - 1);
				element.innerHTML += '&#x25BC;';
				break;
			default:
				//do nothing.
		}
	}
	if (!sorted) {
		//schoolList.sort(function(a, b) { return d3.descending(a[parm], b[parm]);});
		rows.sort(function(a, b) {
					var schA, schB;
					var txtA = '', txtB = '';
					switch(parm) {
						case 'school':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].school;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].school;
							}
							return d3.descending(txtA, txtB);
							break;
						case 'location':
							schA = schoolsByID.filter(a.key).top(1);
							schB = schoolsByID.filter(b.key).top(1);
							if(schA[0] !== undefined) {
								txtA = schA[0].city + schA[0].state;
							}
							if(schB[0] !== undefined) {
								txtB = schB[0].city + schB[0].state;
							}
							return d3.descending(txtA, txtB);
							break;
				case 'admits':
					return d3.descending(a.value.totalAttendedUA, b.value.totalAttendedUA);
					break;
				case 'grads':
					return d3.descending(a.value.totalGraduatedUA, b.value.totalGraduatedUA);
					break;
				case 'rate':
					return d3.descending(a.value.gradRate, b.value.gradRate);
					break;
				default:
					return d3.descending(a.value.totalAttendedUA, b.value.totalAttendedUA);
			}
		});
		classes.push('sorted-desc');
		element.innerHTML += '&#x25BC;';
	}
	element.className = classes.join(" ");
}
/*
 * Helper function
 */
function termLabeler(term) {
	var label = {
		'2074': 'Fall 07',
		'2084': 'Fall 08',
		'2094': 'Fall 09',
		'2104': 'Fall 10',
	};
	if (term.key !== undefined) {
		return label[term.key];
	}
	else {
		return label[term];
	}
}
function filterSchool() {
	var row = d3.select(this.parentElement);
	//visual feedback.
	if(row.classed('checked')) {
		row.classed({'checked':false});
		row.select("input").property('checked', false);
		froshBySchoolID.filter();
		dc.redrawAll();
	}
	else {
		row.classed({'checked':true});
		row.select("input").property('checked', true);
		console.log(row.data()[0].key);
		froshBySchoolID.filter(row.data()[0].key);
		dc.redrawAll();
	}
	
	//console.log(d3.select(this.parentElement).data());
}