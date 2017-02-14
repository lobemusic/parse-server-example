
Parse.Cloud.define("recoverOldUserData", function(request, response) {

    testRecover(request);

    function testRecover(request) {

        function operationSuccess() {
            //console.log("operationFailed failed");
            //console.log(error);
            //console.log("Recovery Succeded");
            response.success("We retrieved your old data");
        }

        function operationFailed(error) {
            //console.log("Recovery failed");
            //console.log(error);
            response.error("Failed to retrieve your old data " + error + " we will fix this soon. email us: lobe.appymood@gmail.com");
        }

        var userEmail = request.params.email;
        var newUserObjectUid = request.params.newUserObjectId;
        var oldUserObjectUid = null;
        var currUserObj = null;
        var limit = request.params.limit || 5;

        getOldUserObjectId();

        function getOldUserObjectId() {

            //oldUserObjectUid = "cyn6831Hxs";
            //getCurrUserObj();
            var User = Parse.Object.extend("userOld");
            var query = new Parse.Query(User);
            query.equalTo('email', userEmail)

            query.first({
                success: function (user) {
                    oldUserObjectUid = user.id;
                    getCurrUserObj();
                },
                error: function (error) {
                    operationFailed(error);
                }
            });
        }

        function getCurrUserObj(email) {
            // if (username.indexOf("@") >= 0){ // login with email

            var User = Parse.Object.extend("User");
            var query = new Parse.Query(User);
            query.equalTo('email', userEmail)

            query.first({
                success: function (user) {
                    currUserObj = user;
                    updateAllFavoriteTracks();
                    // call update all palaylists
                },
                error: function (error) {
                    operationFailed(error);
                }
            });
            //}
        }

        function updateAllFavoriteTracks() {
            var FavouriteTrackOld = Parse.Object.extend("FavouriteTrack_old");
            var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
            var LobeTrack = Parse.Object.extend("LobeTrack");
            var LobeTrackOld = Parse.Object.extend("LobeTrack_old");
            var query = new Parse.Query(FavouriteTrackOld);


            query.equalTo("from_user_id", oldUserObjectUid);
            // query.include("toTrack");
            query.descending("createdAt");
            query.limit(limit);


            query.find({
                success: function (favouriteTrackArray) {
                    console.log("favouriteTrackArray count:" + favouriteTrackArray.length);
                    var recoveredSuccessCount = 0;
                    var recoveredFailedCount = 0;
                    var totalToRecover = favouriteTrackArray.length;

                    for (var index in favouriteTrackArray){
                        var parseObj = favouriteTrackArray[index];
                        //parseObj.set("fromUser", currUserObj);
                        //arseObj.set("from_user_id", newUserObjectUid);

                        var query = new Parse.Query(LobeTrackOld);
                        query.equalTo("song_name", parseObj.get("song_name")); // orobject id
                        query.first({
                            success: function (trackRow) {
                                helper_parse_api.getInstance().addTrackToFavorite(mMyInfo.id, null, trackRow.get("track_info"), function(isSuccess, result) {
                                    if (isSuccess) {
                                        recoveredSuccessCount++;
                                        console.log('Recovered 1 favorite track, id:' + result);
                                    } else {
                                        recoveredFailedCount++
                                        console.log('Failed to recover 1 favorite track, id:' + result);
                                    }
                                    checkDone();
                                });
                            },
                            error: function (error) {
                                operationFailed(error);
                            }
                        });

                        // using cloud code


                        // addingstraigh in favorite
                        //    var newFavRow = new FavouriteTrack();
                        //    newFavRow.set("song_artist", parseObj.get("song_artist"));
                        //    newFavRow.set("song_name", parseObj.get("song_name"));
                        //    newFavRow.set("fromUser", currUserObj);
                        //    newFavRow.set("from_user_id", newUserObjectUid);
                        //    newFavRow.set("to_track_id", parseObj.get("to_track_id"))
                        //
                        //    var lobeTrack = new LobeTrack();
                        //    lobeTrack.id =  parseObj.get("to_track_id");
                        //    newFavRow.set("toTrack", lobeTrack);
                        //
                        //    newFavRow.save(null, {
                        //        success: function(fav_track) {
                        //            recoveredSuccessCount++;
                        //            // Execute any logic that should take place after the object is saved.
                        //            console.log('Recovered 1 favorite track, id:' + fav_track.id);
                        //            checkDone();
                        //        },
                        //        error: function(fav_track, error) {
                        //            recoveredFailedCount++
                        //            console.log('Failed to recover 1 favorite track, id:' + fav_track.id);
                        //            checkDone();
                        //        }
                        //    });

                    }
                    function checkDone() {
                        if (recoveredSuccessCount + recoveredFailedCount >= totalToRecover) {
                            console.log('Recovered: ' + recoveredSuccessCount + ", Failed Count : " + recoveredFailedCount);
                            operationSuccess();
                        }
                    }

                },
                error: function (error) {
                    operationFailed(error);
                }
            });
        }

    }

    //var userEmail = request.params.email;
    //var newUserObjectUid = request.params.newUserObjectId;
    //var oldUserObjectUid = null;
    //var currUserObj = null;
    //
    //getOldUserObjectId(email);
    //
    //function getOldUserObjectId(email) {
    //    if (username.indexOf("@") >= 0){ // login with email
    //        var User = Parse.Object.extend("old_Users");
    //        var query = new Parse.Query(User);
    //        query.equalTo('email', userEmail)
    //
    //        query.first({
    //            success: function (user) {
    //                oldUserObjectUid = user.get("objectId");
    //                getCurrUserObj();
    //            },
    //            error: function (error) {
    //                operationFailed(error);
    //            }
    //        });
    //    }
    //}
    //
    //function getCurrUserObj(email) {
    //    if (username.indexOf("@") >= 0){ // login with email
    //
    //        var User = Parse.Object.extend("User");
    //        var query = new Parse.Query(User);
    //        query.equalTo('email', userEmail)
    //
    //        query.first({
    //            success: function (user) {
    //                currUserObj = user;
    //                updateAllFavoriteTracks();
    //                // call update all palaylists
    //            },
    //            error: function (error) {
    //                operationFailed(error);
    //            }
    //        });
    //    }
    //}
    //
    //function updateAllFavoriteTracks() {
    //    var FavouriteTrack = Parse.Object.extend("FavouriteTrack");
    //    var query = new Parse.Query(FavouriteTrack);
    //
    //    // query.equalTo("fromUser", user);
    //    query.include('fromUser');
    //    //query.include('toTrack');
    //    query.containedIn("from_user_id", oldUserObjectUid);
    //    query.descending("updatedAt");
    //    //query.limit(limit);
    //
    //    query.find({
    //        success: function (favouriteTrackArray) {
    //            console.log("favouriteTrackArray count:" + favouriteTrackArray.length)
    //            var recoveredSuccessCount = 0;
    //            var recoveredFailedCount = 0;
    //
    //            for (var index in favouriteTrackArray){
    //                var parseObj = favouriteTrackArray[index];
    //                parseObj.set("fromUser", currUserObj);
    //                parseObj.set("from_user_id", newUserObjectUid);
    //                parseObj.save(null, {
    //                    success: function(fav_track) {
    //                        recoveredSuccessCount++;
    //                        // Execute any logic that should take place after the object is saved.
    //                        console.log('Recovered 1 favorite track, id:' + fav_track.id);
    //                    },
    //                    error: function(fav_track, error) {
    //                        recoveredFailedCount++
    //                        console.log('Failed to recover 1 favorite track, id:' + fav_track.id);
    //                    }
    //                });
    //
    //            }
    //            console.log('Recovered: ' + recoveredSuccessCount + ", Failed Count : " + recoveredFailedCount);
    //        },
    //        error: function (error) {
    //            operationSuccess(error);
    //        }
    //    });
    //}
    //
    //function operationSuccess(error) {
    //    //console.log("operationFailed failed");
    //    //console.log(error);
    //    response.success("We retrieved your old data");
    //}
    //
    //function operationFailed(error) {
    //    console.log("operationFailed failed");
    //    console.log(error);
    //    response.error(error);
    //}
    //


});

