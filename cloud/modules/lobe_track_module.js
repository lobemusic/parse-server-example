
// Lobe Tracks
//=======================================================================================================

Parse.Cloud.define("updateLobeTracks", function(request, response) {

      // var track_type = request.params.track_type
      var limit = request.params.limit
      var track_types_array = request.params.track_types_array
      // var track_types_array = ["Rap","Pop","Africa","Soul","Zouk","Techtonik","Blues","Rock","Classic","R&B","Reggae","Kizomba","Latin","AfroTrap","Rock&Roll","Hip Hop"]

      Parse.Cloud.run('fetchAllLobeTracks', {limit:limit}).then(function(lobe_track_array) {

           console.log("fetchAllLobeTracks now updateLobeTracks ..")
          var promises = [];
          var parse_objects = []
          for (var index in lobe_track_array){

              var track_type_index = Math.floor((Math.random() * track_types_array.length))
              var track_type = track_types_array[track_type_index]

              var lobe_track = lobe_track_array[index]
              lobe_track.set("type", track_type);

              parse_objects.push(lobe_track)
              promises.push(lobe_track.save());
          }
          
          return Parse.Object.saveAll(parse_objects) //return Parse.Promise.when(promises)

      }).then(function(result) {

        console.log("Success updating Lobe tracks")
        response.success(result)

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("updateLobeTracksInArray", function(request, response) {

      var track_object_array = request.params.track_object_array

      Parse.Object.saveAll(track_object_array).then(function(result) {
        console.log("Success updating track_object_array")
        response.success(result)

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("addTrackToLobeTracks", function(request, response) {

      var track_info = request.params.track_info
      var freebase_mids = request.params.freebase_mids

      var LobeTrack = Parse.Object.extend("LobeTrack");
      var lobeTrackObject = new LobeTrack()

      // if(!track_info.is_youtube_video){
      //     response.error("error: track is not valid. needs to be a youtube track")
      // }

      var query = new Parse.Query(LobeTrack);
      query.equalTo('song_uid', track_info.song_uid)
      query.first().then(function(lobe_track) {

        if(lobe_track){
            //Lobe Track already existed
            var total_score = lobe_track.get("total_score")
            total_score += 1
            lobe_track.set("total_score", total_score);
            return lobe_track.save()

        }else{

            var lobeTrack = new LobeTrack();
            lobeTrack.set("song_name", track_info.song_name);
            lobeTrack.set("song_artist", track_info.song_artist);
            lobeTrack.set("song_uid", track_info.song_uid);
            lobeTrack.set("track_info", track_info);
            if(freebase_mids){
              lobeTrack.set("freebase_mid_list", freebase_mids);
            }
            // lobeTrack.set("type", trackInfo.type);

            lobeTrack.set("like_score", 2);
            lobeTrack.set("dislike_score", 0);
            lobeTrack.set("total_score", 2);
            return lobeTrack.save()
        }

      }).then(function(lobe_track) {

        console.log("Success updating tracks")
        response.success(lobe_track)

      }, function(error) {
            // handle error
            console.log(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("fetchLobeTracks", function(request, response) {

      var song_uid_array = request.params.song_uid_array
      var range = request.params.range
      var limit = range.end - range.start

      Parse.Cloud.run('fetchflaggedTrackIds', {flag_code:null}).then(function(flagged_track_ids) {

          var LobeTrack = Parse.Object.extend("LobeTrack");
          var query = new Parse.Query(LobeTrack);
          query.containedIn('song_uid', song_uid_array);
          query.notContainedIn('objectId', flagged_track_ids);

          if (range && (range.end =! -1)){

            query.skip(range.start)
            query.limit(limit);

          }
          return query.find()

      }).then(function(lobe_tracks) {

        console.log("Success fetchLobeTracks with count: " + lobe_tracks.count)
        response.success(lobe_tracks)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchAllLobeTracks", function(request, response) {

      // var limit = request.params.limit
      var track_per_query = 100
      var range = { start:0, end:track_per_query }
      var flagged_content_ids = []
      var LobeTrack = Parse.Object.extend("LobeTrack");

      Parse.Cloud.run('fetchflaggedTrackIds', {flag_code:null}).then(function(flagged_track_ids) {
          flagged_content_ids = flagged_content_ids.concat(flagged_track_ids)
          
          var query = new Parse.Query(LobeTrack);

          return query.count()

      }).then(function(lobe_track_list_count) {

          console.log("number of lobe tracks : " + lobe_track_list_count)
          query_number = Math.ceil(lobe_track_list_count/track_per_query)
          console.log("number of queries : " + query_number)

          var promises = [];

          for (i = 0; i < query_number; i++){

              var track_query = new Parse.Query(LobeTrack);
              var limit = range.end - range.start

              track_query.notContainedIn('objectId', flagged_content_ids);
              track_query.skip(range.start);
              track_query.limit(limit);
              
              promises.push(track_query.find());

              range.start = range.end
              range.end += track_per_query
          }
          
          console.log("number of promises : " + promises.length)
          return Parse.Promise.when(promises)

      }).then(function(result) {

        console.log("LobeTrack arguments length: " + arguments.length)
        var lobe_track_array = []
        for (var index in arguments){

            lobe_track_array = lobe_track_array.concat(arguments[index])
        }
        console.log("Success Fetching lobe tracks  with count: " + lobe_track_array.count)
        response.success(lobe_track_array)

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("updateLobeTrackScore", function(request, response) {

      var score_type = request.params.score_type
      var track_info = request.params.track_info
      var score = 0

      switch(score_type) {
        case "like":
          score += 3
            break;
        case "favorite":
          score += 7
          break;
        default:
             break
      }

      var updated_lobe_track = {}
      var LobeTrack = Parse.Object.extend("LobeTrack");
      var query = new Parse.Query(LobeTrack);
      query.equalTo('song_uid', track_info.song_uid)
      query.first().then(function(lobe_track) {

        if(lobe_track){

            console.log("lobe_track exist..updating ")
            var current_score = lobe_track.get("total_score")
            current_score += score
            lobe_track.set("total_score", current_score);
            return lobe_track.save()

         }
         return

      }).then(function(lobe_track) {

        if(lobe_track){
            console.log("lobe_track exist..updateUserRatingScore ")
            updated_lobe_track = lobe_track
            return Parse.Cloud.run('updateUserRatingScore', { user_id:track_info.user_uid, score_type:"like"})
         }
         return

      }).then(function(user_rating) {

        response.success(updated_lobe_track)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

// Music Genre
//=======================================================================================================

Parse.Cloud.define("addNewMusicGenre", function(request, response) {

      var freebase_id = request.params.freebase_id
      var genre_name = request.params.genre_name

      var MusicGenre = Parse.Object.extend("MusicGenre");
      var musicGenreObject = new MusicGenre()

      var query = new Parse.Query(MusicGenre);
      query.equalTo('freebase_id', freebase_id)
      query.first().then(function(music_genre) {

        if(music_genre){
            // music_genre.increment("total_score")
            return music_genre.save()

        }else{

            var musicGenre = new MusicGenre();
            musicGenre.set("genre_name", genre_name);
            musicGenre.set("total_score", 1);
            return musicGenre.save()
        }

      }).then(function(music_genre) {

        console.log("Success updating music_genre")
        response.success(music_genre)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("addMusicGenresFromFreebaseApi", function(request, response) {

      var freebase_music_genres = request.params.freebase_music_genres
      var parse_music_genre_list = []
      
      for (var index in freebase_music_genres){

          var freebase_object = freebase_music_genres[index]
          var MusicGenre = Parse.Object.extend("MusicGenre");
          var musicGenre = new MusicGenre();
          musicGenre.set("genre_name", freebase_object.name);
          musicGenre.set("freebase_id", freebase_object.id);
          musicGenre.set("freebase_mid", freebase_object.mid);
          musicGenre.set("freebase_name", freebase_object.name);
          musicGenre.set("freebase_score", freebase_object.score);
          musicGenre.set("total_score", 1);
          parse_music_genre_list.push(musicGenre);
      }

      Parse.Object.saveAll(parse_music_genre_list).then(function(music_genre_list) {

        console.log("Success updating music_genres")
        response.success(music_genre_list)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchMusicGenres", function(request, response) {

    var range = request.params.range
    var limit = range.end - range.start

    var query = new Parse.Query("MusicGenre");
    // query.descending("total_score");
    query.skip(range.start)
    if(range.end != -1){
       query.limit(limit)
    }

    query.find().then(function(music_genre_array) {
      
      console.log("music_genre_array count: " + music_genre_array.length)
      response.success(music_genre_array);

    }, function(error) {
        // handle error
        console.error(error.message);
        response.error(error)
    });

});

Parse.Cloud.define("fetchLobeTrack", function(request, response) {

    var song_uid = request.params.song_uid
    var query = new Parse.Query("LobeTrack");
    query.equalTo('song_uid', song_uid)

    query.first().then(function(lobe_track) {
      
      response.success(lobe_track);

    }, function(error) {
        // handle error
        console.error(error.message);
        response.error(error)
    });

});

Parse.Cloud.define("removeNonYoutubeTracks", function(request, response) {

      var promises = [];
      var parse_object_ids = []

      Parse.Cloud.run('fetchAllLobeTracks', {}).then(function(lobe_track_array) {

          console.log("fetchAllLobeTracks now delete non youtube tracks ..")
          for (var index in lobe_track_array){

              var lobe_track = lobe_track_array[index]
              
              if(!lobe_track.get("track_info").is_youtube_video){
                console.log("youtube track")
                parse_object_ids.push(lobe_track.id)
                promises.push(lobe_track.destroy());
              }
              
          }
          
        return Parse.Promise.when(promises)

      }).then(function(result) {

        return Parse.Cloud.run('removeTracksFromFavorite', {lobe_tracks_ids:parse_object_ids})

      }).then(function(result) {

        return Parse.Cloud.run('removeTracksFromRecentPlayed', {lobe_tracks_ids:parse_object_ids})

      }).then(function(result) {

        return Parse.Cloud.run('removeTracksFromMostShared', {lobe_tracks_ids:parse_object_ids})

      }).then(function(result) {

        console.log("Success removing non youtube tracks")
        response.success(result)

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("removeTrackFromLobe", function(request, response) {

      var song_uid = request.params.song_uid
      var lobe_tracks_ids = []
      Parse.Cloud.run('fetchLobeTrack', {song_uid:song_uid}).then(function(lobe_track) {
        console.log("fetchLobeTrack")

        lobe_tracks_ids.push(lobe_track.id)
        return lobe_track.destroy()

      }).then(function(result) {

        console.log("destroyed track")
         return Parse.Cloud.run('removeTracksFromFavorite', {lobe_tracks_ids:lobe_tracks_ids})

      }).then(function(result) {

        console.log("removeTracksFromFavorite")
         return Parse.Cloud.run('removeTracksFromRecentPlayed', {lobe_tracks_ids:lobe_tracks_ids})

      }).then(function(result) {

        console.log("removeTracksFromRecentPlayed")
        return Parse.Cloud.run('removeTracksFromMostShared', {lobe_tracks_ids:lobe_tracks_ids})

      }).then(function(result) {

        console.log("removeTracksFromMostShared")
        return Parse.Cloud.run('removeTracksFromFlagReport', {lobe_tracks_ids:lobe_tracks_ids})

      }).then(function(result) {

        console.log("removeTracksFromFlagReport")
        console.log("Success removing non youtube tracks")
        response.success(result)

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("removeTracksFromFavorite", function(request, response) {

      var lobe_tracks_ids = request.params.lobe_tracks_ids

      var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
      var query = new Parse.Query(FavouriteTrack);
      query.containedIn("to_track_id", lobe_tracks_ids);

      query.find().then(function(favorite_tracks_rows) {

          if (lobe_tracks_ids.length > 0){

            var promises = []
            for (var index in favorite_tracks_rows){
            console.log("removeTracksFromFavorite")
            var fav_track_row = favorite_tracks_rows[index]
            promises.push(fav_track_row.destroy());
            }
            return Parse.Promise.when(promises)
          }
          return

      }).then(function(result) {

        response.success("result")

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("removeTracksFromRecentPlayed", function(request, response) {

      var lobe_tracks_ids = request.params.lobe_tracks_ids

      var RecentPlayedTrack = Parse.Object.extend("RecentPlayedTrack");
      var query = new Parse.Query(RecentPlayedTrack);
      query.containedIn("to_track_id", lobe_tracks_ids);

      query.find().then(function(recent_tracks_rows) {

        if (lobe_tracks_ids.length > 0){
          var promises = []
          for (var index in recent_tracks_rows){
              console.log("removeTracksFromRecentPlayed")
              var recent_track_row = recent_tracks_rows[index]
              promises.push(recent_track_row.destroy());
          }
          return Parse.Promise.when(promises)
        }
        return

      }).then(function(result) {

        response.success("result")

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("removeTracksFromMostShared", function(request, response) {

      var lobe_tracks_ids = request.params.lobe_tracks_ids

      var SharedTrack = Parse.Object.extend("SharedTrack");
      var query = new Parse.Query(SharedTrack);
      query.containedIn("to_track_id", lobe_tracks_ids);

      query.find().then(function(shared_tracks_rows) {

        if (lobe_tracks_ids.length > 0){
          var promises = []
          for (var index in shared_tracks_rows){
              console.log("removeTracksFromMostShared")
              var shared_track_row = shared_tracks_rows[index]
              promises.push(shared_track_row.destroy());
          }
          return Parse.Promise.when(promises)
        }else{
          return
        }
        
      }).then(function(result) {

        response.success("result")

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("removeTracksFromFlagReport", function(request, response) {

      var lobe_tracks_ids = request.params.lobe_tracks_ids

      var FlagReport = Parse.Object.extend("FlagReport");
      var query = new Parse.Query(FlagReport);
      query.containedIn("to_track_id", lobe_tracks_ids);

      query.find().then(function(flagged_tracks_rows) {

        if (lobe_tracks_ids.length > 0){
          var promises = []
          for (var index in flagged_tracks_rows){
              var flagged_track_row = flagged_tracks_rows[index]
              promises.push(flagged_track_row.destroy());
          }
          return Parse.Promise.when(promises)
        }else{
          return
        }
        
      }).then(function(result) {

        response.success("result")

      }, function(error) {
            // handle error

            console.log(error);
            response.error(error)
      });
});