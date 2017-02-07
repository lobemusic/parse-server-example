
// var moment = require("moment");
// var backgroundJobModule = require('cloud/modules/background_job_module.js');
// var favoriteTrackModule = require('cloud/modules/favorite_track_module.js');
// var recentTrackModule = require('cloud/modules/recent_track_module.js');
// var pushModule = require('cloud/modules/push_module.js');
// var followModule = require('cloud/modules/follow_module.js');
// var activityModule = require('cloud/modules/activity_module.js');
// var groupModule = require('cloud/modules/group_module.js');
// var userModule = require('cloud/modules/user_module.js');
// var suggestionAlgoModule = require('cloud/modules/suggestion_algo_module.js');
// var lobeTrackModule = require('cloud/modules/lobe_track_module.js');

//Regular Push Notif
Parse.Cloud.define("sendPushNotification", function(request, response) {
    // var messageText = "Basa has sent you a push"//request.object.get('text');
 // var messageText = request.params.userName + ": " + request.params.message;

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.containedIn('deviceType', ['ios','android']);

  Parse.Push.send({
    where: pushQuery, // Set our Installation query
    data: {
        alert: request.params.message
        // type: request.params.type
    }
  }).then(function() {
    // Push was successful
  }, function(error) {
    throw "Got an error " + error.code + " : " + error.message;
  });
});

//Group Invite push notif
Parse.Cloud.define("sendGroupInvitePushNotification", function(request, response) {

  var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.containedIn('deviceType', ['ios','android']);

  // var userQuery = new Parse.Query(Parse.User);
  // userQuery.equalTo('objectId ', request.params.to_user_id)
  // pushQuery.matchesQuery('user', userQuery);

  pushQuery.equalTo('user_id', request.params.to_user_id)

  Parse.Push.send({
    where: pushQuery, // Set our Installation query
    data: {
        alert: request.params.message,
        message: request.params.message,
        type: request.params.type,
        from_user_id: request.params.from_user_id,
        to_user_id: request.params.to_user_id,
        group_node: request.params.group_node,
        group_parse_id: request.params.group_parse_id
    }
  }).then(function() {
    // Push was successful
    response.success("sendGroupInvitePushNotification was a success");
  }, function(error) {
    // throw "Got an error " + error.code + " : " + error.message;
    response.error("sendGroupInvitePushNotification was a success");
  });
});

//
Parse.Cloud.define("sendTrackSuggestionPushNotification", function(request, response) {

  var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.containedIn('deviceType', ['ios','android']);

  // var userQuery = new Parse.Query(Parse.User);
  // userQuery.equalTo('objectId ', request.params.to_user_id)
  // pushQuery.matchesQuery('user', userQuery);

  pushQuery.containedIn('user_id', request.params.to_user_ids_array)

  Parse.Push.send({
    where: pushQuery, // Set our Installation query
    data: {
        alert: request.params.message,
        message: request.params.message,
        type: request.params.type,
        from_user_id: request.params.from_user_id,
        to_user_id: request.params.to_user_id,
        group_node: request.params.group_node,
        group_parse_id: request.params.group_parse_id
    }
  }).then(function() {
    // Push was successful
    response.success("sendGroupInvitePushNotification was a success");
  }, function(error) {
    // throw "Got an error " + error.code + " : " + error.message;
    response.error(error);
  });
});

// Channel push notif
Parse.Cloud.define("sendPushNotificationToChannel", function(request, response) {
    var messageText = "Basa has sent you a push"//request.object.get('text');
    // var messageText = request.object.get('text');
    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.equalTo('deviceType', 'ios');
    pushQuery.equalTo('deviceType', 'android') 

    Parse.Push.send({
      channels: [ "Giants", "Mets" ],
      data: {
        alert: "The Giants won against the Mets 2-3."
      }
    }, {
      success: function() {
        // Push was successful
      },
      error: function(error) {
        // Handle error
      }
    });
});


Parse.Cloud.define("sendNewFacebookFriendPushNotif", function(request, response) {
    // var messageText = "Basa has sent you a push"//request.object.get('text');
 // var messageText = request.params.userName + ": " + request.params.message;
 var friend_name = request.params.userName
 var message = friend_name + "is now Connected on Lobe."

  var pushQuery = new Parse.Query(Parse.Installation);
  pushQuery.containedIn('deviceType', ['ios','android']);

  Parse.Push.send({
    where: pushQuery, // Set our Installation query
    data: {
        alert: message
        // type: request.params.type
    }
  }).then(function() {
    // Push was successful
  }, function(error) {
    throw "Got an error " + error.code + " : " + error.message;
  });
});