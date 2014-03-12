/*
 * service-test.js
 */

var url = "https://siaapps.uits.arizona.edu/home/orgs/ua_orgs/index.json",
	localUrl = "http://devweb.em.arizona.edu/survey-info/org-test";
d3.json(url, function(error, json) {
	console.log(json);
	console.log(error);
});

d3.json(localUrl, function(error, json) {
	console.log(error);
	console.log(json);
});