

Parse.Cloud.define("sendSnapToFriends", function(request, response) {

      var from_user_id = request.params.from_user_id
      var to_user_ids_array = request.params.to_user_ids_array
      var track_info = request.params.track_info
      var freebase_mids = request.params.freebase_mids
      var currentUser = {}

      var unique = {};
      var distinct_to_user_ids_array = [];
      for( var i in to_user_ids_array ){
        if( typeof(unique[to_user_ids_array[i]]) == "undefined"){
            distinct_to_user_ids_array.push(to_user_ids_array[i]);
        }
         unique[to_user_ids_array[i]] = "";
      }

      Parse.Promise.as().then(function() {

        var User = Parse.Object.extend("User");
        var query = new Parse.Query(User);
        console.log("sendSnapToFriends user id: " + from_user_id)
        query.equalTo('objectId', from_user_id)
        return query.first()

      }).then(function(parseUser) {

        console.log("sendSnapToFriends got user")
        if(parseUser){
          currentUser = parseUser 
          var User = Parse.Object.extend("User");
          var query = new Parse.Query(User);
          query.containedIn("objectId", distinct_to_user_ids_array)
          return query.find()
        }else{
          console.log("sendSnapToFriends no find current user")
        }

      }).then(function(friends_user_array) {

          if(friends_user_array){

            var promises = [];
            for (var index in friends_user_array) {
                var friend_user = friends_user_array[index]
                promises.push(addTrackSuggestion(currentUser, friend_user, track_info, freebase_mids))
            }
            return Parse.Promise.when(promises)

          }

      }).then(function(result) {

          console.log("success sending suggestions with length: " + arguments.length);
          var resultsArray = arguments

          return Parse.Cloud.run('sendTrackSuggestionPushNotification',{
              message: currentUser.get("username") + " sent you a lobe song!",
              type: "track_suggestion",
              from_user_id: currentUser.id,
              to_user_ids_array: distinct_to_user_ids_array,
              track_info:track_info
          })

      }).then(function() {

        response.success("Success sending suggestion");

      }, function(error) {

        response.error(error);
      });

});


function addTrackSuggestion(fromUser, toUser,track_info,freebase_mids){

    var lobeTrack = {}

    return Parse.Cloud.run('addTrackToLobeTracks', {

        track_info:track_info,
        freebase_mids:freebase_mids

    }).then(function(lobe_track) {

        if(lobe_track){
          console.log("addTrackSuggestion GOT TRACK")
          lobeTrack = lobe_track
          var query = new Parse.Query("LobeSnap").equalTo('from_user_id', fromUser.id)
          query.equalTo('to_user_id', toUser.id)
          query.equalTo('song_uid', track_info.song_uid)
          return query.first()
        }

    }).then(function(track_suggestion_obj) {

        if(track_suggestion_obj){
          console.log("addTrackSuggestion track_suggestion_obj exist")
            return track_suggestion_obj

        }else{
              console.log("addTrackSuggestion Creating new track suggestion")

              var LobeTrack = Parse.Object.extend("LobeTrack");
              var trackPointer = new LobeTrack();
              trackPointer.id = lobeTrack.id;

              //Create the track suggestion object
              var TrackSuggestion = Parse.Object.extend("LobeSnap");
              var trackSuggestionObject = new TrackSuggestion();
              trackSuggestionObject.set("fromUser", fromUser);
              trackSuggestionObject.set("toUser", toUser);
              trackSuggestionObject.set("from_user_id", fromUser.id);
              trackSuggestionObject.set("to_user_id", toUser.id);

              trackSuggestionObject.set("toTrack",trackPointer);
              trackSuggestionObject.set("to_track_id",lobeTrack.id);
              trackSuggestionObject.set("track_info",track_info);
              trackSuggestionObject.set("song_uid",track_info.song_uid);
              trackSuggestionObject.set("song_name", track_info.song_name);
              trackSuggestionObject.set("song_artist", track_info.song_artist);
              trackSuggestionObject.set("isPending", true);

              return trackSuggestionObject.save()
        }

    }).then(function(trackSuggestionObject) {

        console.log("addTrackSuggestion returning")
        return trackSuggestionObject

      }, function(error) {
        return Parse.Promise.error(error);
    }); 
}


Parse.Cloud.define("fetchTrackSuggestionForUser", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start

    var TrackSuggestion = Parse.Object.extend("LobeSnap");
    var query = new Parse.Query(TrackSuggestion);

    query.equalTo("to_user_id", user_id);
    query.include('toTrack');
    query.include('fromUser');
    query.include('toUser');
    query.descending("updatedAt");
    query.skip(range.start)
    if(range && (range.end != -1)){
        query.limit(limit)
    }

    query.find().then(function(track_suggestion_array) {

        response.success(track_suggestion_array);

      }, function(error) {

        response.error(error);
      });
});

Parse.Cloud.define("setSnapsState", function(request, response) {

    var is_pending = request.params.is_pending
    var snaps_ids_array = request.params.snaps_ids_array

    var TrackSuggestion = Parse.Object.extend("LobeSnap");
    var query = new Parse.Query(TrackSuggestion);
    query.containedIn("objectId", snaps_ids_array);
    query.find().then(function(track_suggestion_array) {

      var promises = [];
      for (var index in track_suggestion_array) {
        var lobeSnap = track_suggestion_array[index]
        lobeSnap.set("isPending",is_pending)
        promises.push(lobeSnap.save())
      }
      return Parse.Promise.when(promises)

      }).then(function(result) {

        var resultsArray = arguments
        response.success(resultsArray);

      }, function(error) {

        response.error(error);
      });
});



Parse.Cloud.define("fetchTrackSuggestionInfoForUser", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start

    var track_suggestion_object = {}
    Parse.Cloud.run('fetchTrackSuggestionForUser', {

        user_id:user_id,
        range:range

    }).then(function(track_suggestion_array) {
          track_suggestion_object["suggestions_array"] = track_suggestion_array
          var query = new Parse.Query("LobeSnap").equalTo('to_user_id', user_id)
          query.equalTo('isPending', true)
          return query.count()

    }).then(function(pending_suggestion_count) {
        track_suggestion_object["pending_suggestions_count"] = pending_suggestion_count
        response.success(track_suggestion_object);

      }, function(error) {

        response.error(error);
      });
});
