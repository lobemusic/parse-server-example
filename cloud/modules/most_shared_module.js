
Parse.Cloud.define("addTrackToSharedTracks", function(request, response) {

      // response.success("most_shared_track_row");
      
      var user_id = request.params.user_id
      var track_info = request.params.track_info
      var lobe_track_id = request.params.lobe_track_id

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var most_shared_track_row = {}

      Parse.Cloud.run('updateTrackSharedScore', { 

        user_id:user_id, 
        track_info:track_info,
        lobe_track_id:lobe_track_id 

      }).then(function(shared_track_row) {
          most_shared_track_row = shared_track_row
          return Parse.Cloud.run('updateLobeTrackScore', { track_info:track_info, score_type:"shared"})

      }).then(function(track_score) {
          
          response.success(most_shared_track_row);

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("updateTrackSharedScore", function(request, response) {

      var user_id = request.params.user_id
      var track_info = request.params.track_info
      var lobe_track_id = request.params.lobe_track_id

      // create users pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var SharedTrack = Parse.Object.extend("SharedTrack");
      var query = new Parse.Query(SharedTrack);
      query.equalTo('fromUser', fromUserPointer)
      query.equalTo('to_track_id', lobe_track_id)

      query.first().then(function(shared_track) {

        if(shared_track){
            
            console.log("Track already in user shared_track..")
            var current_score = shared_track.get("total_score")
            current_score += 1
            shared_track.set("total_score", current_score);
            return shared_track.save()

        }else{

            // create track pointer
            var LobeTrackObject = Parse.Object.extend("LobeTrack")
            var trackPointer = new LobeTrackObject()
            trackPointer.id = lobe_track_id

            console.log("Adding track in user SharedTrack..")
            var sharedTrack = new SharedTrack();
            sharedTrack.set("fromUser", fromUserPointer);
            sharedTrack.set("from_user_id", user_id);
          
            sharedTrack.set("toTrack",trackPointer);
            sharedTrack.set("to_track_id",lobe_track_id);
            sharedTrack.set("song_name", track_info.song_name);
            sharedTrack.set("song_artist", track_info.song_artist);
            sharedTrack.set("total_score", 1);

            return sharedTrack.save() 
        }

      }).then(function(shared_track_row) {

        console.log("Success updating shared_track score")
        response.success(shared_track_row)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchUserMostSharedTracks", function(request, response) {

    var user_id = request.params.user_id
    var range = request.params.range
    var limit = range.end - range.start
    // create user pointers
    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var SharedTrack = Parse.Object.extend("SharedTrack");
    var query = new Parse.Query(SharedTrack);

    query.equalTo("fromUser", fromUserPointer);
    query.include('toTrack');
    // query.descending("total_score");
    query.descending('total_score,updatedAt')
    query.skip(range.start)
    query.limit(limit);

    query.find({
        success: function (sharedTrackArray) {

            var trackArray = [];
            for (var index in sharedTrackArray){

              var track = sharedTrackArray[index].get("toTrack")
              if(track === null || typeof track === "undefined" || track === "undefined"){
              }else{
                  trackArray.push(track);
                  console.log("shared Track name: "+ trackArray[index].get("song_name"))
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

Parse.Cloud.define("fetchSharedTracksByUsers", function(request, response) {

    var user_id_array = request.params.user_id_array
    var range = request.params.range
    var limit = range.end - range.start
    // create user pointers
    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var SharedTrack = Parse.Object.extend("SharedTrack");
    var query = new Parse.Query(SharedTrack);
    query.containedIn("from_user_id", user_id_array);
    query.include('toTrack');
    // query.descending("updatedAt");
    query.descending("total_score");
    query.skip(range.start)
    query.limit(limit);

    query.find({
        success: function (sharedTrackArray) {

            var trackArray = [];
            for (var index in sharedTrackArray){

              var track = sharedTrackArray[index].get("toTrack")
              if(track === null || typeof track === "undefined" || track === "undefined"){
              }else{
                  trackArray.push(track);
                  console.log("shared Track name: "+ trackArray[index].get("song_name"))
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

Parse.Cloud.define("fetchMostSharedTrackByLocation", function(request, response) {

      var location = request.params.location
      var range = request.params.range
      var limit = range.end - range.start

      // Set Up Query to Find Specific Posts
      var UserObject = Parse.Object.extend("_User");
      var userLocationQuery = new Parse.Query(UserObject);
      if(location.city){
        userLocationQuery.equalTo('city', location.city);
      }
      
      var RecentPlayedTrack = Parse.Object.extend("SharedTrack");
      var query = new Parse.Query(RecentPlayedTrack);

      query.include('toTrack');
      query.descending('total_score,updatedAt')
      if(range.end != -1){
         query.limit(limit);
      }

      // query.matchesQuery('User', userLocationQuery);
      if(location.city){
        query.matchesKeyInQuery("fromUser", "objectId", userLocationQuery);
      }else{
        query.limit(0);
      }
      
      query.find().then(function (mostSharedTrackArray) {

          var trackArray = [];
          for (var index in mostSharedTrackArray){
              trackArray.push(mostSharedTrackArray[index].get("toTrack"));
              console.log("favourite Track name: "+ trackArray[index].get("song_name"))
          }
          response.success(trackArray);

      }, function (error) {
          //Error finding groups
          response.error(error);
      });
});