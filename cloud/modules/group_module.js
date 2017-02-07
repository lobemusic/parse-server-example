
var moment = require("moment");
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

// Parse.Cloud.job("manageActiveGroups", function(request, response) {

//     var groupQuery = new Parse.Query("ActiveGroups");
//     var activeSince = moment().subtract("minutes", 10).toDate();
//     groupQuery.lessThan("lastActive", activeSince);
//     groupQuery.find().then(function (groups) {

//         for (i = 0; i < groups.length; i++) { 
//             var oldGroup = groups[i];

//             //Notify host of group 
//             // Parse.Cloud.run('groupInactionNotification',  {host_id:oldGroup.get("user_host_id"),group_id:oldGroup.get("objectId")}).then(function(result) {
//             //   }, function(error) {
//             //       // handle error
//             // });

//         }

//         response.success("Succes find groups");

//     }, function (error) {
//         //Error finding groups
//         response.error(error);
//     });
// });


Parse.Cloud.define("createParseActiveGroup", function(request, response) {

    var group_name = request.params.group_name
    var firebase_node = request.params.firebase_node
    var is_private = request.params.is_private
    var is_Location_restricted = request.params.is_Location_restricted
    var group_invite_ids = request.params.group_invite_ids
    var location = request.params.location
    var user_id = request.params.user_id

    var UserPointer = Parse.Object.extend("User")
    var fromUserPointer = new UserPointer()
    fromUserPointer.id = user_id

    var currentGroup = {}
    var ActiveGroup = Parse.Object.extend("ActiveGroups");

    //Directly creating a group
    var activeGroup = new ActiveGroup()
    if(group_name){
      activeGroup.set("group_name", group_name);
    }
    
    activeGroup.set("firebase_node", firebase_node);
    activeGroup.set("user_host", fromUserPointer);
    activeGroup.set("user_host_id", user_id);
    activeGroup.set("is_private", is_private);
    activeGroup.set("is_Location_restricted", is_Location_restricted);

    if (location){
      activeGroup.set("location", new Parse.GeoPoint({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude)}));
    }

    if(group_invite_ids){
      activeGroup.set("group_invites", group_invite_ids);
    }else{
      activeGroup.set("group_invites", []);
    }

    activeGroup.save().then(function(activeGroup) {
      currentGroup = activeGroup
      console.log("Group ID : " + activeGroup.id)
      return Parse.Cloud.run('addFeedForUser', { feed_target_type:"group_creation", user_id:user_id, feed_target_id:activeGroup.id })
      // return
    }).then(function(feed) {

      response.success(currentGroup)

    }, function(error) {
          // handle error
          console.log("Failed create group with error: " + error.message);
          response.error(error)
    });


    //Check if user is a host already before creating the group
    // var groupQuery = new Parse.Query(ActiveGroup);
    // groupQuery.equalTo('user_host_id', user_id);

    // groupQuery.first().then(function(active_group) {

    //   if(active_group){
          
    //       if(active_group.get("group_members")){
    //         var members = active_group.get("group_members");
    //         if(members.length < 1){
    //           active_group.set("group_members",[user_id])
    //           active_group.set("user_host",fromUserPointer)
    //           activeGroup.set("is_Location_restricted", is_Location_restricted);
    //           return active_group.save()
    //         }
    //       }
    //       return active_group
          
    //   }else{

    //     var activeGroup = new ActiveGroup()
    //     if(group_name){
    //       activeGroup.set("group_name", group_name);
    //     }
        
    //     activeGroup.set("firebase_node", firebase_node);
    //     activeGroup.set("user_host", fromUserPointer);
    //     activeGroup.set("user_host_id", user_id);
    //     activeGroup.set("is_private", is_private);
    //     activeGroup.set("is_Location_restricted", is_Location_restricted);

    //     if (location){
    //       activeGroup.set("location", new Parse.GeoPoint({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude)}));
    //     }

    //     if(group_invite_ids){
    //       activeGroup.set("group_invites", group_invite_ids);
    //     }else{
    //       activeGroup.set("group_invites", []);
    //     }

    //     return activeGroup.save() 

    //   }

    // }).then(function(activeGroup) {
    //   currentGroup = activeGroup
    //   console.log("Group ID : " + activeGroup.id)
    //   return Parse.Cloud.run('addFeedForUser', { feed_target_type:"group_creation", user_id:user_id, feed_target_id:activeGroup.id })
    //   // return
    // }).then(function(feed) {

    //   response.success(currentGroup)

    // }, function(error) {
    //       // handle error
    //       console.log("Failed create group with error: " + error.message);
    //       response.error(error)
    // });

});

Parse.Cloud.define("destroyParseActiveGroup", function(request, response) {

    var group_id = request.params.group_id
    // var user_id = request.params.user_id

    var currentGroup = {}
    var feed = {}
    var ActiveGroup = Parse.Object.extend("ActiveGroups");
    var groupQuery = new Parse.Query(ActiveGroup);
    // groupQuery.equalTo('objectId', group_id); 

    groupQuery.get(group_id).then(function(active_group) {

      if(active_group){
        currentGroup = active_group
        return active_group.destroy()
      }
      return

    }).then(function(active_group) {
      if (active_group) {console.log("Success destroy parse group!")}else{
        console.log("couldn't find active group to destroy")
      }
      
      var Feed = Parse.Object.extend("Feeds");
      var query = new Parse.Query(Feed);
      query.equalTo('feed_target_id', group_id)
      return query.first()

    }).then(function(feed_object) {
          
      if(feed_object){
        if(currentGroup.id){

          if(currentGroup.get("nb_total_tracks") > 5){

            var coverImage = currentGroup.get("group_cover_image")
            var nb_total_tracks = currentGroup.get("nb_total_tracks")
            feed_object.set("nb_total_tracks", nb_total_tracks);
            feed_object.set("group_cover_image", coverImage);
            return feed_object.save()
          }else{
            return feed_object.destroy()
          }

        }
      }
      return

    }).then(function(feed) {

      response.success("feed")

    }, function(error) {
          // handle error
          console.log("Failed destroy group with error: " + error.message);
          response.error(error)
    });

});

Parse.Cloud.define("addLocationRestrictionToGroup", function(request, response) {

    var group_id = request.params.group_id
    var location = request.params.location
    var is_Location_restricted = request.params.is_Location_restricted

    var activeGroup = Parse.Object.extend("ActiveGroups");
    var groupQuery = new Parse.Query(activeGroup);

    groupQuery.get(group_id).then(function(group) {

      group.set("is_Location_restricted", is_Location_restricted);
      group.set("location", new Parse.GeoPoint({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) }));

      return group.save()

      }).then(function(group) {
          
        response.success(group)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
    });

});

//Kill Inactive groups
Parse.Cloud.define("killInactiveGroups", function(request, response) {
    // killInactiveLobeGroups(request, response);

    var groupQuery = new Parse.Query("ActiveGroups");
    var activeSince = moment().subtract("minutes", 20).toDate();
    groupQuery.lessThan("lastActive", activeSince);
    groupQuery.find().then(function (groups) {
        for (i = 0; i < groups.length; i++) { 
            var oldGroup = groups[i];

            // if oldGroup.get('notify_for_delete') == true {
              oldGroup.destroy({
                success: function(myObject) {
                  // The object was deleted from the Parse Cloud.
                },
                error: function(myObject, error) {
                  // The delete failed.
                  // error is a Parse.Error with an error code and message.
                }
              });
            // }
        }

        response.success(groups);
    }, function (error) {
        response.error(error);
    });
});

// manageActiveGroupMembers
//=====================================================================================================

// Parse.Cloud.job("manageActiveGroupsMembersPresence", function(request, response) {

//     var groupQuery = new Parse.Query("ActiveGroups");
//     var activeSince = moment().subtract("minutes", 10).toDate();
//     groupQuery.lessThan("lastActive", activeSince);
//     groupQuery.find().then(function (groups) {

//         for (i = 0; i < groups.length; i++) { 
//             var oldGroup = groups[i];

//             //Notify host of group 
//             Parse.Cloud.run('groupInactionNotification',  {host_id:oldGroup.get("user_host_id"),group_id:oldGroup.get("objectId")}).then(function(result) {
//               }, function(error) {
//                   // handle error
//             });

//         }

//         response.success("Succes find groups");

//     }, function (error) {
//         //Error finding groups
//         response.error(error);
//     });
// });


//==============================================================================================================//
//                                              Parse Group management                                          //
//==============================================================================================================//

// Group interactions
//=================================================================================
// Update user Presence in group
Parse.Cloud.define("updateUserPresenceInGroup", function(request, response) {

    var user = request.params.user
    var groupPresence = Parse.Object.extend("GroupPresence");
    var groupPresenceQuery = new Parse.Query(groupPresence);

    // create user pointers
    var UserPointer = Parse.Object.extend("User");
    var fromUserPointer = new UserPointer();
    fromUserPointer.id = user.id;
    groupPresenceQuery.equalTo("fromUser", fromUserPointer);

    groupPresenceQuery.first({
      success: function(user) {
        // Successfully retrieved the object.
          user.set("lastActive", new Date());
          user.save().then(function (user) {
              response.success();
          }, function (error) {
              console.error(error);
              response.error(error);
          });
      },
      error: function(error) {
        alert("Error: " + error.code + " " + error.message);
      }
    });

});

Parse.Cloud.define("changeParseGroupHost", function(request, response) {

    var oldHost = request.params.oldHost
    var newHost = request.params.new_host
    var group = request.params.group
    
    //TODO: - Remo change this function
    var activeGroup = Parse.Object.extend("GroupPresence");
    var groupQuery = new Parse.Query(activeGroup);

    groupQuery.get(request.params.user_presence_id, {
        success: function(user_presence) {
          group.set("isHost", true);
          group.save().then(function (group) {
              response.success();
          }, function (error) {
              console.error(error);
              response.error(error);
          });
        },
        error: function(object, error) {
            console.error("fetch inactive group failed with error: " + error.message);
        }
    });
});

// Active group Tracks Interactions
//====================================================================================================

Parse.Cloud.define("addTrackToActiveGroupCollection", function(request, response) {

      var user_id = request.params.user_id
      var group_id = request.params.group_id
      var host_id = request.params.host_id
      var track_info = request.params.track_info
      var freebase_mids = request.params.freebase_mids

      // create user pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      var lobe_track_updated = {}

      Parse.Cloud.run('addTrackToLobeTracks', { track_info:track_info, freebase_mids:freebase_mids }).then(function(lobe_track) {

          console.log("addTrackToActiveGroupCollection: addTrackToLobeTracks")
          lobe_track_updated = lobe_track
          return Parse.Cloud.run('addTrackToActiveGroupTracks', { user_id:user_id, group_id:group_id, host_id:host_id, track_info:track_info, lobe_track_id:lobe_track.id })

      }).then(function(group_track_row) {
          
          console.log("addTrackToActiveGroupCollection: addTrackToActiveGroupTracks")
          return Parse.Cloud.run('updateUserMusicTastesScore', { user_id:user_id, song_type:"Pop"})

      }).then(function(user_rating) {
          
          console.log("addTrackToActiveGroupCollection: updateUserMusicTastesScore")
          return Parse.Cloud.run('addTrackToSharedTracks', { user_id:user_id, track_info:track_info, lobe_track_id:lobe_track_updated.id})

      }).then(function(shared_track_row) {
          
          console.log("addTrackToActiveGroupCollection: addTrackToSharedTracks")

          //Get Feed related to this group
          var Feed = Parse.Object.extend("Feeds");
          var query = new Parse.Query(Feed);
          query.equalTo('feed_target_id', group_id)
          return query.first()

      }).then(function(feed_object) {
            
        if(feed_object){

            var nb_new_tracks_added = feed_object.get("nb_new_tracks_added")
            if(nb_new_tracks_added){
              feed_object.set("nb_new_tracks_added", nb_new_tracks_added + 1);
            }else{
              feed_object.set("nb_new_tracks_added", 1);
            }
            return feed_object.save()
        }
        return

    }).then(function(feed) {

          response.success(lobe_track_updated);

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

Parse.Cloud.define("addTrackToActiveGroupTracks", function(request, response) {

      var user_id = request.params.user_id
      var group_id = request.params.group_id
      var host_id = request.params.host_id
      var lobe_track_id = request.params.lobe_track_id
      var track_info = request.params.track_info

      // create users pointers
      var UserPointer = Parse.Object.extend("User")
      var fromUserPointer = new UserPointer()
      fromUserPointer.id = user_id

      // create track pointer
      var LobeTrackObject = Parse.Object.extend("LobeTrack")
      var trackPointer = new LobeTrackObject()
      trackPointer.id = lobe_track_id

      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var activeGroupPointer = new ActiveGroup()
      activeGroupPointer.id = group_id
      
      var query = new Parse.Query(ActiveGroup);
      query.equalTo('fromGroup', activeGroupPointer)
      query.equalTo('to_track_id', lobe_track_id)
      query.equalTo('from_group_id', group_id)
      
      query.first().then(function(group_track) {

        if(group_track){
            
            console.log("Track already in user group_track ..")
            group_track.set("host_id",host_id);
            return group_track.save()

        }else{

            console.log("Adding track in user group_track ..")
            var GroupTrack = Parse.Object.extend("GroupTrack");
            var groupTrack = new GroupTrack();
            groupTrack.set("fromUser", fromUserPointer);
            groupTrack.set("from_user_id", user_id);
          
            groupTrack.set("fromGroup", activeGroupPointer);
            groupTrack.set("from_group_id", group_id);

            groupTrack.set("toTrack",trackPointer);
            groupTrack.set("to_track_id",lobe_track_id);

            groupTrack.set("host_id",host_id);

            return groupTrack.save()
        }

      }).then(function(group_track_row) {

        console.log("Success updating track for group")
        response.success(group_track_row)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchGroupTracks", function(request, response) {

      var group_id = request.params.group_id
      var range = request.params.range

      var GroupTrack = Parse.Object.extend("GroupTrack");
      var query = new Parse.Query(GroupTrack);
      query.equalTo('from_group_id', group_id)
      query.include("toTrack")

      query.skip(range.start)
      if(range && range.end != -1){
        var limit = range.end - range.start
        query.limit(limit)
      }
      
      query.find().then(function(group_track_rows) {

        console.log("group_track_rows count : " + group_track_rows.length)
        var group_track_array = []
        for (var index in group_track_rows){

            var group_track_row = group_track_rows[index]
            var lobe_track = group_track_row.get("toTrack")
            group_track_array.push(lobe_track)
        }

        response.success(group_track_array)
        console.log("group_track_array count : " + group_track_array.length)
        console.log("Success querying track for group : " + group_id)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});


Parse.Cloud.define("inviteUserToActiveGroup", function(request, response) {

      var group_id = request.params.group_id
      var user_id = request.params.user_id

      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var query = new Parse.Query(ActiveGroup);
      
      query.get(group_id).then(function(active_group) {

        if(active_group){
           console.log("found active_group")
          active_group.addUnique("group_invites", user_id);
          return active_group.save()
        }
        return

      }).then(function(active_group) {
        console.log(" ")
        response.success(active_group)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchNearbyGroupsForUser", function(request, response) {

      var user_id = request.params.user_id
      var location = request.params.location
      var locationGeoPoint = new Parse.GeoPoint({ latitude: location.latitude, longitude: location.longitude })

      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var query = new Parse.Query(ActiveGroup);
      query.limit(15);
      query.include("user_host");
      // query.equalTo('is_private', true)
      // query.equalTo('group_invites', user_id)
      query.near("location", locationGeoPoint);
      // query.withinMiles("location", locationGeoPoint, 25);
      
      query.find().then(function(active_private_groups) {

        response.success(active_private_groups)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchPrivateGroupsForUser", function(request, response) {

      var user_id = request.params.user_id
      var location = request.params.location
      var limit = request.params.limit
      var is_nearby = request.params.is_nearby
      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var query = new Parse.Query(ActiveGroup);
      query.equalTo('is_private', true)
      query.equalTo('group_invites', user_id)
      query.include("user_host");

      if(limit){
        query.limit(limit);
      }
      if((is_nearby == true) && location){
        var locationGeoPoint = new Parse.GeoPoint({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) })
        // query.near("location", locationGeoPoint);
        query.withinMiles("location", locationGeoPoint, 10);
      }
      
      query.find().then(function(active_private_groups) {

        response.success(active_private_groups)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchPublicGroups", function(request, response) {

      var location = request.params.location
      var limit = request.params.limit
      var is_nearby = request.params.is_nearby

      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var query = new Parse.Query(ActiveGroup);
      query.notEqualTo('is_private', true)
      query.include("user_host");
      // query.equalTo('is_private', false)
      if(limit){
        query.limit(limit);
      }

      if((is_nearby == true) && location ){
        var locationGeoPoint = new Parse.GeoPoint({ latitude: parseFloat(location.latitude), longitude: parseFloat(location.longitude) })
        // query.near("location", locationGeoPoint);
        query.withinMiles("location", locationGeoPoint, 10);
      }
      
      query.find().then(function(active_public_groups) {

        response.success(active_public_groups)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });
});

Parse.Cloud.define("fetchActiveGroupsForUser", function(request, response) {

      var user_id = request.params.user_id
      var location = request.params.location
      var limit = request.params.limit
      var is_nearby = request.params.is_nearby

      var user_groups = {}
      Parse.Cloud.run('fetchPrivateGroupsForUser', { user_id:user_id,location:location, is_nearby:is_nearby}).then(function(active_private_groups) {

          user_groups["private"] = active_private_groups
          return Parse.Cloud.run('fetchPublicGroups', {location:location, is_nearby:is_nearby})

      }).then(function(active_public_groups) {
          user_groups["public"] = active_public_groups
          response.success(user_groups)

      }, function(error) {
            // handle error
            console.error(error.message);
            response.error(error)
      });
});

//-------------- Custom functions ----------------//

function killInactiveLobeGroups(request,response) {

    var groupQuery = new Parse.Query("ActiveGroups");
    var activeSince = moment().subtract("minutes", 20).toDate();
    groupQuery.lessThan("lastActive", activeSince);
    groupQuery.find().then(function (groups) {
        for (i = 0; i < groups.length; i++) { 
            var oldGroup = groups[i];

            // if oldGroup.get('notify_for_delete') == true {
              oldGroup.destroy({
                success: function(myObject) {
                  // The object was deleted from the Parse Cloud.
                },
                error: function(myObject, error) {
                  // The delete failed.
                  // error is a Parse.Error with an error code and message.
                }
              });
            // }
        }

        response.success(groups);
    }, function (error) {
        response.error(error);
    });
}

Parse.Cloud.define("addUserToActiveGroup", function(request, response) {

      var group_id = request.params.group_id
      var user_id = request.params.user_id
      var username = request.params.username
      var user_profile_pic = request.params.user_profile_pic

      //create a groupPointer
      var ActiveGroup = Parse.Object.extend("ActiveGroups");
      var query = new Parse.Query(ActiveGroup);
      var activeGroup = {}
      query.get(group_id).then(function(active_group) {

        if(active_group){
          var Feed = Parse.Object.extend("Feeds");
          var query = new Parse.Query(Feed);
          query.equalTo('feed_target_id', group_id)
          return query.first()
        }
        return

      }).then(function(feed_object) {
          
          if(feed_object){
            feed_object.addUnique("group_members", {
              user_id:user_id,
              username:username,
              user_profile_pic:user_profile_pic
            });
            return feed_object.save()
          }
          return

      }).then(function(feed_object) {

        response.success(activeGroup)

      }, function(error) {
            // handle error
            console.log(error);
            response.error(error)
      });

});


// Update group notify status to true on Parse
function updateGroupNotifyStatus(request,response) {

    var activeGroup = Parse.Object.extend("ActiveGroups");
    var groupQuery = new Parse.Query(activeGroup);

    groupQuery.get(request.params.group_id, {
        success: function(group) {
          group.set("notify_for_delete", true);
          group.save().then(function (group) {
              response.success();
          }, function (error) {
              console.error(error);
              response.error(error);
          });
        },
        error: function(object, error) {
            console.error("fetch inactive group failed with error: " + error.message);
        }
    });
}