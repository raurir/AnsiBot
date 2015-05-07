var Twitter = require("twitter");
var _ = require("underscore");
var ansiconvert = require("./ansiconvert");
var Canvas = require("canvas");
var Image = Canvas.Image;
var fs = require("fs");
var http = require("http");
var https = require("https");
var Promise = require('promise');
var request = require("request");

var con = console;

var inputDir = "/test/input/";
var outputDir = "/test/output/";
var tests = [
"086.jpg",
"Arcademi_DontDIY_02.jpg",
"bearroar.jpg",
"ifuckingwish.jpg",
"mech.jpg",
"oneway.jpg",
"testa.JPG",
"tumblr_nhbati4GN91qltbtso1_1280.jpg",
"tumblr_nknbd5VU6I1tiz9hko1_1280.png",
]

var numTests = tests.length, currentTest = 0, test;


function loadImageURL(url) {
	return new Promise(function(fulfill, reject) {
		con.log("Promise loadImageURL", url);
		var protocol = http;
		if (/https:\/\//.test(url)) { protocol = https; }
		protocol.get(url, function(res) {
			var buffers = [], length = 0;
			res.on("data", function(chunk) {
				length += chunk.length;
				// con.log("loadImageURL data", length);
				buffers.push(chunk);
			});
			res.on("end", function() {
				var loaded = Buffer.concat(buffers);
				con.log("loadImageURL fullfill");
				fulfill(loaded);
			});
			res.on("error", function(e) {
				con.log("loadImageURL reject", e);
				reject(e);
			});
		});
	});
}

function readFile(filename, enc){
	return new Promise(function (fulfill, reject){
		fs.readFile(filename, enc, function (err, res){
			con.log("readFile done...");
			if (err) reject(err);
			else fulfill(res);
		});
	});
}

function saveFile(content) {
	con.log("saveFile", content.length);
	return new Promise(function(fulfill, reject) {
		try {
			// var filename = "canvas_" + Math.round(Math.random() * 1e10).toString(16);
			var filename = "canvas_" + test;
			var location = __dirname + outputDir + filename;
			con.log("Promise saveFile content", content.length, "location", location);
			fs.writeFile(location, content
				, 'binary'
				, function(err) {
				if (err) {
					con.log("saveFile reject!!!", err);
					reject(err);
				} else {
					con.log("saveFile fulfill!!!", content.length);
					fulfill(content);
				}
			});

		} catch (e) {

			con.log('saveFile exception', e);

			reject(e);
		}

	});
}

function makeImage(data) {
	return new Promise(function(fulfill, reject) {
		var img = new Image();
		img.src = data;
		if (img) {
			con.log("makeImage fulfill", img);
			fulfill(img);
		} else {
			con.log("makeImage reject");
			reject();
		}
	});
}



function runTest() {
	test = tests[currentTest];
	con.log("test running", test);
	var promisetest = readFile(__dirname + inputDir + test).then(makeImage).then(ansiconvert.render).then(ansiconvert.getBuffer).then(saveFile).then(makeImage).then(nextTest);
}

function nextTest() {
	currentTest++;
	if (currentTest < numTests) {
		runTest();
	} else {
		con.log("tests complete");
	}
}
runTest();

