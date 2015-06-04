var Promise = require('promise');
var Twitter = require("twitter");

var con = console;

module.exports = (function() {

  var client;
  var hits = 0; // local testing limit.

  function initClient(authsettings) {
    if (client) return client;
    con.log("initialising client");
    client = new Twitter(authsettings);
    // con.log("client", client)
    return client;
  }


  function getFollowers() {
    client.get('followers/ids', function(error, reply) {
      if (error) {
        con.log("get followers error:", error);
      } else {
        var followers = reply.ids; //, randFollower = randIndex(followers);
        con.log('get followers good', followers)
        // getFriends(randFollower);
      }
    })
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
            reject([]);
          }
        }
      })
    })
  }

  function followFriend(user_id) {
    con.log("followFriend attempt", user_id);
    return new Promise(function(fulfill, reject) {
      if (user_id) {
        try {
          client.post('friendships/create', {id: user_id}, function(error, response) {
            if (error) {
              con.log("followFriend error 01", error);
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
          con.log("followFriend error 02", e);
          reject(e);
        }
      } else {
        con.log("followFriend no friend to follow!");
        fulfill(null);
      }
    });
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

  function postTweet(status) {
    return new Promise(function(fulfill, reject) {
      con.log("postTweet media success", status);
      try {
        client.post("statuses/update", status, function(error, tweet, response){
          if (error) {
            con.log("postTweet reject 02", error);
            reject(error);
          } else {
            con.log("postTweet fulfill");
            fulfill(tweet);
          }
        });
      } catch (e) {
        con.log("postTweet reject 01", e);
        reject(e);
      }
    })
  }



  return {
    // randIndex: randIndex,
    followFriend: followFriend,
    getFollowers: getFollowers,
    getFriends: getFriends,
    initClient: initClient,
    postMedia: postMedia,
    postTweet: postTweet,
  }
})();
