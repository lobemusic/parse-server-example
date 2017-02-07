
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

//Update the user activity to mark him online
Parse.Cloud.define("registerActivity", function(request, response) {

      var user_id = request.params.user_id
      console.log("helloregisterActivity")
      var UserObject = Parse.Object.extend("User")
      var query = new Parse.Query(UserObject);
      query.get(user_id,{ useMasterKey: true }).then(function(user) {
          console.log("here")
          user.set("lastActive", new Date());
          return user.save(null, {useMasterKey:true})
          // return Parse.Object.saveAll([user], { useMasterKey: true })

      }).then(function(user) {
          console.log("there")
          // response.success(user)
          response.success(user_id + "Success");

      }, function(error) {  
            // handle error
            console.log(error);
            response.error()
      });

});

// Update group activity
Parse.Cloud.define("updateGroupActivity", function(request, response) {

    var activeGroup = Parse.Object.extend("ActiveGroups");
    var groupQuery = new Parse.Query(activeGroup);

    groupQuery.get(request.params.group_id, {
        success: function(group) {
          group.set("lastActive", new Date());
          group.save().then(function (group) {
              response.success();
          }, function (error) {
              console.error(error);
              response.error(error);
          });
        },
        error: function(object, error) {
            console.error("fetch inactive group failed with error: " + error.message);
        }
    });
});