var _ = require("underscore");
var Canvas = require("canvas");
var Image = Canvas.Image;
var fs = require("fs");
var http = require("http");
var https = require("https");
var Promise = require('promise');
var request = require("request");

var ansiconvert = require("./ansiconvert");
var socialbot = require("./TwitterSocialBot/socialbot");

var con = console;

function initBot() {
	con.log("initialising bot");

	var ansiBotID = "3171474097",
		outputDir = "/export/",
		scale = 1,  // not implemented
		client;

	function initClient() {
		if (client) return;
		con.log("initialising client");
		client = socialbot.initClient({
			consumer_key: process.env.ANSIBOT_CK,
			consumer_secret: process.env.ANSIBOT_CS,
			access_token_key: process.env.ANSIBOT_ATK,
			access_token_secret: process.env.ANSIBOT_ATS,
		});
		// con.log("client", client)
	}

	function initStream() {
		return con.log("AnsiBot is disabled!");
		initClient();
		con.log("initialising twitter stream");

		client.stream("user", {track: "ansibot"}, function(stream) {
			stream.on("data", function(tweet) {
				if (tweet.user) {
					if (tweet.user.id_str === ansiBotID) {
						// con.log("Got an echo of myself!", tweet.text)
					} else {

						if (tweet.text) {
							// con.log("stream(user) - ok - tweet.text", tweet.text);

							// con.log("=====================================");
							// con.log("stream(user) - ok", tweet);
							// con.log("=====================================");

							if (tweet.entities.user_mentions) {
								var botMentioned = _.findWhere(tweet.entities.user_mentions, {id_str: ansiBotID});
								if (botMentioned) {
									con.log("stream(user) - ok - botMentioned", botMentioned);
									parseTweet(tweet);
								} else {
									// con.log("stream(user) - ok not mentioned", botMentioned);
								}
							}

						} else if (tweet.friends) {
							// con.log("stream(user) - initial tweet - friends:", tweet.friends.length);
						} else {
							// con.log("stream(user) - unknown tweet", tweet);
						}

					}

				}
			});

			stream.on("error", function(error) {
				// throw error;
				con.log(error);
			});
		});

		con.log("Bot running...");
	}



	function initSocial() {

		function doIt() {
			now = new Date()
			con.log("time", now.getHours() + ":" + now.getMinutes())
			socialbot.getFriends().then(randIndex).then(socialbot.getFriends)
				.then(randIndex).then(socialbot.followFriend).then(doItAgain).catch(function(err) {
					con.log("doIt error", err);
				});
		}

		function doItAgain() {
			var delayMins = Math.round((3 + Math.random() * 3) * 100) / 100;
			var delay = delayMins * 60 * 1000;
			con.log("doItAgain in minutes", delayMins, delay);
			setTimeout(doIt, delay);
		}


		function randIndex(arr) {
			return new Promise(function(fulfill, reject) {
				try {
					var item = arr[Math.round(Math.random() * arr.length)];
					fulfill(item);
				}catch (e) {
					con.log("randIndex error", e);
					reject(e);
				}
			});
		}

		// doItAgain();
		doIt();

		function checkRateLimit() {
			client.get('application/rate_limit_status', {}, function(error, response) {
				if (error) {
					con.log("rate limit error", error);
				} else {
					con.log("rate limit response", response)
				}
			})
		}


		// getFriends(253345739).then(randIndex);

	}









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

	function saveFile(content) {
		con.log("saveFile", content.length);
		return new Promise(function(fulfill, reject) {
			var filename = "canvas_" + Math.round(Math.random() * 1e10).toString(16);
			var location = _dirname + outputDir + filename;
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
		});
	}

	function checkURL(url){
		return new Promise(function (fulfill, reject){
			request({
				method: "HEAD",
				url: url,
				followAllRedirects: true
			},
			function (error, response, body) {
				if (error) {
					con.log("checkURL reject", response);
					reject(response);
				} else {
					fulfill(response.request.uri.href);
				}
			});
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

	function parseTweet(tweet) {
		var text = tweet.text;


		function composeMessage(media) {
			return new Promise(function(fulfill, reject) {
				var status = null;
				try {
					status = {
						status: "@" + tweet.user.screen_name + " your ansi", // Here is an image I made earlier...",
						media_ids: media.media_id_string,
						in_reply_to_status_id: tweet.id_str
					}
				} catch(err) {
					con.log("composeMessage reject 01");
					reject(err);
				}
				if (status) {
					con.log("composeMessage fulfill", status);
					fulfill(status);
				} else {
					con.log("composeMessage reject 02");
					reject();
				}
			});
		}


		var url = null;
		_.each(text.split(" "), function(param,i) {
			switch(param) {
				case "@ansibot" : break;
				case "1x" : scale = 1; break;
				case "2x" : scale = 2; break;
				case "3x" : scale = 3; break;
				case "4x" : scale = 4; break;
				default :
					con.log("could be the file name:", param);
					if (/(http|https):\/\//.test(param)) url = param;
			}
		})

		if (url) {

			var tweeter = checkURL(url)
				.then(loadImageURL)

				// .then(saveFile)

				.then(makeImage)
				.then(ansiconvert.render)
				.then(ansiconvert.getBuffer)

				//.then(saveFile).then(makeImage)

				.then(socialbot.postMedia)
				.then(composeMessage)
				.then(socialbot.postTweet)

				.catch(function(err) {
					con.log("tweetback error", err);
				});

		} else {
			con.log("parseTweet no URL found?", text);
		}
	}

	// parseTweet({text: "@ansibot https://40.media.tumblr.com/0c83e15287453bbc777fb29bcad30822/tumblr_nn9bn13FAt1ro1dyeo1_540.png 1x"});
	// parseTweet({text: "@ansibot http://i.imgur.com/GB89gsO.jpg 1x"});
	// parseTweet({text: "@ansibot http://i.imgur.com/A3JWAcJ.jpg 1x"});
	// parseTweet({text: "@ansibot http://i.imgur.com/NVjJHSNh.jpg 1x"});
	// parseTweet({text: "@ansibot http://p1.pichost.me/640/48/1712789.jpg 1x"});
	// parseTweet({text: "@ansibot http://dreamatico.com/data_images/graffiti/graffiti-1.jpg 1x"});
	// parseTweet({text: "@ansibot http://upload.wikimedia.org/wikipedia/commons/4/46/WP_SOPA_asset_Radial_Gradient.jpg 1x"});
	// parseTweet({text: "@ansibot http://th06.deviantart.net/fs71/PRE/f/2012/278/2/a/rainbow_gradient_by_guildmasterinfinite-d5gv3im.png 1x"});
	// parseTweet({text: "@ansibot http://www.milesjcarter.co.uk/blog/wp-content/uploads/2010/11/gradient21.jpg 1x"});
	// parseTweet({text: "@ansibot gradients.png 1x"});
	// parseTweet({text: "@ansibot savoury.jpg 1x"});
	// parseTweet({text: "@ansibot http://t.co/GiYc8PUmLF 1x"});

	initStream();
	// initClient();
	// initSocial();

}

initBot();

/*
// other node methods

function readFile(filename, enc){
	return new Promise(function (fulfill, reject){
		fs.readFile(filename, enc, function (err, res){
			con.log("readFile done...");
			if (err) reject(err);
			else fulfill(res);
		});
	});
}

// other twitter options...

var params = {screen_name: "nodejs"};
client.get("statuses/user_timeline", params, function(error, tweets, response){
	if (!error) {
		con.log("num tweets", tweets.length);
	}
});

client.stream("statuses/filter", {track: "javascript"}, function(stream) {
	stream.on("data", function(tweet) {
		con.log("tweet", tweet.text);
	});
	stream.on("error", function(error) {
		throw error;
	});
});

*/