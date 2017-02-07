
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

// Channel push notif
Parse.Cloud.define("groupInactionNotification", function(request, response) {

    var messageText = "Your group has been inactive for a while. Please do something otherwise, We will have to close the group"
    var pushQuery = new Parse.Query(Parse.Installation);
    pushQuery.containedIn('deviceType', ['ios','android']);

    //Target a specific group. To do this, we need to subscribe a group to push notification
    // var groupQuery = new Parse.Query("ActiveGroups");
    // groupQuery.equalTo('objectId ', request.params.group_id)
    // pushQuery.matchesQuery('groups', groupQuery);

    //Send the push notif to the group host
    pushQuery.equalTo('user_id', request.params.host_id)

    Parse.Push.send({
      where: pushQuery,
      data: {
        type: "group_deletion_notif",
        alert: "Message: " + messageText
      }
    }).then(function() {
      // Push was successful
      response.success("successfully notified inactive groups");
          //Set Notify for delete to true
          updateGroupNotifyStatus(request, response);
          //Destroy group inactive for more than 20 minutes
          // killInactiveLobeGroups(request, response);
          Parse.Cloud.run('killInactiveGroups',{}).then(function(result) {
            console.log("Parse Result:" + result);
          }, function(error) {
              // handle error
          });
      
    }, function(error) {
      response.error("Uh oh, something went wrong.");
      // throw "Got an error " + error.code + " : " + error.message;
    });

});