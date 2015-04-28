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

function initBot() {
	con.log("initialising bot");

	var ansiBotID = "3171474097",
		outputDir = "/export/",
		hits = 0,
		scale = 1,  // not implemented
		client,
		sourceTweet = null; // TODO this... yes, this... ?

	function initClient() {
		if (client) return;
		con.log("initialising client");
		client = new Twitter({
			consumer_key: process.env.TWITTER_CONSUMER_KEY,
			consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
			access_token_key: process.env.TWITTER_ACCESS_TOKEN_KEY,
			access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
		});
		// con.log("client", client)
	}

	function initStream() {
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



		function getFollowers() {
			client.get('followers/ids', function(error, reply) {
				if (error) {
					con.log("get followers error:", error);
				} else {
					var followers = reply.ids, randFollower = randIndex(followers);
					con.log('get followers good', followers)
					// getFriends(randFollower);
				}
			})
		}

		function randIndex(arr) {
			return new Promise(function(fulfill, reject) {
				var item = arr[Math.round(Math.random() * arr.length)];
				fulfill(item);
			});
		}

		function getFriends(user_id) {
			// con.log("getFriends", user_id);
			return new Promise(function(fulfill, reject) {
				var param = user_id ? { user_id: user_id } : {};
				client.get('friends/ids', param, function(error, reply) {
					if (error) {
						con.log("get friend ids", error);
						reject(error);
					} else {
						var friends = reply.ids;
						if (friends.length) {
							con.log("getFriends of", user_id, friends.length);//, friends.join(" / "));
							fulfill(friends);
						} else {
							con.log("rejected no friends...")
							reject();
						}
					}
				})
			})
		}

		function followFriend(user_id) {
			con.log("followFriend", user_id);
			return new Promise(function(fulfill, reject) {
				try {
					client.post('friendships/create', {id: user_id}, function(error, response) {
						if (error) {
							con.log("get friend ids", error);
							reject(error);
						} else {
							// con.log("=====================================");
							// con.log("followFriend fulfill response", response);
							// con.log("=====================================");
							con.log("followFriend fulfill name:", response.name, "location:", response.location, "description:", response.description, "url:", response.url);
							fulfill(response);
						}
					});
				} catch(e) {
					con.log("followFriend error", e);
					reject(e);
				}
			});
		}


		function doIt() {
			now = new Date()
			con.log("time", now.getHours() + ":" + now.getMinutes())
			getFriends().then(randIndex).then(getFriends).then(randIndex).then(followFriend).then(doItAgain);
		}

		function doItAgain() {
			var delayMins = Math.round((3 + Math.random() * 3) * 100) / 100;
			var delay = delayMins * 60 * 1000;
			con.log("doItAgain in minutes", delayMins, delay);
			setTimeout(doIt, delay);
		}

		doItAgain();

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










	function postMedia(image) {
		return new Promise(function(fulfill, reject) {

			con.log("postMedia", image);
			hits ++;
			if (hits > 2) {
				con.log("too many hits!");
				reject(new Error("more than 5 hits!"));
			}

			con.log("trying client.post!");
			try {

				// Make post request on media endpoint. Pass file data as media parameter
				client.post("media/upload", {media: image}, function(error, media, response){
					if (error) {
						con.log("postMedia reject 01", error);
						reject(error);
					} else {
						con.log("postMedia fulfill!");
						fulfill(media);
					}
				});

			} catch (e) {
				con.log("postMedia reject 03", e);
				reject(e);
			}

		});
	}

	function postMediaTweet(media) {
		return new Promise(function(fulfill, reject) {
			// If successful, a media object will be returned.
			con.log("postMediaTweet media success", media);

			// Lets tweet it
			var status = {
				status: "@" + sourceTweet.user.screen_name + " your ansi", // Here is an image I made earlier...",
				media_ids: media.media_id_string,
				in_reply_to_status_id: sourceTweet.id_str
			}

			try {

				client.post("statuses/update", status, function(error, tweet, response){
					if (error) {
						con.log("postMediaTweet reject 02", error);
						reject(error);
					} else {
						con.log("postMediaTweet fulfill");
						fulfill(tweet);
					}
				});

			} catch (e) {
				con.log("postMediaTweet reject 01", e);
				reject(e);
			}

		})
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

			sourceTweet = tweet;

			var tweeter = checkURL(url)
				.then(loadImageURL)

				// .then(saveFile)

				.then(makeImage)
				.then(ansiconvert.render)
				.then(ansiconvert.getBuffer)

				//.then(saveFile).then(makeImage)

				.then(postMedia).then(postMediaTweet);

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

	// initStream();
	initClient();
	initSocial();

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