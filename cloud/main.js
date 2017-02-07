

var moment = require("moment");
var backgroundJobModule = require('./modules/background_job_module.js');
var favoriteTrackModule = require('./modules/favorite_track_module.js');
var recentTrackModule = require('./modules/recent_track_module.js');
var pushModule = require('./modules/push_module.js');
var followModule = require('./modules/follow_module.js');
var activityModule = require('./modules/activity_module.js');
var groupModule = require('./modules/group_module.js');
var userModule = require('./modules/user_module.js');
var suggestionAlgoModule = require('./modules/suggestions_algo_module.js');
var lobeTrackModule = require('./modules/lobe_track_module.js');
var playlistModule = require('./modules/playlist_module.js');
var feedsModule = require('./modules/feeds_module.js');
var sharedTrackModule = require('./modules/most_shared_module.js');
var flagContentModule = require('./modules/flag_content_module.js');
var spotifyModule = require('./modules/spotify_module.js');
// var spotifySwapModule = require('cloud/modules/spotify_swap_service_module.js');
var lobeSnapsModule = require('./modules/lobe_snaps_module.js');


// Use Parse.Cloud.define to define as many cloud functions as you want.
// For example:
Parse.Cloud.define("hello", function(request, response) {
  response.success("Hello world!");
});

// Gets online user
Parse.Cloud.define("getOnlineUsers", function(request, response) {
    var userQuery = new Parse.Query(Parse.User);
    var activeSince = moment().subtract("minutes", 10).toDate();
    userQuery.greaterThan("lastActive", activeSince);
    userQuery.find().then(function (users) {
        response.success(users);
    }, function (error) {
        response.error(error);
    });
});

//temporary fix for most shared module








