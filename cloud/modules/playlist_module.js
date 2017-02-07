

Parse.Cloud.define("createPlaylist", function(request, response) {

      var user_id = request.params.user_id
      var playlist_name = request.params.playlist_name
      var track_id_array = request.params.track_id_array

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var created_playlist = {}

      var Playlist = Parse.Object.extend("Playlist");
      var playlist = new Playlist();

      playlist.set('fromUser', fromUserPointer)
      playlist.set('from_user_id', user_id)
      playlist.set('playlist_name', playlist_name)

      if (track_id_array){
        playlist.set("track_id_array", track_id_array);
      }
      
      playlist.save().then(function(playlist_object) {

        created_playlist = playlist_object
        return Parse.Cloud.run('addFeedForUser', { feed_target_type:"playlist_creation", user_id:user_id, origin_user_id:-1, feed_target_id:playlist_object.id})

      }).then(function(feed_object) {

        response.success(created_playlist)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});


Parse.Cloud.define("deletePlaylist", function(request, response) {

      var playlist_id = request.params.playlist_id

      var Playlist = Parse.Object.extend("Playlist");
      var query = new Parse.Query(Playlist);

      query.get(playlist_id).then(function(playlist) {

          return playlist.destroy()

      }).then(function(playlist) {

          response.success(playlist)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});

Parse.Cloud.define("addTrackToPlaylist", function(request, response) {

      var playlist_id = request.params.playlist_id
      var track_info = request.params.track_info
      var lobe_track = {}

      Parse.Cloud.run('addTrackToLobeTracks', {

        track_info:track_info

      }).then(function(created_lobe_track) {

          lobe_track = created_lobe_track
          var Playlist = Parse.Object.extend("Playlist");
          var query = new Parse.Query(Playlist);
          return query.get(playlist_id);

      }).then(function(playlist) {

          playlist.addUnique("track_id_array", lobe_track.get("song_uid"));
          return playlist.save()

      }).then(function(playlist) {

          response.success(lobe_track)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});

Parse.Cloud.define("removeTrackFromPlaylist", function(request, response) {

      var playlist_id = request.params.playlist_id
      var lobe_track_id = request.params.lobe_track_id

      var Playlist = Parse.Object.extend("Playlist");
      var query = new Parse.Query(Playlist);

      query.get(playlist_id).then(function(playlist) {

            playlist.remove("track_id_array", lobe_track_id);
            return playlist.save()

      }).then(function(playlist) {

          response.success(playlist)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });
});

Parse.Cloud.define("fetchUserPlaylists", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start
    var playlist_object = {}
    // create user pointers
    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var Playlist = Parse.Object.extend("Playlist");

    Parse.Cloud.run('fetchUserPlaylistCount', {
      user_id:user_id

    }).then(function(user_playlists_count) {
        
        console.log("user_playlists_count: " + user_playlists_count)
        playlist_object["me_count"] = user_playlists_count

        return Parse.Cloud.run('fetchUserPlaylistFollowingCount', { user_id:user_id })

    }).then(function(playlists_following_count) {
        
        console.log("playlists_following_count: " + playlists_following_count)
        playlist_object["following_count"] = playlists_following_count

        //Fetch user playlist.. TODO:- this query might be better in a separate call
        var query = new Parse.Query(Playlist);
        query.equalTo("fromUser", fromUserPointer);
        query.descending("updatedAt");
        // query.select("playlist_name", "from_user_id");

        if (range && (range.end != -1)){
          query.skip(range.start)
          query.limit(limit);
        }
        return query.find();

    }).then(function(my_playlist_array) {

          playlist_object["me"] = my_playlist_array
          return Parse.Cloud.run('fetchPlaylistsFollowingForUser', { user_id:user_id, range:range }) 

    }).then(function(following_playlist_array) {

         playlist_object["following"] = following_playlist_array
        response.success(playlist_object)

    }, function(error) {
          // handle error
          console.log(error);
          response.error()
    });

    // query.find({
    //     success: function (playlistArray) {

    //         response.success(playlistArray);
    //     },
    //     error: function (error) {

    //         console.log(error);
    //         response.error(error);
    //     }
    // });

});

Parse.Cloud.define("fetchPlaylistTracks", function(request, response) {

    var playlist_id = request.params.playlist_id
    var range = request.params.range

    var Playlist = Parse.Object.extend("Playlist");
    var query = new Parse.Query(Playlist);

    query.get(playlist_id).then(function(playlist) {

        console.log("Success fetchPlaylistTracks")

         var track_id_array = playlist.get("track_id_array");
         return Parse.Cloud.run('fetchLobeTracks', { song_uid_array:track_id_array, range:range })

      }).then(function(lobe_track_array) {

          response.success(lobe_track_array)

      }, function(error) {
            // handle error
            console.log(error);
            response.error()
      });

});

// PLAYLIST FOLLOW
//==============================================================================================================

Parse.Cloud.define("followPlaylist", function(request, response) {

    var user_id = request.params.user_id
    var origin_user_id = request.params.origin_user_id
    var playlist_id = request.params.playlist_id

    var follow_relation = {}
    // create user & playlist pointers
    var UserPointer = Parse.Object.extend("User");
    var fromUserPointer = new UserPointer();
    var PlaylistPointer = Parse.Object.extend("Playlist");
    var toPlaylistPointer = new PlaylistPointer();

    // set ids
    fromUserPointer.id = user_id;
    toPlaylistPointer.id = playlist_id;

    var playlistFollowObject = Parse.Object.extend("PlaylistFollowing")
    var query = new Parse.Query(playlistFollowObject);

    query.equalTo("fromUser", fromUserPointer);
    query.equalTo("toPlaylist", toPlaylistPointer);

    query.first().then(function(playlistFollowRelation) {
        
        if (playlistFollowRelation){
            console.log("playlist Relation already exists..")
            return playlistFollowRelation

        }else{
            //If the follow relation doesn't exist, create one and add the block condition
            console.log("playlist Relation did not exist..adding relation ..")
            var followingRelation = new playlistFollowObject();
            followingRelation.set("fromUser", fromUserPointer);
            followingRelation.set("toPlaylist", toPlaylistPointer);

            return followingRelation.save();
        }

    }).then(function(followRelation) {

        follow_relation = followRelation
        return Parse.Cloud.run('addFeedForUser', { feed_target_type:"playlist_follow", user_id:user_id, origin_user_id:origin_user_id, feed_target_id:playlist_id })

    }).then(function (feed_object) {

        response.success(follow_relation);

    }, function(error) {

        console.log(error);
        response.error(error);

    });
});

Parse.Cloud.define("unfollowPlaylist", function(request, response) {

    var user_id = request.params.user_id
    var playlist_id = request.params.playlist_id

    // create user & playlist pointers
    var UserPointer = Parse.Object.extend("User");
    var fromUserPointer = new UserPointer();
    var PlaylistPointer = Parse.Object.extend("Playlist");
    var toPlaylistPointer = new PlaylistPointer();

    // set ids
    fromUserPointer.id = user_id;
    toPlaylistPointer.id = playlist_id;

    var playlistFollowObject = Parse.Object.extend("PlaylistFollowing")
    var query = new Parse.Query(playlistFollowObject);
    query.equalTo("fromUser", fromUserPointer);
    query.equalTo("toPlaylist", toPlaylistPointer);

    query.first().then(function(playlistFollowRelation) {
        
        if (playlistFollowRelation){
            console.log(" playlist Relation exists, detroying ..")
            return playlistFollowRelation.destroy();
        }
        return

    }).then(function (followRelation) {

        response.success(followRelation);

    }, function(error) {

        console.log(error);
        response.error(error);

    });
});

Parse.Cloud.define("fetchPlaylistsFollowingForUser", function(request, response) {

      var user_id = request.params.user_id
      var range = request.params.range
      var limit = range.end - range.start

      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      var FollowingObject = Parse.Object.extend("PlaylistFollowing");
      var query = new Parse.Query(FollowingObject);

      query.equalTo("fromUser", fromUserPointer);
      query.include('toPlaylist');
      query.skip(range.start)

      if(range.end != -1){
        query.limit(limit)
      }

      query.find({
          success: function (result) {

              console.log("PlaylistFollowing count: " + result.length)
              var playlistArray = [];
              for (var index in result){
                playlistArray.push(result[index].get("toPlaylist"));
              }
              response.success(playlistArray);
          },
          error: function (error) {
            console.log(error.message);
            response.error(error);
          }
      });
});

Parse.Cloud.define("fetchUserPlaylistCount", function(request, response) {

      var user_id = request.params.user_id
      var PlaylistObject = Parse.Object.extend("Playlist");

      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;
      
      var query = new Parse.Query(PlaylistObject);
      query.equalTo("toUser", fromUserPointer);

      query.count().then(function(user_playlists_count) {

        response.success(user_playlists_count);

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchUserPlaylistFollowingCount", function(request, response) {

      var user_id = request.params.user_id
      var FollowingObject = Parse.Object.extend("PlaylistFollowing");

      // create user pointers
      var UserPointer = Parse.Object.extend("User");
      var fromUserPointer = new UserPointer();
      fromUserPointer.id = user_id;

      var query = new Parse.Query(FollowingObject);
      query.equalTo("fromUser", fromUserPointer);

      query.count().then(function(playlists_following_count) {

        response.success(playlists_following_count);

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

