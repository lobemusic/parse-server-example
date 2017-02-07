
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

Parse.Cloud.define("combineLobeTracksStats", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var group_id = request.params.group_id
    var include_all_lobe_tracks = request.params.include_all_lobe_tracks
    var limit = request.params.limit
    var combineJsonObject = {}

    Parse.Cloud.run('fetchStatsFavoriteTracksByUsers', { user_ids:user_ids, 
      black_list:black_list, 
      limit:limit

    }).then(function(favoriteTrackObject) {
        
        combineJsonObject["favoriteTrack"] = favoriteTrackObject
        return Parse.Cloud.run('fetchStatsRecentPlayedTracksByUsers', { user_ids:user_ids, black_list:black_list, limit:limit })

    }).then(function(recentPlayedTrackObject) {
        
        combineJsonObject["recentPlayedTrack"] = recentPlayedTrackObject

        if(include_all_lobe_tracks){
          return Parse.Cloud.run('fetchAllLobeTracks', {})
        }
        return

    }).then(function(lobe_track_array) {
        
        if(lobe_track_array){
          combineJsonObject["lobeTrackArray"] = lobe_track_array
        }
        
        if(group_id){
          return Parse.Cloud.run('fetchGroupTracks', { group_id:group_id,range:{start:0, end:limit} })
        }else{
          return
        }
        
    }).then(function(active_group_track_array) {
        
        if(active_group_track_array){
          combineJsonObject["activeGroupTrackArray"] = active_group_track_array
        }
        return Parse.Cloud.run('fetchUsersTastesScore', { user_ids:user_ids, black_list:black_list, limit:limit })

    }).then(function(tastesObject) {
        
        combineJsonObject["tastesObject"] = tastesObject
        return Parse.Cloud.run('fetchUsersRatingScore', { user_ids:user_ids, black_list:black_list, limit:limit })

    }).then(function(ratingObject) {
        
        combineJsonObject["ratingObject"] = ratingObject
        response.success(combineJsonObject);

    }, function(error) {
          // handle error
          console.log(error);
          response.error()
    });
});

Parse.Cloud.define("fetchStatsRecentPlayedTracksByUsers", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var limit = request.params.limit

    //Create the queries
    var querie_array = []
    var promises = [];

    for (var index in user_ids){

        var user_id = user_ids[index]
        var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
        var query = new Parse.Query(RecentPlayedTrack);

        // create user pointers
        // var UserPointer = Parse.Object.extend("User");
        // var fromUserPointer = new UserPointer();
        // fromUserPointer.id = user_id;
        // query.equalTo("fromUser", fromUserPointer);

        query.equalTo("from_user_id", user_id);
        query.include('fromUser.objectId');
        query.include('toTrack');

        query.notContainedIn("to_track_id", black_list);
        // query.greaterThanOrEqualTo( "updatedAt", moment().subtract('days', limit).toDate()) 
        query.descending("fromUser.objectId");
        query.descending("updatedAt");
        query.limit(limit);

        querie_array.push(query);
        promises.push(query.find());
    }

    Parse.Promise.when(promises).then(function (results) {

        // results of firstQuery are in arguments[0]
        // results of secondQuery are in arguments[1]; ...

        console.log("fetchStatsRecentPlayedTracksByUsers arguments length: " + arguments.length);
        console.log(" fetchStatsRecentPlayedTracksByUsersarguments length: " + arguments);
        var resultsArray = arguments

        console.log("recentPlayedTrackArray count:" + resultsArray.length)
        var recentPlayedTrackObject = {}
        // Iterate throught each query corresponding to each user recent played tracks
        for (var index in resultsArray){

            var queryResultArray = resultsArray[index]
            var userRecentPlayedTracks = []
            console.log("queryResultArray count:" + queryResultArray.length)
            // Get each query, get user recent played tracks
            if (queryResultArray.length > 0 ){

              for (var index in queryResultArray){

                  var lobeTrack = queryResultArray[index]
                  userRecentPlayedTracks.push(queryResultArray[index].get("toTrack"));
              }
              //Append a key(user) and a value(recent played tracks) to the dictionnary
              var user_id = queryResultArray[index].get("from_user_id")
              recentPlayedTrackObject[user_id] = userRecentPlayedTracks
            }
        }
        //create the dictionnary
        // recentPlayedTrackDict = {
        //   recentPlayedTrack:recentPlayedTrackObject
        // }
        response.success(recentPlayedTrackObject);

    },function (error) {

        console.log(error);
        response.error(error);
    });

});

Parse.Cloud.define("fetchStatsFavoriteTracksByUsers", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var limit = request.params.limit
    var totalLimit = limit*user_ids.length

    Parse.Promise.as().then(function(){

        var promises = [];
        for (var index in user_ids){

            var user_id = user_ids[index]
            var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
            var query = new Parse.Query(FavouriteTrack);

            query.equalTo("from_user_id", user_id);
            query.include('fromUser.objectId');
            query.include('toTrack');
            // query.include('toTrack.objectId');
            // query.include('toTrack.track_info');
            query.notContainedIn("to_track_id", black_list);
            // query.greaterThanOrEqualTo( "updatedAt", moment().subtract('days', limit).toDate()) 
            query.descending("fromUser.objectId");
            query.descending("updatedAt");
            query.limit(limit);

            // querie_array.push(query);
            promises.push(query.find());
        }

        return Parse.Promise.when(promises);

    }).then(function(results){

        console.log("arguments length: " + arguments.length);
        console.log("arguments length: " + arguments);
          var resultsArray = arguments
          var favoriteTrackObject = {}
          // Iterate throught each query corresponding to each user favorite tracks
          for (var index in resultsArray){
            
              var queryResultArray = resultsArray[index]
              var userFavoriteTracks = []
              console.log("queryResultArray count:" + queryResultArray.length)
              // Get each query, get user recent played tracks
              if (queryResultArray.length > 0 ){

                  for (var index in queryResultArray){
                      var lobeTrack = queryResultArray[index]
                      userFavoriteTracks.push(queryResultArray[index].get("toTrack"));
                  }
                  //Append a key(user) and a value(favorite tracks) to the dictionnary
                  var user_id = queryResultArray[index].get("from_user_id")
                  favoriteTrackObject[user_id] = userFavoriteTracks
              }
          }

          response.success(favoriteTrackObject);

    }, function(error){

        console.log(arguments.length);
        console.log("Error Handler:", error);
        response.error(error)
    });
});