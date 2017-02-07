
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

// User lobe Tracks Interactions 
//=================================================================================

Parse.Cloud.define("signIn", function(request, response) {

      var username = request.params.username
      var password = request.params.password

      if (username.indexOf("@") >= 0){ //login with email

        var User = Parse.Object.extend("User");
        var query = new Parse.Query(User);
        query.equalTo('email', username)

        query.first().then(function(user) {

            if(user){
              return Parse.User.logIn(user.get("username"), password)
            }
            return

        }).then(function(user) {

              response.success(user)

        }, function(error) {
              // handle error
              console.log(error);
              response.error(error)
        });

      }else{

        Parse.User.logIn(username, password).then(function(user) {

              response.success(user)

        }, function(error) {
              // handle error
              console.log(error);
              response.error(error)
        });

      }
});

Parse.Cloud.define("signUp", function(request, response) {

      var username = request.params.username
      var first_name = request.params.first_name
      var last_name = request.params.last_name
      var password = request.params.password
      var email = request.params.email

      var user = new Parse.User();
      user.set("username", username);
      user.set("password", password);
      user.set("email", email);
      user.set("first_name", first_name);
      user.set("last_name", last_name);

      user.signUp(null).then(function(result) {

        response.success(result)

      }, function(error) {
          // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("resetPassword", function(request, response) {

      var email = request.params.email

      Parse.User.requestPasswordReset(email).then(function(result) {

        response.success(result)

      }, function(error) {
          // handle error
            console.log(error);
            response.error(error)
      });
});


Parse.Cloud.define("fetchUserProfileInfos", function(request, response) {

      var user_id = request.params.user_id
      var range = request.params.range
      var include = request.params.include

      var UserInfosObject = { user_id:user_id }

      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.equalTo('objectId', user_id)

      query.first().then(function(user) {
          // console.log("fetchUserProfileInfos, username :" + user.get("username"))
          UserInfosObject["user"] = user

          // return Parse.Cloud.run('fetchUserRatingScore', { user_id:user_id })
          return

      }).then(function(user_rating) {
          
        if(user_rating){
          UserInfosObject["user_rating"] = user_rating
        }
        if (include.playlists && (include.playlists == true)){ 
          return Parse.Cloud.run('fetchUserPlaylists', { user_id:user_id,range:range })
        }

      }).then(function(playlist_object) {
          
        if(playlist_object){
          UserInfosObject["playlists"] = playlist_object
        }
        
        if (include.feeds && (include.feeds == true)){ 
          return Parse.Cloud.run('fetchFeedsForUser', { user_id:user_id,range:range })
        }

      }).then(function(user_feeds) {
          
        if(user_feeds){
          UserInfosObject["feeds"] = user_feeds
        }
        
        if (include.follow && (include.follow == true)){ 
          return Parse.Cloud.run('fetchFollowRelationsForUser', { user_id:user_id,range:range , include:{followers:true,following:true} })
        }

      }).then(function(followRelationObject) {
          
          if (followRelationObject){
            UserInfosObject["follow"] =  followRelationObject
          }

          if (include.recent_played_tracks && (include.recent_played_tracks == true)){
              return Parse.Cloud.run('fetchRecentPlayedTracksByUser', { user_id:user_id, range:range })
          }
          
      }).then(function(recentPlayedTracks) {
          
          if (recentPlayedTracks){
            UserInfosObject["recent_played_tracks"] =  recentPlayedTracks
          }
          
          if (include.favorite_tracks && (include.favorite_tracks == true)){
              return Parse.Cloud.run('fetchUserFavouriteTracks', { user_id:user_id, range:range})
          }
          
      }).then(function(favoriteTracks) {

            if (favoriteTracks){
              UserInfosObject["favorite_tracks"] = favoriteTracks
            }

            if (include.lobe_snaps && (include.lobe_snaps == true)){
              return Parse.Cloud.run('fetchTrackSuggestionInfoForUser', { user_id:user_id, range:range})
            }
          
      }).then(function(trackSuggestionsObject) {

            if (trackSuggestionsObject){
              UserInfosObject["lobe_snaps"] = trackSuggestionsObject
            }

            if (include.shared_tracks && (include.shared_tracks == true)){
              return Parse.Cloud.run('fetchUserMostSharedTracks', { user_id:user_id, range:range})
            }
          
      }).then(function(sharedTracks) {

            if (sharedTracks){
              UserInfosObject["shared_tracks"] = sharedTracks
            }
            
            response.success(UserInfosObject)

      }, function(error) {
            // handle error
            console.log("fetchUserProfileInfos");
            response.error(error)
      });
});

Parse.Cloud.define("updateUserRatingScore", function(request, response) {

      var user_id = request.params.user_id
      var score_type = request.params.score_type
      var score = 0

      switch(score_type) {

        case "like":
          score += 3
            break;
        case "favorite":
          score += 7
          break;
        case "profile_view":
          score += 1
            break;
        case "no_point":
          score = 0
            break;
        default:
             break;

      }

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var UserRating = Parse.Object.extend("UserRating");
      var query = new Parse.Query(UserRating);

      query.equalTo('fromUser', fromUserPointer)
      query.equalTo('from_user_id', user_id)

      query.first().then(function(user_rating) {

        if(user_rating){

            console.log("User has already a rating..updating ")
            var current_score = user_rating.get("total_score")
            current_score += score
            user_rating.set("total_score", current_score);
            return user_rating.save()

         }else{
            console.log("Creating a new rating row for user")
            var userRating = new UserRating();
            userRating.set("fromUser", fromUserPointer);
            userRating.set("from_user_id", user_id);
            userRating.set("total_score", score);
            return userRating.save()
         }

      }).then(function(user_rating) {

        response.success(user_rating)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("updateUserMusicTastesScore", function(request, response) {

      var user_id = request.params.user_id
      var song_type = request.params.song_type

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var UserTastesScore = Parse.Object.extend("UserTastesScore");
      var query = new Parse.Query(UserTastesScore);

      query.equalTo('fromUser', UserPointer)
      query.equalTo('from_user_id', user_id)
      query.equalTo('song_type', song_type)

      query.first().then(function(user_taste_score) {

          if(user_taste_score){

            var current_score = user_taste_score.get("type_score")
            current_score += 1
            user_taste_score.set("type_score", current_score);
            return user_taste_score.save()

         }else{

            var userTastesScore = new UserTastesScore();
            userTastesScore.set('fromUser', fromUserPointer)
            userTastesScore.set('from_user_id', user_id)
            userTastesScore.set("type_score", 1);
            userTastesScore.set("to_type_name", song_type);

            return userTastesScore.save()
         }

      }).then(function(user_taste_score) {

          response.success(user_taste_score)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});

Parse.Cloud.define("fetchUserRatingScore", function(request, response) {

      var user_id = request.params.user_id

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var UserRating = Parse.Object.extend("UserRating");
      var query = new Parse.Query(UserRating);
      query.equalTo('fromUser', fromUserPointer)
      query.equalTo('from_user_id', user_id)

      query.first().then(function(user_rating) {

        response.success(user_rating)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});



Parse.Cloud.define("fetchUsersTastesScore", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var limit = request.params.limit

        Parse.Promise.as().then(function(){

        var promises = [];
        for (var index in user_ids){

            var user_id = user_ids[index]
            var UserTastesScore = Parse.Object.extend("UserTastesScore");
            var query = new Parse.Query(UserTastesScore);

            // create user pointers
            // var UserPointer = Parse.Object.extend("User");
            // var fromUserPointer = new UserPointer();
            // fromUserPointer.id = user_id;
            // query.equalTo("fromUser", fromUserPointer);

            query.equalTo("from_user_id", user_id);
            query.include('fromUser.objectId');
            query.include('toType.name');
            // query.include('toTrack.objectId');
            // query.include('toTrack.track_info');
            query.notContainedIn("to_type_id", black_list);
            // query.greaterThanOrEqualTo( "updatedAt", moment().subtract('days', limit).toDate()) 
            query.descending("fromUser.objectId");
            query.descending("updatedAt");
            query.limit(limit);

            // querie_array.push(query);
            promises.push(query.find());
        }

        return Parse.Promise.when(promises);

    }).then(function(results){

        console.log("fetchUsersTastesScore arguments length: " + arguments.length);
        // console.log("fetchUsersTastesScore arguments list: " + arguments);
          var resultsArray = arguments
          var userTastesObject = {}
          var track_id_array = []
          // Iterate throught each query corresponding to each user favorite tracks
          for (var index in resultsArray){
            
              var queryResultArray = resultsArray[index]
              var userTastesScores = {}
              console.log("queryResultArray count:" + queryResultArray.length)
              // Get each query, get user recent played tracks
              if (queryResultArray.length > 0 ){

                  for (var index in queryResultArray){
                      var lobeTrack = queryResultArray[index]
                      // console.log("lobeTrack :" + lobeTrack)
                      // console.log("from_user_id :" + lobeTrack.get("from_user_id"))
                      // console.log("song_name :" + lobeTrack.get("song_name"))
                      // track_id_array.push(lobeTrack.get("to_track_id"));
                      var song_type = queryResultArray[index].get("to_type_name")
                      var song_type_score = queryResultArray[index].get("type_score")
                      userTastesScores[song_type] = song_type_score
                  }
                  //Append a key(user) and a value(favorite tracks) to the dictionnary
                  var user_id = queryResultArray[index].get("from_user_id")
                  userTastesObject[user_id] = userTastesScores
              }
          }
          response.success(userTastesObject);
          // callback(true,{
          //     data:userTastesObject,
          //     message:"Success Saving querying userTastesScores"
          // })

    }, function(error){

        console.log(arguments.length);
        console.log("Error Handler:", error);
        response.error(error);
          // callback(false,{
          //     data:null,
          //     message:"Failed Saving querying userTastesScores"
          // })
    });

});

Parse.Cloud.define("fetchUsersRatingScore", function(request, response) {

    var user_ids = request.params.user_ids
    var black_list = request.params.black_list
    var limit = request.params.limit

        Parse.Promise.as().then(function(){

        var promises = [];
        for (var index in user_ids){

            var user_id = user_ids[index]
            // create user pointers
            var UserPointer = Parse.Object.extend("User");
            var fromUserPointer = new UserPointer();
            fromUserPointer.id = user_id;

            var UserRating = Parse.Object.extend("UserRating");
            var query = new Parse.Query(UserRating);
            query.equalTo("fromUser", fromUserPointer);
            query.include("fromUser");
            // querie_array.push(query);
            promises.push(query.first());
        }

        return Parse.Promise.when(promises);

    }).then(function(results){

          console.log("fetchUsersRatingScore arguments length: " + arguments.length);
          // console.log("fetchUsersTastesScore arguments list: " + arguments);
          var resultsArray = arguments
          var usersRatingObject = {}
          // Iterate throught each query corresponding to each user favorite tracks
          for (var index in resultsArray){
              
              var user_rating = resultsArray[index]

              if(user_rating){
                  console.log("user has a rating")
                  var rating_score = user_rating.get("total_score")
                  var user_id = user_rating.get("fromUser").id
                  console.log("from_user_id :" + user_id + "has score: " + rating_score)
                  usersRatingObject[user_id] = rating_score
              }
          }

          response.success(usersRatingObject);

    }, function(error){

        console.log(arguments.length);
        console.log("Error Handler:", error);
        response.error(error);
    });
});

// Parse.Cloud.beforeSave("LobeTrack", function(request, response) {

//     if (!request.object.get("song_uid")) {
//       response.error('A Lobe track must have a song_uid.');
//     } else {

//       var newEntryTrack = request.object;
//       var query = new Parse.Query("LobeTrack");
//       query.equalTo("song_uid", newEntryTrack.get("song_uid"));
//       query.first({
//         success: function(object) {
//           if (object) {
//             response.error("A LobeTrack with this song_uid already exists.");
//           } else {
//             response.success();
//           }
//         },
//         error: function(error) {
//           response.error("Could not validate uniqueness for this LobeTrack object.");
//         }
//       });
//     }
// });
