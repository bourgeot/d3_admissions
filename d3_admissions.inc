<?php

/*
 * Page callbacks and other functions for admissions module.
 */

function d3_admissions_fetch($args = NULL) {
	//drupal only passes the first argument even if there are multiples in this case.
	//the zeroth argument is the path to get here btw.
	//$args = explode('/', current_path());
	//dsm($args);
	$q = "SELECT applicationID, adm_appl_nbr, concat(LEFT(created,4), MID(created, 6,2), MID(created, 9,2)) as start, concat(MID(created, 12,2), MID(created,15,2)) as starttime, daysToCompleAppl as latency, DaysCompletedTillUAStarts as daysAhead, DATE_FORMAT(STR_TO_DATE(admitdate, '%c/%d/%Y'),'%Y%m%d') as adate, if(UnitsAttempted>0,1,0) as enrolled, PostalCode, strm, coalesce(ua_academic_index2,0) as ai, HSSchoolCode FROM {admissions} WHERE strm = '2124' LIMIT 500";
	$result = db_query($q);
	$data = $result->fetchAll();
	return $data;
}

function d3_admissions_zipcodes() {
	$q = "SELECT Zip as zip, latitude, longitude, State FROM {zip_codes} ORDER BY Zip";
	$result = db_query($q);
	$data = $result->fetchAll();
	return $data;
}
function d3testing() {
	//all the action happens in the various javascript files
	//whose names are supplied as arguments.
	$libpath = 'sites/all/libraries';
	$module_path = 'sites/all/modules/d3_admissions';
	drupal_add_js($libpath . '/d3.js', 'file');
	drupal_add_js($libpath . '/topojson.js', 'file');
	drupal_add_js($libpath . '/crossfilter.js', 'file');
	drupal_add_js($libpath . '/dc.min.js', 'file');
	drupal_add_js($libpath . '/queue.min.js', 'file');

	//the zeroth arg is the path to get here btw. In this case, it is the string 'lab'
	drupal_add_css($libpath . '/dc.css', 'file');
	$args = explode('/', current_path());
	if (isset($args[1])) {
		drupal_add_js($module_path . '/js/' . $args[1] . '.js', 'file');
		drupal_add_css($module_path . '/css/' . $args[1] . '.css', 'file');
		//$markup =  '<h2>Using Script: ' . $args[1] . '</h2>';
	}
	else {
		//$markup = '<h2>Add a script name as path argument to work with it.</h2>';
	}
	$page = array(
		'information' => array(
			'#type' => 'container',
			'#attributes' => array(
				'id' => 'information',
				'class' => array(
					'clearfix',
				),
			),
		),
		'left-column' => array (
			'#type' => 'container',
			'#attributes' => array (
				'id' => 'left-column',
				'class' => array (
					'clearfix',
				),
			),
			'visualization' => array(
				'#type' => 'container',
				'#attributes' => array(
					'id' => 'visualization',
				),
			),
		),
		'right-column' => array (
			'#type' => 'container',
			'#attributes' => array (
				'id' => 'right-column',
				'class' => array (
					'clearfix',
				),
			),
			'data' => array(
				'#type' => 'container',
				'#attributes' => array(
					'id' => 'data',
				),
			),
		),
	);		

	return $page;
}	
	
function d3_admissions_visualization() {
	//all the action for this happens in the javascript file.
	$libpath = 'sites/all/libraries';
	drupal_add_js($libpath . '/d3.js', 'file');
	drupal_add_js($libpath . '/topojson.js', 'file');
	drupal_add_js($libpath . '/crossfilter.js', 'file');
	drupal_add_js($libpath . '/dc.js', 'file');	
	drupal_add_js('sites/all/modules/d3_admissions/js/county-map.js', 'file');
	//the zeroth argument is the path to get here btw.
	$args = explode('/', current_path());
	//dsm($args);
	

	drupal_add_css('sites/all/modules/d3_admissions/css/vis.css', 'file');
	drupal_add_css('sites/all/modules/d3_admissions/css/dc.css', 'file');

	$page = array(
		'information' => array(
			'#prefix' => '<div id="information">',
			'#suffix' => '</div>',
			'#markup' => '<h2>Admissions Visualization</h2>',
		),
		'container' => array(
			'#type' => 'container',
			'#attributes' => array(
				'id' => 'visualization',
			),
		),
	);		

	return $page;
}
function ua_org_view() {
	//return array('hello'=>'world');
	$ch = curl_init("https://siaapps.uits.arizona.edu/home/orgs/ua_orgs/index.json");
	curl_exec($ch);
	return;
}