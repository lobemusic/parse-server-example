var express = require("express"),
    app = express(),
    crypto = require('crypto'),
    buffer = require('buffer'),
    url = require('url');

/**
 * Load needed modules.
 */
var querystring = require('querystring');
var _ = require('underscore');
var Buffer = require('buffer').Buffer;


/**
 * GitHub specific details, including application id and secret
 */
var clientId = '20beb54968d44f1fbd9031b41d62160b';
var clientSecret = '72e1d63d879b49d1980ab38bce6d3245';
var endpoint = "https://accounts.spotify.com"
var callback_url = "lobe://spotify/"
var clientIdAndSecret =  clientId + ":" + clientSecret
var AUTH_HEADER = "Basic " + new Buffer(clientIdAndSecret).toString("base64");

// var githubRedirectEndpoint = 'https://github.com/login/oauth/authorize?';
// var githubValidateEndpoint = 'https://github.com/login/oauth/access_token';
var spotifyUserInfoEndpoint = 'https://api.spotify.com/v1/me';

/**
 * In the Data Browser, set the Class Permissions for these 2 classes to
 *   disallow public access for Get/Find/Create/Update/Delete operations.
 * Only the master key should be able to query or write to these classes.
 */
var TokenRequest = Parse.Object.extend("TokenRequest");
var TokenStorage = Parse.Object.extend("TokenStorage");

/**
 * Create a Parse ACL which prohibits public access.  This will be used
 *   in several places throughout the application, to explicitly protect
 *   Parse User, TokenRequest, and TokenStorage objects.
 */
var restrictedAcl = new Parse.ACL();
restrictedAcl.setPublicReadAccess(false);
restrictedAcl.setPublicWriteAccess(false);

/**
 * Logged in route.
 *
 * JavaScript will validate login and call a Cloud function to get the users
 *   GitHub details using the stored access token.
 */


/**
 * Connect a parse user to a spotify account
 */

Parse.Cloud.define('loginWithSpotify', function(request, response) {

  var access_token = request.params.access_token
  var os_type = request.params.os_type
  var encrypted_refresh_token = request.params.encrypted_refresh_token
  var canonical_username = request.params.canonical_username
  var expiration_date = request.params.expiration_date
  var userData = {}
  var tokenData = {}
  console.log("encrypted_refresh_token" + encrypted_refresh_token)

  Parse.Promise.as().then(function() {

    if(os_type == "ios"){
      tokenData.access_token = access_token
      tokenData.refresh_token = encrypted_refresh_token
      return tokenData
    }else if(os_type == "android"){
      return Parse.Cloud.run('refreshAndroidSpotifyTokenData', { code:encrypted_refresh_token })
    }

  }).then(function(token_data) {
    tokenData = token_data
    console.log("success getting token data" + token_data.access_token)
    return getUserDetails(token_data.access_token);

  }).then(function(user_data) {
      userData = user_data
      var spotifyAuthData = {

          "userId": userData.data.id,
          "access_token": tokenData.access_token,
          "refresh_token":tokenData.refresh_token,
          "expiration_date": expiration_date,
          // "encrypted_refresh_token":encrypted_refresh_token,
          "userData":userData
      };

    return updateSpotifyUser(spotifyAuthData, userData)
// 
  }).then(function(user) {

    response.success(user);
  }, function(error) {
    console.log("error login with spotify: " + error)
    response.error(error);
  });

});

/**
 * Connect a spotify account to a parse user
 */

Parse.Cloud.define('linkParseUserToSpotify', function(request, response) {

  var os_type = request.params.os_type
  var encrypted_refresh_token = request.params.encrypted_refresh_token
  var canonical_username = request.params.canonical_username
  var expiration_date = request.params.expiration_date
  var user_id = request.params.user_id
  var access_token = request.params.access_token
  var currentUser = {}
  var userData = {}
  var tokenData = {}

  var User = Parse.Object.extend("User");
  var query = new Parse.Query(User);
  console.log("user_id", user_id)
  query.equalTo('objectId', user_id)

  query.first({ useMasterKey: true }).then(function(user) {
    console.log("linkParseUserToSpotify 1")
    currentUser = user
    // If no refresh token provide => We want to update a current user access token
    console.log("linkParseUserToSpotify encrypted_refresh_token: " + encrypted_refresh_token)
    if(!encrypted_refresh_token){

        encrypted_refresh_token = currentUser.get("spotify_auth_data").refresh_token
        return Parse.Cloud.run('refreshIOSSpotifyTokenData', { code:encrypted_refresh_token })
        
    }else{

        if(os_type == "ios"){
          tokenData.access_token = access_token
          tokenData.refresh_token = encrypted_refresh_token
          return tokenData
        }else if(os_type == "android"){
          return Parse.Cloud.run('refreshAndroidSpotifyTokenData', { code:encrypted_refresh_token })
        }
    }

  }).then(function(token_data) {

    console.log("linkParseUserToSpotify 2")
    tokenData = token_data
    console.log("success getting token data" + token_data.access_token)
    return getUserDetails(token_data.access_token);

  }).then(function(user_data) {
    console.log("linkParseUserToSpotify 3")
      userData = user_data
      var spotifyAuthData = {

          "userId": userData.data.id,
          "access_token": tokenData.access_token,
          "refresh_token":tokenData.refresh_token,
          "expiration_date": expiration_date,
          "userData":userData
      };

      currentUser.set('spotify_auth_data', spotifyAuthData);
      return currentUser.save()
      
      // return updateSpotifyUser(spotifyAuthData, userData)

  }).then(function(user) {
    console.log("linkParseUserToSpotify 4")
    response.success(user);
  }, function(error) {
    console.log("error login with spotify: " + error)
    response.error(error);
  });

});

Parse.Cloud.define('updateSpotifyAccessToken', function(request, response) {

  var user_id = request.params.user_id
  var os_type = request.params.os_type

  Parse.Promise.as().then(function() {
    // updating an existing user or linking a user is the same thing
    return Parse.Cloud.run('linkParseUserToSpotify', { user_id:user_id,os_type:os_type})

  }).then(function(user) {

    response.success(user);

  },function(error) {

    response.error(error);

  });
  
});

Parse.Cloud.define('refreshSpotifyTokenData', function(request, response) {

    console.log("refreshSpotifyTokenData 1")

    var access_token = request.params.access_token
    var params = {client_id:clientId,response_type:"code",redirect_uri:callback_url}
    Parse.Promise.as().then(function() {

      var form_data = {
        "grant_type": "authorization_code",
        "redirect_uri": callback_url,
        "code": access_token
      };

      return  Parse.Cloud.httpRequest({

        method: "POST",
        url: url.resolve(endpoint, "/api/token"),
        headers: {
            "Authorization": AUTH_HEADER,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form_data

      })

    }).then(function(httpResponse) {

      console.log("refreshSpotifyTokenData 2")
      var token_data = JSON.parse(httpResponse.text);
      response.success(token_data);

    },function(httpResponse) {

      response.error(httpResponse);

    });
  
});

Parse.Cloud.define('refreshAndroidSpotifyTokenData', function(request, response) {

console.log("called refreshAndroidSpotifyTokenData")
  var code = request.params.code
  Parse.Promise.as().then(function() {

      var form_data = {
        "code": code
      };

      return  Parse.Cloud.httpRequest({

        method: "POST",
        url: "https://spotify-lobe-swap-service.herokuapp.com/androidSwap",
        body: form_data

      })

    }).then(function(httpResponse) {
      console.log("success refreshAndroidSpotifyTokenData" + httpResponse.text)
      var token_data = JSON.parse(httpResponse.text);
      response.success(token_data);

    },function(httpResponse) {
      console.log("error refreshAndroidSpotifyTokenData" + httpResponse.text)
      response.error(httpResponse);

    });
  
});

Parse.Cloud.define('refreshIOSSpotifyTokenData', function(request, response) {

  var refresh_token = request.params.code
  Parse.Promise.as().then(function() {

      var form_data = {
        "refresh_token": refresh_token
      };

      return  Parse.Cloud.httpRequest({

        method: "POST",
        url: "https://spotify-lobe-swap-service.herokuapp.com/refresh",
        body: form_data

      })

    }).then(function(httpResponse) {


      var token_data = JSON.parse(httpResponse.text);
      response.success(token_data);


    },function(httpResponse) {

      response.error(httpResponse);

    });
  
});

/**
 * Cloud function which will load a user's accessToken from TokenStorage and
 * request their details from GitHub for display on the client side.
 */
Parse.Cloud.define('getSpotifyUserData', function(request, response) {
  if (!request.user) {
    return response.error('Must be logged in.');
  }
  var query = new Parse.Query(TokenStorage);
  query.equalTo('user', request.user);
  query.ascending('createdAt');
  Parse.Promise.as().then(function() {
    return query.first({ useMasterKey: true });
  }).then(function(tokenData) {
    if (!tokenData) {
      return Parse.Promise.error('No GitHub data found.');
    }
    return getUserDetails(tokenData.get('accessToken'));
  }).then(function(userDataResponse) {
    var userData = userDataResponse.data;
    response.success(userData);
  }, function(error) {
    response.error(error);
  });
});

/**
 * This function is called when GitHub redirects the user back after
 *   authorization.  It calls back to GitHub to validate and exchange the code
 *   for an access token.
 */
var refreshSpotifyAccessToken = function(code) {

  return Parse.Cloud.httpRequest({
    method: 'GET',
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  });
}

/**
 * This function calls the githubUserEndpoint to get the user details for the
 * provided access token, returning the promise from the httpRequest.
 */
var getUserDetails = function(accessToken) {

  return Parse.Cloud.httpRequest({
    method: 'GET',
    url: spotifyUserInfoEndpoint,
    headers: { 'Authorization': 'Bearer ' + accessToken },
    json: true
  });
}


/**
 * This function checks to see if this GitHub user has logged in before.
 * If the user is found, update the accessToken (if necessary) and return
 *   the users session token.  If not found, return the newGitHubUser promise.
 */
var updateSpotifyUser = function(spotifyAuthData, spotifyUserData) {

  var query = new Parse.Query(TokenStorage);
  // query.equalTo('spotify_uuid', spotifyUserData.uuid);
  query.equalTo('spotifyUserId', spotifyUserData.data.id);
  query.ascending('createdAt');
  var password;
  // Check if this githubId has previously logged in, using the master key
  return query.first({ useMasterKey: true }).then(function(tokenData) {
    // If not, create a new user.
    if (!tokenData) {
      return newSpotifyUser(spotifyAuthData, spotifyUserData);
    }
    // If found, fetch the user.
    var user = tokenData.get('user');
    return user.fetch({ useMasterKey: true }).then(function(user) {
      // Update the accessToken if it is different.
      if (spotifyAuthData.access_token !== tokenData.get('accessToken')) {
        tokenData.set('accessToken', spotifyAuthData.access_token);
        // tokenData.set('refreshToken', spotifyAuthData.refresh_token);
        spotifyAuthData.userId = spotifyUserData.data.id
        user.set('spotify_auth_data', spotifyAuthData);
        user.save();
      }
      /**
       * This save will not use an API request if the token was not changed.
       * e.g. when a new user is created and upsert is called again.
       */
      return tokenData.save(null, { useMasterKey: true });
    }).then(function(obj) {

		password = new Buffer(24);
		_.times(24, function(i) {
			password.set(i, _.random(0, 255));
		});
		password = password.toString('base64')
		user.setPassword(password);
		return user.save(null, { useMasterKey: true });
    }).then(function(user) {
		return Parse.User.logIn(user.get('username'), password);
    }).then(function(user) {
     // Return the user object.
      return Parse.Promise.as(user);
    });
  });
}

/**
 * This function creates a Parse User with a random login and password, and
 *   associates it with an object in the TokenStorage class.
 * Once completed, this will return upsertGitHubUser.  This is done to protect
 *   against a race condition:  In the rare event where 2 new users are created
 *   at the same time, only the first one will actually get used.
 */
var newSpotifyUser = function(spotifyAuthData, spotifyUserData) {

  var user = new Parse.User();
  // Generate a random username and password.
  var username = new Buffer(24);
  var password = new Buffer(24);
  _.times(24, function(i) {
    username.set(i, _.random(0, 255));
    password.set(i, _.random(0, 255));
  });
  spotifyAuthData.userId = spotifyUserData.data.id
  user.set("username", spotifyUserData.data.display_name + " Spotify");
  user.set("profile_picture_url", spotifyUserData.data.images[0].url);
  user.set("password", spotifyUserData.data.id);
  user.set("spotify_auth_data", spotifyAuthData);
  // user.set("email", spotifyUserData.data.email);
  user.set("country_short", spotifyUserData.data.country);
  // Sign up the new User
  return user.signUp().then(function(user) {
    // create a new TokenStorage object to store the user+GitHub association.
    updateTagsToParseUser(user, user.get("username")) //For search
    var ts = new TokenStorage();
    ts.set('spotifyUuid', spotifyUserData.uuid);
    ts.set('spotifyUserId', spotifyUserData.data.id);
    ts.set('tokenExpirationDate', spotifyAuthData.expiration_date);
    ts.set('accessToken', spotifyAuthData.access_token);
    ts.set('refreshToken', spotifyAuthData.refresh_token);
    ts.set('user', user);
    ts.setACL(restrictedAcl);
    // Use the master key because TokenStorage objects should be protected.
    return ts.save(null, { useMasterKey: true });
  }).then(function(tokenStorage) {
    return updateSpotifyUser(spotifyAuthData, spotifyUserData);
  });
}

function updateTagsToParseUser(user, name) {
    var tags = name.split(" ");
    for (var index in tags)
    {
        var tag = tags[index];
        if (tag && tag !== " ")
        {
            //  alert("tag: " + tag.toLowerCase());
            user.addUnique("tags", tag.toLowerCase());
        }
    }
}

