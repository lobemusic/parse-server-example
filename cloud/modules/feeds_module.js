
Parse.Cloud.define("addFeedForUser", function(request, response) {

      var user_id = request.params.user_id
      var origin_user_id = request.params.origin_user_id
      var feed_target_type = request.params.feed_target_type
      var feed_target_id = request.params.feed_target_id

      var feed_object = {}
      var subject_user_object = {}
      var feed_target_object = {}
      // create user pointers
      var UserObject = Parse.Object.extend("User")

      var query = new Parse.Query(UserObject);
      query.get(user_id).then(function(subject_user) {

		subject_user_object = subject_user

		switch(feed_target_type) {
			case "track_like":
				var LobeTrackObject = Parse.Object.extend("LobeTrack")
				var target_object_query = new Parse.Query(LobeTrackObject);
				return target_object_query.get(feed_target_id);
				break;

			case "track_favorite":
				var LobeTrackObject = Parse.Object.extend("LobeTrack")
				var target_object_query = new Parse.Query(LobeTrackObject);
				return target_object_query.get(feed_target_id);
				break;

			case "playlist_follow":
				var PlaylistObject = Parse.Object.extend("Playlist")
				var target_object_query = new Parse.Query(PlaylistObject);
				return target_object_query.get(feed_target_id);
				break;

			case "playlist_creation":
				var PlaylistObject = Parse.Object.extend("Playlist")
				var target_object_query = new Parse.Query(PlaylistObject);
				return target_object_query.get(feed_target_id);
				break;

			case "group_creation":
				var ActiveGroupsObject = Parse.Object.extend("ActiveGroups")
				var target_object_query = new Parse.Query(ActiveGroupsObject);
				return target_object_query.get(feed_target_id);
				break;

			default:
				return
			 	break;
		}

      }).then(function(feed_target_object_item){

      	feed_target_object = feed_target_object_item
      	if (origin_user_id && origin_user_id != -1){

			var UserObject = Parse.Object.extend("User")
			var query = new Parse.Query(UserObject);
			return query.get(origin_user_id)
      	}
      	return

      }).then(function(orgin_user){

      	  var subject_name = subject_user_object.get("username")
      	  var subject_profile_pic_url = subject_user_object.get("profile_picture_url")

	      switch(feed_target_type) {

	        case "track_like":
		        feed_object["verb"] = "liked"
		        feed_object["object_name"] = feed_target_object.get("song_name")
		        feed_object["message"] = subject_name + " " + feed_object.verb + " " + feed_object.object_name + " " + feed_object.complement
	            break;

	        case "track_favorite":
		        feed_object["verb"] = "added"
		        feed_object["object_name"] = feed_target_object.get("song_name")
		        feed_object["complement"] = "to favorite"
		        feed_object["message"] = subject_name + " " + feed_object.verb + " " + feed_object.object_name + " " + feed_object.complement
	          break;

	        case "playlist_follow":
		        feed_object["verb"] = "is now following"
		        feed_object["object_name"] = feed_target_object.get("playlist_name")
		        feed_object["complement"] = "a new playlist"
		        feed_object["message"] = subject_name + " " + feed_object.verb + " " + feed_object.complement  + ": " + feed_object.object_name
	            break;

	        case "playlist_creation":
		        feed_object["verb"] = "created"
		        feed_object["object_name"] = feed_target_object.get("playlist_name")
		        feed_object["complement"] = "a new playlist"
		        feed_object["message"] = subject_name + " " + feed_object.verb + " " + feed_object.complement  + ": " + feed_object.object_name
	            break;

	        case "group_creation":
		        feed_object["verb"] = "created"
		        feed_object["object_name"] = feed_target_object.get("group_name")
		        feed_object["complement"] = "a new group"
		        feed_object["message"] = subject_name + " " + feed_object.verb + " " + feed_object.complement  + ": " + feed_object.object_name
	            break;

	        default:
	             break;

	      }

	      var FeedsObject = Parse.Object.extend("Feeds");
		  var feedsObject = new FeedsObject();

		  var fromUserPointer = new UserObject()
		  fromUserPointer.id = user_id

		  feedsObject.set("fromUser", fromUserPointer);
		  feedsObject.set("from_user_id", user_id);
		  feedsObject.set("feed_subject_name", subject_name);
		  feedsObject.set("subject_profile_pic_url", subject_profile_pic_url);
		  feedsObject.set("verb", feed_object.verb);

		  if((feed_target_type === "group_creation") || (feed_target_type === "playlist_creation")){
		  	feedsObject.set("feed_target_id", feed_target_id);
		  }else{
		  	feedsObject.set("feed_target_id", feed_target_object.get("song_uid"));
		  	feedsObject.set("track_info", feed_target_object.get("track_info"));
		  }

		  feedsObject.set("feed_target_type", feed_target_type);
		  // feedsObject.set("feed_target_object", feed_target_object);
		  feedsObject.set("feed_target_object_name", feed_object.object_name);
		  feedsObject.set("complement", feed_object.complement);
		  feedsObject.set("message", feed_object.message);

		  if (origin_user_id && orgin_user){

			origin_user_name = orgin_user.get("username")
	      	origin_user_profile_pic_url = orgin_user.get("profile_picture_url")

		  	feedsObject.set("origin_user_id", origin_user_id);
		  	feedsObject.set("origin_user_name", origin_user_name);
		  	feedsObject.set("origin_user_profile_pic_url", origin_user_profile_pic_url);

		  }

		  return feedsObject.save()

      }).then(function(feed_object) {

          response.success(feed_object)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });

      // feedsObject.save().then(function(feed_object) {

      // 	response.success(feed_object)

      // }, function(error) {
      //       // handle error
      //       console.log(error);
      //       response.error(error)
      // });
});

Parse.Cloud.define("fetchFeedsForUser", function(request, response) {

		var user_id = request.params.user_id
		var range = request.params.range
		var limit = range.end - range.start

		var total_feeds = []
		// create user pointers
		var UserPointer = Parse.Object.extend("User");
		var fromUserPointer = new UserPointer();
		fromUserPointer.id = user_id;

		var FeedsObject = Parse.Object.extend("Feeds");
		var query = new Parse.Query(FeedsObject);

		query.equalTo("fromUser", fromUserPointer);
		query.descending("updatedAt");
		// query.include("feed_target_object")
		query.skip(range.start)
		if(range.end != -1){
		   query.limit(limit)
		}

		query.find().then(function(user_feeds) {

		  total_feeds = total_feeds.concat(user_feeds)
		  return Parse.Cloud.run('fetchRelatedFeedsForUser', { user_id:user_id, range:range})

		}).then(function(user_related_feeds) {

		  total_feeds = total_feeds.concat(user_related_feeds)
		  console.log("user_feeds count: " + total_feeds.length)
		  response.success(total_feeds);

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});

});

Parse.Cloud.define("fetchRelatedFeedsForUser", function(request, response) {

		var user_id = request.params.user_id
		var range = request.params.range
		var limit = range.end - range.start

		// create user pointers
		var UserPointer = Parse.Object.extend("User");
		var fromUserPointer = new UserPointer();
		fromUserPointer.id = user_id;

		var FeedsObject = Parse.Object.extend("Feeds");
		var query = new Parse.Query(FeedsObject);

		query.equalTo("origin_user_id", user_id);
		query.descending("updatedAt");

		query.skip(range.start)

		if(range.end != -1){
		query.limit(limit)
		}

		query.find({
		  success: function (user_feeds) {

		    console.log("user_feeds count: " + user_feeds.length)
		    response.success(user_feeds);
		  },
		  error: function (error) {
		    console.log(error.message);
		    response.error(error);
		  }
		});
});

Parse.Cloud.define("fetchCombineFeedsForUser", function(request, response) {

		var user_id = request.params.user_id
		var range = request.params.range
		var limit = range.end - range.start

		var userFeedsQuery = new Parse.Query("Feeds");
		userFeedsQuery.equalTo("from_user_id", user_id);

		var userRelatedFeedsQuery = new Parse.Query("Feeds");
		userRelatedFeedsQuery.equalTo("origin_user_id", user_id);

		var mainQuery = Parse.Query.or(userFeedsQuery, userRelatedFeedsQuery);
		mainQuery.descending("updatedAt");
		mainQuery.skip(range.start)
		if(range.end != -1){
		   mainQuery.limit(limit)
		}

		mainQuery.find().then(function(user_feeds) {

		  console.log("user_feeds count: " + user_feeds.length)
		  response.success(user_feeds);

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});

});

Parse.Cloud.define("fetchFeedsByUsers", function(request, response) {

		var user_id_array = request.params.user_id_array
		var range = request.params.range
		var limit = range.end - range.start

		var userFeedsQuery = new Parse.Query("Feeds");
		userFeedsQuery.containedIn("from_user_id", user_id_array);

		var userRelatedFeedsQuery = new Parse.Query("Feeds");
		userRelatedFeedsQuery.containedIn("origin_user_id", user_id_array);

		var mainQuery = Parse.Query.or(userFeedsQuery, userRelatedFeedsQuery);
		mainQuery.descending("updatedAt");
		mainQuery.skip(range.start)
		if(range.end != -1){
		   mainQuery.limit(limit)
		}

		mainQuery.find().then(function(user_feeds) {

		  console.log("user_feeds count: " + user_feeds.length)
		  response.success(user_feeds);

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});
});


Parse.Cloud.define("fetchHomeFeedsDataForUsers", function(request, response) {

		var user_id_array = request.params.user_id_array
		var range = request.params.range
		var limit = range.end - range.start

		var user_feed_array = []

      Parse.Cloud.run('fetchFeedsByUsers', {
        user_id_array:user_id_array,
        range:range

      }).then(function(users_feeds) {

          user_feed_array = user_feed_array.concat(users_feeds)

          return Parse.Cloud.run('fetchSharedTracksByUsersInArray', { user_id_array:user_id_array, range:range })

      }).then(function (shared_tracks) {

      		  // var combinedData = []
          //     for (var index in user_feed_array){
          //       combinedData.push(user_feed_array[index]);
          //       combinedData.push(shared_tracks[index]);
          //     }
          var combinedData = {}
          combinedData["feeds"] = user_feed_array
          combinedData["most_shared_tracks"] = shared_tracks

            response.success(combinedData)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});

Parse.Cloud.define("fetchGroupsFeedsForUser", function(request, response) {

		var user_id = request.params.user_id
		var range = request.params.range
		var limit = range.end - range.start

		// create user pointers
		var UserPointer = Parse.Object.extend("User");
		var fromUserPointer = new UserPointer();
		fromUserPointer.id = user_id;

		Parse.Cloud.run('fetchPublicGroups', {is_nearby:false}).then(function(active_groups) {

			var active_group_ids = active_groups.map(function(active_group){
			    return active_group.id;
			});

			var FeedsObject = Parse.Object.extend("Feeds");
			var query = new Parse.Query(FeedsObject);

			query.descending("updatedAt");
			query.equalTo("feed_target_type", "group_creation");
			query.notContainedIn("feed_target_id", active_group_ids);
			query.include("fromUser")
			query.greaterThan("nb_total_tracks", 1);
			// query.limit(25)

			query.skip(range.start)
			if(range.end != -1){
				query.limit(limit)
			}
			return query.find()

		}).then(function(group_feeds) {

		  response.success(group_feeds);

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});
});

Parse.Cloud.define("fetchGlobalFeeds", function(request, response) {

		var range = request.params.range
		var limit = range.end - range.start

		Parse.Cloud.run('fetchPublicGroups', {is_nearby:false}).then(function(active_groups) {

			var active_group_ids = active_groups.map(function(active_group){
			    return active_group.id;
			});

			var FeedsObject = Parse.Object.extend("Feeds");
			var query = new Parse.Query(FeedsObject);

			query.descending("updatedAt");
			query.notContainedIn("feed_target_id", active_group_ids);
			query.include("fromUser")
			query.skip(range.start)
			if(range.end != -1){
				query.limit(limit)
			}
			return query.find()

		}).then(function(global_feeds) {

		  response.success(global_feeds);

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});

});


Parse.Cloud.define("removeFeed", function(request, response) {

		var feed_id = request.params.feed_id

		var FeedsObject = Parse.Object.extend("Feeds");
		var query = new Parse.Query(FeedsObject);
		query.equalTo("objectId", feed_id);

		query.first().then(function(feed){

			if(feed){
				return feed.destroy()
			}
			return

		}).then(function(feed) {

		  response.success("feed");

		}, function(error) {
		    // handle error
		    console.error(error.message);
		    response.error(error)
		});

});
