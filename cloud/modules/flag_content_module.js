Parse.Cloud.define("flagTrack", function(request, response) {

      var flag_code = request.params.flag_code
      var user_id = request.params.user_id
      var song_uid = request.params.song_uid

      Parse.Cloud.run('fetchLobeTrack', { 

        song_uid:song_uid 

      }).then(function(lobe_track) {

          console.log("success fetchLobeTrack")
          var flag_type = ""

          switch(flag_code) {

            case 1:
              flag_type = "Sexual Content"
                break;
            case 2:
              flag_type = "Violence"
              break;
            case 3:
              flag_type = "Bad song"
              break;
            case 4:
              flag_type = "Innapropriate"
              break;
            default:
                flag_type = ""
                 break
          }


          var UserPointer = Parse.Object.extend("User")
          var fromUserPointer = new UserPointer()
          fromUserPointer.id = user_id

          var FlagPointer = Parse.Object.extend("Flag")
          var toFlagPointer = new FlagPointer()
          toFlagPointer.id = user_id

          var FlagReport = Parse.Object.extend("FlagReport")
          var flagReportObject = new FlagReport()

          flagReportObject.set("fromUser", fromUserPointer);
          flagReportObject.set("toFlag", toFlagPointer);
          flagReportObject.set("flag_code", flag_code);
          flagReportObject.set("type",flag_type);
          flagReportObject.set("toTrack",lobe_track);
          flagReportObject.set("to_track_id",lobe_track.id);

          return flagReportObject.save()

      }).then(function(flag_report_object) {
          
          response.success(flag_report_object);

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("fetchflaggedTrackIds", function(request, response) {

    var flag_code = request.params.flag_code
    var query = new Parse.Query("FlagReport");
    if(flag_code && flag_code != -1){

      query.equalTo('flag_code', flag_code)
    }
    
    query.find().then(function(flag_report_array) {
      
        var trackIdsArray = [];
        for (var index in flag_report_array){

          var track_id = flag_report_array[index].get("to_track_id")
          trackIdsArray.push(track_id);
        }

      response.success(trackIdsArray);

    }, function(error) {
        // handle error
        console.error(error.message);
        response.error(error)
    });

});

Parse.Cloud.define("fetchFlags", function(request, response) {

      var Flag = Parse.Object.extend("Flag");
      var query = new Parse.Query(Flag);
      query.find().then(function(flag_list) {

        response.success(flag_list)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});


Parse.Cloud.define("fetchFlagTracks", function(request, response) {

      var flag_code = request.params.flag_code
      var range = request.params.range

      Parse.Cloud.run('fetchflaggedTrackIds', {flag_code:flag_code}).then(function(flagged_track_ids) {

          var LobeTrack = Parse.Object.extend("LobeTrack");
          var query = new Parse.Query(LobeTrack);
          query.containedIn('objectId', flagged_track_ids);

          if (range && (range.end =! -1)){

            var limit = range.end - range.start
            query.skip(range.start)
            query.limit(limit);

          }
          return query.find()

      }).then(function(lobe_tracks) {

        response.success(lobe_tracks)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchflaggedTracks", function(request, response) {

    // var flag_code = request.params.flag_code
    var query = new Parse.Query("FlagReport");
    // query.equalTo('song_uid', song_uid)

    query.find().then(function(flag_report_array) {
      
        var trackIdsArray = [];
        for (var index in flag_report_array){

          var track_id = flag_report_array[index].get("to_track_id")
          trackIdsArray.push(track_id);
        }

      response.success(trackIdsArray);

    }, function(error) {
        // handle error
        console.error(error.message);
        response.error(error)
    });

});