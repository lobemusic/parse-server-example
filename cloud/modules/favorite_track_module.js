
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

// Lobe Favorite Tracks
//==============================================================================================================

Parse.Cloud.define("addTrackToFavoriteWithOriginUser", function(request, response) {

      var user_id = request.params.user_id
      var origin_user_id = request.params.origin_user_id
      var track_info = request.params.track_info
      var freebase_mids = request.params.freebase_mids

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var lobe_track_update = {}

      Parse.Cloud.run('addTrackToLobeTracks', {

        track_info:track_info,
        freebase_mids:freebase_mids

      }).then(function(lobe_track) {

          lobe_track_update = lobe_track
          return Parse.Cloud.run('addTrackToFavorite', { user_id:user_id, origin_user_id:origin_user_id, track_info:track_info,lobe_track_id:lobe_track.id })

      }).then(function(favorite_track_row) {
          
          if (origin_user_id && origin_user_id != "") {
            return Parse.Cloud.run('updateUserRatingScore', { user_id:origin_user_id, score_type:"favorite"})
          }
          return

      }).then(function(user_rating) {

        return Parse.Cloud.run('addFeedForUser', { feed_target_type:"track_favorite", user_id:user_id, origin_user_id:origin_user_id, feed_target_id:lobe_track_update.id })

      }).then(function(feed_object) {
          
          return Parse.Cloud.run('updateLobeTrackScore', { track_info:track_info, score_type:"favorite"})

      }).then(function(track_score) {
          
          return Parse.Cloud.run('updateUserMusicTastesScore', { user_id:user_id, song_type:"Pop"})

      }).then(function(user_taste_score) {
          
          response.success(lobe_track_update);

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("addTrackToFavorite", function(request, response) {

      var user_id = request.params.user_id
      var origin_user_id = request.params.origin_user_id
      var track_info = request.params.track_info
      var lobe_track_id = request.params.lobe_track_id

      // create users pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
      var query = new Parse.Query(FavouriteTrack);
      query.equalTo('fromUser', fromUserPointer)
      query.equalTo('to_track_id', lobe_track_id)

      query.first().then(function(favorite_track) {

        if(favorite_track){
            
            console.log("Track already in user favorite_track..")
            //favorite_track already existed
            return favorite_track.save()

        }else{

            // create track pointer
            var LobeTrackObject = Parse.Object.extend("LobeTrack")
            var trackPointer = new LobeTrackObject()
            trackPointer.id = lobe_track_id

            console.log("Adding track in user favorite_track..")
            var favouriteTrack = new FavouriteTrack();
            favouriteTrack.set("fromUser", fromUserPointer);
            favouriteTrack.set("from_user_id", user_id);
          
            favouriteTrack.set("toTrack",trackPointer);
            favouriteTrack.set("to_track_id",lobe_track_id);
            favouriteTrack.set("song_name", track_info.song_name);
            favouriteTrack.set("song_artist", track_info.song_artist);

            if (origin_user_id && origin_user_id != "") {
              var originUserPointer = new UserPointer();
              originUserPointer.id = origin_user_id;
              favouriteTrack.set("originUser", originUserPointer);
            } 
            return favouriteTrack.save() 
        }

      }).then(function(favorite_track_row) {

        console.log("Success updating tracks")
        response.success(favorite_track_row)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchUserFavouriteTracks", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start
    // create user pointers
    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
    var query = new Parse.Query(FavouriteTrack);

    query.equalTo("fromUser", fromUserPointer);
    query.include('toTrack');
    query.descending("updatedAt");
    query.skip(range.start)
    query.limit(limit);

    query.find({
        success: function (favouriteTrackArray) {

            var trackArray = [];
            for (var index in favouriteTrackArray){

              var track = favouriteTrackArray[index].get("toTrack")
              if(track === null || typeof track === "undefined" || track === "undefined"){
              }else{
                  trackArray.push(track);
                  console.log("favourite Track name: "+ trackArray[index].get("song_name"))
              }
            }

            //Eliminate duplicates
            var array = trackArray
            var unique = {};
            var distinct = [];
            for( var i in array ){
              if( typeof(unique[array[i].get("song_uid")]) == "undefined"){
                  distinct.push(array[i]);
              }
               unique[array[i].get("song_uid")] = "";
            }

            response.success(distinct);
        },
        error: function (error) {

            console.log(error);
            response.error(error);
        }
    });

});


Parse.Cloud.define("fetchFavoriteTracksByUsers", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var limit = request.params.limit

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

        console.log("fetchFavoriteTracksByUsers arguments length: " + arguments.length);
        // console.log("arguments length: " + arguments);
          var resultsArray = arguments
          var favoriteTrackObject = {}
          var track_id_array = []
          // Iterate throught each query corresponding to each user favorite tracks
          for (var index in resultsArray){
            
              var queryResultArray = resultsArray[index]
              var userFavoriteTracks = []
              console.log("fetchFavoriteTracksByUsers queryResultArray count:" + queryResultArray.length)
              // Get each query, get user recent played tracks
              if (queryResultArray.length > 0 ){

                  for (var index in queryResultArray){
                      var lobeTrack = queryResultArray[index]
                      // console.log("lobeTrack :" + lobeTrack)
                      // console.log("from_user_id :" + lobeTrack.get("from_user_id"))
                      // console.log("song_name :" + lobeTrack.get("song_name"))
                      track_id_array.push(lobeTrack.get("to_track_id"));
                      userFavoriteTracks.push(queryResultArray[index].get("toTrack"));
                  }
                  //Append a key(user) and a value(favorite tracks) to the dictionnary
                  var user_id = queryResultArray[index].get("from_user_id")
                  favoriteTrackObject[user_id] = userFavoriteTracks
              }
          }
          response.success(favoriteTrackObject);
          // callback(true,{
          //     data:favoriteTrackObject,
          //     message:"Success Saving querying favoriteTrack"
          // })

    }, function(error){

        console.log(arguments.length);
        console.log("Error Handler:", error.message);
        response.error(error)
          // callback(false,{
          //     data:null,
          //     message:"Failed Saving querying favoriteTrack"
          // })
    });

});
