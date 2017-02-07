
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

//Recent Played tracks
//========================================================================

Parse.Cloud.define("fetchRecentPlayedTracksByLocation", function(request, response) {

      var location = request.params.location
      var range = request.params.range
      var limit = range.end - range.start

      // Set Up Query to Find Specific Posts
      var UserObject = Parse.Object.extend("_User");
      var userLocationQuery = new Parse.Query(UserObject);
      if(location.city){
        userLocationQuery.equalTo('city', location.city);
      }

      var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
      var query = new Parse.Query(RecentPlayedTrack);

      query.include('toTrack');
      query.descending("updatedAt");
      if(range.end != -1){
         query.limit(limit);
      }

      // query.matchesQuery('User', userLocationQuery);
      if(location.city){
        query.matchesKeyInQuery("fromUser", "objectId", userLocationQuery);
      }else{
        query.limit(0);
      }
      
      query.find({
          success: function (recentTrackArray) {
              var trackArray = [];
              for (var index in recentTrackArray){
                  trackArray.push(recentTrackArray[index].get("toTrack"));
                  console.log("favourite Track name: "+ trackArray[index].get("song_name"))
              }
              response.success(trackArray);
          },
          error: function (error) {
            response.error(error);
          }
      });
});

Parse.Cloud.define("fetchRecentPlayedTracksByType", function(request, response) {

      var type = request.params.type
      var range = request.params.range
      var limit = range.end - range.start

      // Set Up Query to Find Specific Posts
      var trackObject = Parse.Object.extend("LobeTrack");
      var trackTypeQuery = new Parse.Query(trackObject);
      trackTypeQuery.equalTo('type', type);

      var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
      var query = new Parse.Query(RecentPlayedTrack);

      query.include('toTrack');
      query.descending("updatedAt");
      if(range.end != -1){
         query.limit(limit);
      }
      

      // query.matchesQuery('User', userLocationQuery);
      query.matchesKeyInQuery("toTrack", "objectId", trackTypeQuery);
      query.find({
          success: function (recentTrackArray) {
              var trackArray = [];
              for (var index in recentTrackArray){
                  trackArray.push(recentTrackArray[index].get("toTrack"));
                  console.log("favourite Track name: "+ trackArray[index].get("song_name"))
              }
              response.success(trackArray);
          },
          error: function (error) {
            response.error(error);
          }
      });
});


Parse.Cloud.define("fetchRecentPlayedTracksByUser", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start

    // create user pointers
    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
    var query = new Parse.Query(RecentPlayedTrack);

    query.equalTo("fromUser", fromUserPointer);
    query.include('toTrack');
    query.descending("updatedAt");
    query.skip(range.start)
    query.limit(limit);

    query.find({
        success: function (recentTrackArray) {
            var trackArray = [];
            for (var index in recentTrackArray){
                trackArray.push(recentTrackArray[index].get("toTrack"));
                // console.log("favourite Track name: "+ trackArray[index].get("song_name"))
            }
            response.success(trackArray)
        },
        error: function (error) {

            console.log(error);
            response.error(error)
        }
    });
});

// Lobe Recent Played Tracks
//=======================================================================================================

Parse.Cloud.define("addTrackToRecentPlayedCollection", function(request, response) {

      var user_id = request.params.user_id
      var track_info = request.params.track_info

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var lobe_track_updated = {}

      Parse.Cloud.run('addTrackToLobeTracks', { track_info:track_info }).then(function(lobe_track) {

          lobe_track_updated = lobe_track
          return Parse.Cloud.run('addTrackToRecentPlayed', { user_id:user_id, lobe_track_id:lobe_track.id, track_info:track_info })

      }).then(function(recent_played_track_row) {
          
          response.success(lobe_track_updated);

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("addTrackToRecentPlayed", function(request, response) {

      var user_id = request.params.user_id
      var lobe_track_id = request.params.lobe_track_id
      var track_info = request.params.track_info

      // create users pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      // create track pointer
      var LobeTrackObject = Parse.Object.extend("LobeTrack")
      var trackPointer = new LobeTrackObject()
      trackPointer.id = lobe_track_id

      var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
      var query = new Parse.Query(RecentPlayedTrack);
      query.equalTo('fromUser', fromUserPointer)
      query.equalTo('to_track_id', lobe_track_id)

      query.first().then(function(recent_played_track) {

        if(recent_played_track){
            
            console.log("Track already in user recent_played_track..")
            return recent_played_track.save()

        }else{

            console.log("Adding track in user recent_played_track..")
            var recentPlayedTrack = new RecentPlayedTrack();
            recentPlayedTrack.set("fromUser", fromUserPointer);
            recentPlayedTrack.set("from_user_id", user_id);
          
            recentPlayedTrack.set("toTrack",trackPointer);
            recentPlayedTrack.set("to_track_id",lobe_track_id);
            recentPlayedTrack.set("song_name", track_info.song_name);
            recentPlayedTrack.set("song_artist", track_info.song_artist);
            return recentPlayedTrack.save()
        }

      }).then(function(recent_played_track_row) {

        console.log("Success updating tracks")
        response.success(recent_played_track_row)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});