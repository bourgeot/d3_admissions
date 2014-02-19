/*
 * This script will show a map of the US with a layer of zip codes for high schools.
 * Clicking on the state will cause a list of high schools that are in that state to appear.
 * By default the list will just be all the high schools in the set sorted by alpha (the first
 * 25 will be shown).
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
	schools = [],
	feeders = [],
	geography = [],
	stateLabels = [],
	schoolList = [],
	allSchools = [],
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
	froshByFateGrad,
	fateByAdmitTerm,
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
	trendLinesChart,
	fatePieChart,
	schoolsBarChart;

//Page set up
/****************************
 * Introduction
 ****************************/
var intro = '<h2>UA Incoming Classes from 2007 through 2009: Attendance and Retention Rates for States and Schools</h2>'
	+ '<h3>(Domestic undergraduates from US Schools, admitted and in attendance; data through Fall 2013)</h3>'
	+ '<br/><strong>Select a population: </strong><select id="population"><option selected="selected" value="freshmen">Freshmen</option>'
	+ '<option value="transfers">Transfers/Re-admits</option></select>';

d3.select("#information").append("div").attr("id", "introduction").html(intro);
d3.select("#population").on('change', function() {
	population = this.options[this.selectedIndex].value;
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
var tColumns = ['School', 'Location', 'Admits', 'Grads', 'Rate'];
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
var schoolsTBody = schoolsTable.append("tbody");	

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
	//define the population to use
	if (population == 'freshmen') {
		schoolFile = 'us-schools-f.txt';
		kidFile = 'ua-new-f.txt';
		//kidFile = 'f-test.txt';
	}
	else if (population == 'transfer') {
		schoolFile = 'us-schools-xr.txt';	
		kidFile = 'ua-new-x.txt';
	}
	else {
		schoolFile = 'us-schools-xr.txt';
		kidFile = 'ua-new-r.txt';
	}
//define the map section
	d3.json(dataPath + "us-states.json", function(error, topology) {
	//console.log(topojson.feature(topology, topology.objects.states).features);
	geography = topology;
	/*
	 * Load the schools after the states have been displayed.
	 */
	d3.tsv(dataPath + schoolFile, function(error, data) {
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
		/*g.append("g")
			.attr("id", "schools");		*/
		
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

		//now load the student data.
		//d3.tsv(dataPath + "ua-frosh.txt", function(error, kids) {
		d3.tsv(dataPath + kidFile, function(error, kids) {
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
				.x(d3.scale.ordinal().domain(['Fall 2007', 'Fall 2008', 'Fall 2009']))
				.xUnits(dc.units.ordinal)
				.xAxisLabel("Admit Term")
				.yAxisPadding("10%")
				.margins({top: 10, right: 50, bottom: 50, left: 50})
				.shareColors(true)
				.shareTitle(false)
				.ordinalColors(['green', 'orange', 'teal'])
				.elasticY(true)
				.legend(dc.legend().x(400).y(50))
				.renderHorizontalGridLines(true)
				.compose([
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Graduated UA")
						.renderDataPoints({radius: 5, fillOpacity: 0.8, strokeOpacity: 0.8})
						.title(function(d) { return d.key + ': ' + d.value.totalGraduatedUA + ' Graduated';})
						.valueAccessor(function(d) {return d.value.totalGraduatedUA;}),
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Attended UA")
						.renderDataPoints({radius: 5, fillOpacity: 0.8, strokeOpacity: 0.8})
						.title(function(d) {return d.key + ': ' + d.value.totalAttendedUA + ' Attending';})
						.valueAccessor(function(d) {return d.value.totalAttendedUA;}),
					dc.lineChart(trendLinesChart)
						.group(fateByAdmitTerm, "Total Graduated or Returning to UA")
						.renderDataPoints({radius: 3, fillOpacity: 0, strokeOpacity: 0.8})
						.dashStyle([3,3])
						.title(function(d) {
							var m = parseInt(d.value.totalReturningToUA) + parseInt(d.value.totalGraduatedUA);
							return d.key + ': ' + m + ' Graduated or Returning';})
						.valueAccessor(function(d) {return d.value.totalGraduatedUA + d.value.totalReturningToUA;})
					]);
			//trendLinesChart
				//.width(chartWidth)
				//.height(200)
				//.dimension(froshByAdmitTerm)
				//.group(fateByAdmitTerm, 'Total Graduated UA')
				//.renderHorizontalGridLines(true)
				//.legend(dc.legend())
				//.seriesAccessor(function(d) { return fate(d);})
				//.valueAccessor(function(d) { return d.value.totalGraduatedUA; })
				//.x(d3.scale.ordinal().domain(['Fall 2007', 'Fall 2008', 'Fall 2009']))
				//.stack(fateByAdmitTerm, 'Total Returning UA', function(d) {return d.value.totalReturningToUA;})
				//.stack(fateByAdmitTerm, 'Total Elsewhere', function(d) {return d.value.totalElsehere;})
				//.xUnits(dc.units.ordinal)
				//.elasticY(true);
				//var ww = [];
				//fateByState.order(function(p) {return p.totalAttendedUA;}).top(Infinity).forEach(function(d) {ww.push(d.key);});
				
				//might not need this.
				//fateByState.order(function(p) {return p.gradRate;}).top(Infinity).forEach(function(d) {ww.push(d.key);});		
			//console.log(fateByState.order(function(p) {return p.gradRate;}).top(Infinity));
			
// dc.js map part...to see if I understand it.
			usMap
				.width(680)
				.height(400)
				.title(function(p) {
					var sName = p.key;
					stateLabels.forEach(function(s) {	if(s.state == p.key) { sName = s.name;}});
					return sName + "\nGraduation Rate: " + d3.round(p.value.gradRate, 2) + '%'
					+ "\nAttended UA: " + p.value.totalAttendedUA
					+ "\nGraduated: " + p.value.totalGraduatedUA;
				})
				.dimension(froshByState)
				.projection(projection)
				.group(fateByState)
				.filterPrinter(function(filter) {return 'Current Filter: ' + filter;})
				.colorAccessor(function(p) { return p.gradRate;})
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
	//school, location, admits, grads, rate
	//reset the list
	schoolsTBody.selectAll("tr").remove();
	schoolList = [];
	var i, j, k, a, b, set = [],
	states = usMap.filters(),
	title = d3.select('strong.table-title');

	//froshByState.filter(filter);
	//schoolsByState.filterRange(filter);
	schoolsByState.filter();
	if(states.length > 0) {
		title.text(function() {
			return 'School Performance: ' + states.join(", ");
		});
		//there are filters
		for (i=0; i < states.length; i++) {
			schoolsByState.filter(states[i]);
			//console.log(schoolsByState.top(Infinity));
			set = set.concat(schoolsByState.top(Infinity));
			schoolsByState.filter();
		}
	}
	else {
		set = schoolsByState.top(Infinity);
		//update the title.
		title.text("School Performance: Nationwide");
	}
	//data = schoolsByState.top(Infinity);
	//students = fateBySchool.all();
	var s = fateBySchool.all();
	for (j=0; j<set.length; j++) {
		for(k=0; k<s.length; k++) {
			if (set[j].schoolID == s[k].key) {
				a = s[k].value.totalAttendedUA;
				b = s[k].value.totalGraduatedUA;
				if (a>0) {
					schoolList.push({feeder: set[j].feeder, school: set[j].school, location: set[j].city + ', ' + set[j].state, admits: a, grads: b,  rate: d3.round(b*100/a,2)});
				}
				continue;
			}
		}
	}
	/*set.forEach(function(d) {
		//froshBySchoolID.filter(d.schoolID);
		//console.log(d.schoolID);
		//var a = 0, b = 0;
		//froshBySchoolID.filterAll();
		//froshBySchoolID.filter(d.schoolID);
		console.log(d3.map(fateBySchool.all()).get(d.schoolID));
		fateBySchool.all().forEach(function(e) {
			if(e.key == d.schoolID) {
				a = e.value.totalAttendedUA;
				b = e.value.totalGraduatedUA;
			}
		});
		if (a > 0) {
			schoolList.push({feeder: d.feeder, school: d.school, location: d.city + ', ' + d.state, admits: a, grads: b,  rate: d3.round(b*100/a,2)});
		}
		//froshBySchoolID.filterAll();
	});*/
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
				schoolList.sort(function(a, b) { return d3.ascending(a[parm], b[parm]);});
				sorted = true;
				element.innerHTML = element.innerHTML.substr(0, element.innerHTML.length - 1);
				element.innerHTML += '&#x25B2';
				break;
			case 'sorted-asc':
				schoolList.sort(function(a, b) { return d3.descending(a[parm], b[parm]);});
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
		schoolList.sort(function(a, b) { return d3.descending(a[parm], b[parm]);});
		classes.push('sorted-desc');
		element.innerHTML += '&#x25BC;';
	}
	element.className = classes.join(" ");
	//rebuild the table rows.
	schoolsTBody.selectAll("tr").remove();
	schoolsTBody.selectAll("tr")
		.data(schoolList)
		.enter()
		.append("tr")
		.attr("id", function(d, i) { return i;})
		.attr("class", function(d) {return 'feeder-' + d.feeder;})
		.selectAll("td")
		.data(function(d) {
			return [d.school, d.location, d.admits, d.grads, d.rate];})
		.enter()
			.append("td")
			.text(function(d) {return d;});
	//remove the processing-true from the body class list
}
