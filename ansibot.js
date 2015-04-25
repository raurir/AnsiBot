var Twitter = require("twitter");
var _ = require("underscore");
var ansiconvert = require("./ansiconvert");
var Canvas = require("Canvas");
var Image = Canvas.Image;
var fs = require("fs");
var http = require("http");
var https = require("https");

var con = console;

function initBot() {

	var ansiBotID = "3171474097",
		outputDir = "/export/",
		hits = 0, 
		scale = 1, 
		url = "", 
		protocol = http,
		filename = "";

	var client = new Twitter({
		consumer_key: process.env.TWITTER_CONSUMER_KEY,
		consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
		access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
		access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
	});

	function replyToMention(source) {
		hits ++;
		if (hits > 2) {
			throw new Error("more than 5 hits!");
			return;
		}

		var reply = {
			status: "@" + source.user.screen_name + " I am Graphics Bot " + Math.round(Math.random() * 1e10).toString(16),
			in_reply_to_status_id: source.id_str,
		};

		con.log("replyToMention", reply);


		client.post("statuses/update", reply,  function(error, tweet, response){
			if(error) throw error;
			con.log("replyToMention tweet", tweet.text);
			con.log("=====================================");
			// con.log("response");
			// con.log(response);  // Raw response object. 
			// con.log("=====================================");
			
		});
	}
	function initStream() {

		client.stream("user", {track: "ansibot"}, function(stream) {
			stream.on("data", function(tweet) {
				if (tweet.user) {
					if (tweet.user.id_str === ansiBotID) {
						con.log("Got an echo of myself!", tweet.text)
					} else {

						if (tweet.text) {
							con.log("stream(user) - ok - tweet.text", tweet.text);

							// con.log("=====================================");
							// con.log("stream(user) - ok", tweet);
							// con.log("=====================================");

							if (tweet.entities.user_mentions) {
								var botMentioned = _.findWhere(tweet.entities.user_mentions, {id_str: ansiBotID});
								if (botMentioned) {
									con.log("stream(user) - ok - botMentioned", botMentioned);
									replyToMention(tweet);
								} else {
									con.log("stream(user) - ok not mentioned", botMentioned);
								}
							}

						} else if (tweet.friends) {
							con.log("stream(user) - initial tweet - friends:", tweet.friends.length);
						} else {
							con.log("stream(user) - unknown tweet", tweet);
						}

					}

				}
			});
		 
			stream.on("error", function(error) {
				// throw error;
				con.log(error);
			});
		});
	}



	function postMedia(image) {

		hits ++;
		if (hits > 2) {
			throw new Error("more than 5 hits!");
			return;
		}

		// Make post request on media endpoint. Pass file data as media parameter
		client.post("media/upload", {media: image}, function(error, media, response){

			if (!error) {

				// If successful, a media object will be returned.
				con.log(media);

				// Lets tweet it
				var status = {
					status: "Here is an image I made earlier...",
					media_ids: media.media_id_string // Pass the media id string
				}

				client.post("statuses/update", status, function(error, tweet, response){
					if (!error) {
						con.log(tweet);
					}
				});

			}
		});
	}


	function loadFileFromURL(success) {
		protocol.get(url, function(res) {
			var buffers = [];
			var length = 0;
			res.on("data", function(chunk) {
				// con.log("data", chunk.length);
				// store each block of data
				length += chunk.length;
				buffers.push(chunk);
			});
			res.on("end", function() {
				var loaded = Buffer.concat(buffers);
				success(loaded);
			});
		});
	}

	function imageLoaded(data) {
		var img = new Image();
		img.src = data;
		ansiconvert.convert(img, saveFile);
	}

	function saveFile(content) {
		fs.writeFile(__dirname + outputDir + filename, content, function(err) {
			if(err) {
				con.log(err);
			} else {
				con.log("saveFile complete");	
			}
		});
	}

	function parseTweet(tweet) {
		_.each(tweet.split(" "), function(param,i) {
			switch(param) {
				case "@ansibot" : break;
				case "1x" : scale = 1; break;
				case "2x" : scale = 2; break;
				case "3x" : scale = 3; break;
				case "4x" : scale = 4; break;
				default : 
					if (/(http|https):\/\//.test(param)) {
						url = param;
						if (/https:\/\//.test(param)) { protocol = https; }
					}
			}
		})
		filename = "canvas_" + _.last(url.split("/"));
		con.log("scale", scale, "url", url, "filename", filename);
		loadFileFromURL(imageLoaded);
	}



	var tweet = "@ansibot https://40.media.tumblr.com/0c83e15287453bbc777fb29bcad30822/tumblr_nn9bn13FAt1ro1dyeo1_540.png 1x";
	var tweet = "@ansibot http://i.imgur.com/GB89gsO.jpg 1x";
	var tweet = "@ansibot http://i.imgur.com/A3JWAcJ.jpg 1x";



	parseTweet(tweet);


}

initBot();





// var image = ansiconvert.getImage(); postMedia(image);

// ansiconvert.getCanvas(function(res) { postMedia(res);});

// initStream();











// var params = {screen_name: "nodejs"};
// client.get("statuses/user_timeline", params, function(error, tweets, response){
// 	if (!error) {
// 		con.log("num tweets", tweets.length);
// 	}
// });

// client.stream("statuses/filter", {track: "javascript"}, function(stream) {
//   stream.on("data", function(tweet) {
//     con.log("tweet", tweet.text);
//   });
//   stream.on("error", function(error) {
//     throw error;
//   });
// });

