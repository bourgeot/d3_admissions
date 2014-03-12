/*
 * topojson exploration for nearest neighbors and regions.
 */
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
<!DOCTYPE html>
<meta charset="utf-8">
<style>

.state {
  fill: #ccc;
}

.state-boundary {
  fill: none;
  stroke: #fff;
}

.state.selected {
  fill: orange;
}

.state.selected-boundary {
  fill: none;
  stroke: #000;
  stroke-width: 2px;
}

</style>
<body>
<script src="http://d3js.org/d3.v3.min.js"></script>
<script src="http://d3js.org/topojson.v1.min.js"></script>
<script>

var width = 960,
    height = 500;

var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

var selected = {
  "9": 1, "10": 1, "12": 1, "13": 1, "19": 1, "17": 1, "18": 1, "21": 1,
  "25": 1, "24": 1, "23": 1, "26": 1, "29": 1, "37": 1, "31": 1, "33": 1,
  "34": 1, "36": 1, "39": 1, "42": 1, "44": 1, "45": 1, "47": 1, "51": 1,
  "50": 1, "55": 1, "54": 1
};

d3.json("/mbostock/raw/4090846/us.json", function(error, us) {
  var states = topojson.feature(us, us.objects.states),
      selection = {type: "FeatureCollection", features: states.features.filter(function(d) { return d.id in selected; })};

  svg.append("path")
      .datum(states)
      .attr("class", "state")
      .attr("d", path);

  svg.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "state-boundary")
      .attr("d", path);

  svg.append("path")
      .datum(selection)
      .attr("class", "state selected-boundary")
      .attr("d", path);

  svg.append("path")
      .datum(selection)
      .attr("class", "state selected")
      .attr("d", path);
});

</script>
