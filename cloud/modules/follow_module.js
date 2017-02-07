
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


Parse.Cloud.define("addMutualFollowRelationToFbFriends", function(request, response) {

      console.log("addMutualFollowRelationToFbFriends called")
      var fromUser_id = request.params.user_id
      var facebook_id_array = request.params.facebook_friend_id_array
      console.log("facebook_id_array count: " + facebook_id_array.length)
        // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var userPointer = new UserPointer();
      userPointer.id = fromUser_id;

      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.containedIn("id_secondary_fb", facebook_id_array)

      query.find().then(function(friends_user_array) {

          console.log("facebook friends_user_array count: " + friends_user_array.length )
          //Follow and Be Followed by all my facebook friends
          var promises = [];

          for (var index in friends_user_array) {

              var friend_user = friends_user_array[index]
              promises.push(addFollowRelation(userPointer, friend_user));
              promises.push(addFollowRelation(friend_user, userPointer));
          }
          
          return Parse.Promise.when(promises)

      }).then(function (result) {

          console.log("follow relations return arguments length: " + arguments.length);
          console.log("addMutualFollowRelationToFbFriends succeded")
          var resultsArray = arguments
          response.success(resultsArray);

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });

});

Parse.Cloud.define("addMutualFollowRelation", function(request, response) {

      console.log("addMutualFollowRelationToFbFriends called")
      var fromUser_id = request.params.user_id
      var user_ids_array = request.params.user_ids_array
      console.log("facebook_id_array count: " + user_ids_array.length)
        // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var userPointer = new UserPointer();
      userPointer.id = fromUser_id;

      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.containedIn("objectId", user_ids_array)

      query.find().then(function(friends_user_array) {

          console.log("facebook friends_user_array count: " + friends_user_array.length )
          //Follow and Be Followed by all my facebook friends
          var promises = [];

          for (var index in friends_user_array) {

              var friend_user = friends_user_array[index]
              promises.push(addFollowRelation(userPointer, friend_user));
              promises.push(addFollowRelation(friend_user, userPointer));
          }
          
          return Parse.Promise.when(promises)

      }).then(function (result) {

          console.log("follow relations return arguments length: " + arguments.length);
          console.log("addMutualFollowRelationToFbFriends succeded")
          var resultsArray = arguments
          response.success(resultsArray);

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });

});

function addFollowRelation(fromUser, toUser){

    var query = new Parse.Query("Following").equalTo('fromUser', fromUser)
    query.equalTo('toUser', toUser)

    return query.first().then(function(followRelationObject) {

        if(followRelationObject){

            return followRelationObject

        }else{

              var Follow = Parse.Object.extend("Following");
              var followingObject = new Follow();
              followingObject.set("fromUser", fromUser);
              followingObject.set("toUser", toUser);
              followingObject.set('blocked',false);
              return followingObject.save()
        }

    }).then(function(followRelationObject) {

        return followRelationObject

      }, function(error) {
        return Parse.Promise.error(error);
    }); 
}


Parse.Cloud.define("fetchFacebookFriendsOnLobe", function(request, response) {

      // var current_user = request.params.user
      var facebook_friend_id_array = request.params.facebook_friend_id_array

      var User = Parse.Object.extend("User");
      var query = new Parse.Query(User);
      query.containedIn("id_secondary_fb", facebook_friend_id_array);

      query.find({
          success: function (facebookFriendsUserArray) {
              // var friendsArray = [];
              // for (var index in facebookFriendsUserArray){
              //     friendsArray.push(facebookFriendsUserArray[index]);
              // }
              response.success(facebookFriendsUserArray);
          },
          error: function (error) {
            response.error(error);
          }
      });
});

Parse.Cloud.define("fetchFollowRelationsForUser", function(request, response) {

      var user_id = request.params.user_id
      var range = request.params.range
      var include = request.params.include
      var followRelationObject = {}

      Parse.Cloud.run('fetchFollowersCountForUser', {
        user_id:user_id

      }).then(function(total_followers_count) {
          
          console.log("total_followers_count: " + total_followers_count)
          followRelationObject["total_followers_count"] = total_followers_count

          return Parse.Cloud.run('fetchFollowingCountForUser', { user_id:user_id })

      }).then(function(total_following_count) {
          
          console.log("total_following_count: " + total_following_count)
          followRelationObject["total_following_count"] = total_following_count

          if (include.followers) {
            return Parse.Cloud.run('fetchFollowersForUser', { user_id:user_id, range:range })
          }

      }).then(function(followers) {

          if (followers) {
            console.log("followers count: " + followers.length)
            followRelationObject["followers"] = followers
          }
          
          if (include.following) {
            return Parse.Cloud.run('fetchFollowingForUser', { user_id:user_id, range:range })
          }
          
      }).then(function (followings) {

            if (followings) {
              console.log("followings count: " + followings.length)
              followRelationObject["following"] = followings
            }

            response.success(followRelationObject)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});


Parse.Cloud.define("fetchFollowersCountForUser", function(request, response) {

      var user_id = request.params.user_id
      var FollowingObject = Parse.Object.extend("Following");

      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;
      
      var query = new Parse.Query(FollowingObject);
      query.equalTo("toUser", fromUserPointer);

      query.count().then(function(followers_count) {

        response.success(followers_count);

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchFollowingCountForUser", function(request, response) {

      var user_id = request.params.user_id
      var FollowingObject = Parse.Object.extend("Following");

      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      var query = new Parse.Query(FollowingObject);
      query.equalTo("fromUser", fromUserPointer);

      query.count().then(function(following_count) {

        response.success(following_count);

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchFollowersForUser", function(request, response) {

      var user_id = request.params.user_id
      var range = request.params.range
      var limit = range.end - range.start
      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      var FollowingObject = Parse.Object.extend("Following");
      var query = new Parse.Query(FollowingObject);
      query.equalTo("toUser", fromUserPointer);
      query.notEqualTo('blocked', true);
      query.include('fromUser');
      query.skip(range.start)
      if(range && (range.end != -1)){
        query.limit(limit)
      }
      
      query.find({
          success: function (result) {
              console.log("followers count: " + result.length)
              var friendsArray = [];
              for (var index in result){
                friendsArray.push(result[index].get("fromUser"));
                // console.log("favourite Track name: "+ trackArray[index].get("song_name"))
              }

              //Eliminate duplicates
              var array = friendsArray
              var unique = {};
              var distinct = [];
              for( var i in array ){
                if( typeof(unique[array[i].id]) == "undefined"){
                    distinct.push(array[i]);
                }
                 unique[array[i].id] = "";
              }

              response.success(distinct);

          },
          error: function (error) {
            console.log(error.message);
            response.error(error);
          }
      });
});

Parse.Cloud.define("fetchFollowingForUser", function(request, response) {

      var user_id = request.params.user_id
      var range = request.params.range
      var limit = range.end - range.start
      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      var FollowingObject = Parse.Object.extend("Following");
      var query = new Parse.Query(FollowingObject);
      query.equalTo("fromUser", fromUserPointer);
      query.notEqualTo('blocked', true);
      query.include('toUser');
      query.skip(range.start)

      if(range && (range.end != -1)){
        query.limit(limit)
      }

      query.find({
          success: function (result) {
              console.log("following count: " + result.length)
              var friendsArray = [];
              for (var index in result){
                friendsArray.push(result[index].get("toUser"));
                // console.log("favourite Track name: "+ trackArray[index].get("song_name"))
              }

              //Eliminate duplicates
              var array = friendsArray
              var unique = {};
              var distinct = [];
              for( var i in array ){
                if( typeof(unique[array[i].id]) == "undefined"){
                    distinct.push(array[i]);
                }
                 unique[array[i].id] = "";
              }
              response.success(distinct);
          },
          error: function (error) {
            console.log(error.message);
            response.error(error);
          }
      });
});


Parse.Cloud.define("fetchRecentFriendsOfUserFriends", function(request, response) {

      var user_id = request.params.user_id
      var limit = request.params.limit

      var my_friends_ids_array = []
      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      // 1st query: fetch my friends
      var FollowingObject = Parse.Object.extend("Following");
      var UserFollowingQuery = new Parse.Query(FollowingObject);
      UserFollowingQuery.equalTo('fromUser', fromUserPointer);
      // UserFollowingQuery.notEqualTo('blocked', true);
      UserFollowingQuery.include('toUser');

      UserFollowingQuery.find().then(function(result_array) {
        
          console.log("user_friends count:" + result_array.length)
          var user_friends = [];
          var blocked_users = [];

          for (var index in result_array){
            var isBlocked = result_array[index].get("blocked")
            if(isBlocked){
              console.log("should be True: " + result_array[index].get("toUser").get("username") + " isblocked = " + isBlocked)
               blocked_users.push(result_array[index].get("toUser"));
            }else{
              console.log("Should be False: " + result_array[index].get("toUser").get("username") + " isblocked = " + isBlocked)
               user_friends.push(result_array[index].get("toUser"));
               my_friends_ids_array.push(result_array[index].get("toUser").id);
            }
          }

          //Create blacklist
          var blacklist_array = blocked_users.concat(user_friends)
          //Second query get friends of friends 
          var mainQuery = new Parse.Query(FollowingObject);

          mainQuery.containedIn("fromUser", user_friends);
          mainQuery.notContainedIn("fromUser", blocked_users);
          mainQuery.notContainedIn("toUser", blacklist_array);
          mainQuery.notEqualTo("toUser", fromUserPointer);
          mainQuery.notEqualTo("fromUser", fromUserPointer);
          mainQuery.notEqualTo('blocked', true);
          mainQuery.include('toUser');
          mainQuery.descending("updatedAt");

          return mainQuery.find()

      }).then(function (friendsOfFriendsArray) {

          console.log("friendsOfFriendsArray count: " + friendsOfFriendsArray.length)
          var friendsArray = [];
          for (var index in friendsOfFriendsArray){
            friendsArray.push(friendsOfFriendsArray[index].get("toUser"));
          }

          //Eliminate duplicates
          var array = friendsArray
          var unique = {};
          var distinct = [];
          for( var i in array ){
            if( typeof(unique[array[i].id]) == "undefined"){
                distinct.push(array[i]);
            }
             unique[array[i].id] = "";
          }
          
          //Eliminate my friends - should not be usefull if the mainQuery does its job right
          var friends_suggestion_array = []
          for (var index in distinct){
            var user_id = distinct[index].id
            if (my_friends_ids_array.indexOf(user_id) > -1) {
              //In the array!
            } else {
              friends_suggestion_array.push(distinct[index])
            }
            
          }
          console.log("friends_suggestion_array count: " + friends_suggestion_array.length)
          
          response.success(friends_suggestion_array);

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error);
      });
});

