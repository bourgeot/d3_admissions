/*
 * filetest.js
 */

var rootContainer = "#visualization",
	dataContainer = '#data',
	dataPath = "../sites/all/modules/d3_admissions/data/",
	states = [];

d3.tsv(dataPath + "state_labels.txt", function(error, l) {
	console.log(l);
	var i;
	for (i=0; i<l.length; l++) {
		states.push(l[i].state);
	}
	console.log(states);
}
