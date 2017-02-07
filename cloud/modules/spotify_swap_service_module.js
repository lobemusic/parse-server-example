
var express = require("express"),
    app = express(),
    crypto = require('crypto'),
    buffer = require('buffer'),
    url = require('url');

var config = new Parse.Object("Config");
config.set("client_id", "20beb54968d44f1fbd9031b41d62160b");
config.set("client_secret", "72e1d63d879b49d1980ab38bce6d3245");
config.set("callback_url", "lobe://spotify/");
config.set("endpoint", "https://accounts.spotify.com");

var AUTH_HEADER = "Basic " + new buffer.Buffer(config.get("client_id") + ":" + config.get("client_secret")).toString("base64");

app.use(express.bodyParser());

app.post("/swap", function (req, res) {
    if (!req.body || !req.body.hasOwnProperty("code")) {
        res.status(550).send("Permission Denied");
        return;
    }

    var form_data = {
        "grant_type": "authorization_code",
        "redirect_uri": config.get("callback_url"),
        "code": req.body.code
    };

    Parse.Cloud.httpRequest({
        method: "POST",
        url: url.resolve(config.get("endpoint"), "/api/token"),
        headers: {
            "Authorization": AUTH_HEADER,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form_data,
        success: function(httpResponse) {
            if (httpResponse.status != 200) {
                res.status(550).send("Permission Denied");
                return;
            }

            var token_data = JSON.parse(httpResponse.text);

            res.status(200).set({
                "Content-Type": "application/json"
            }).send(token_data);
        },
        error: function(httpResponse) {
            res.status(500).send("Internal Server Error");
            return;
        }
    });
});

app.post("/refresh", function (req, res) {
    if (!req.body || !req.body.hasOwnProperty("refresh_token")) {
        res.status(550).send("Permission Denied");
        return;
    }

    var refresh_token = req.body.refresh_token;

    var form_data = {
        "grant_type": "refresh_token",
        "refresh_token": refresh_token
    };

    Parse.Cloud.httpRequest({
        method: "POST",
        url: url.resolve(config.get("endpoint"), "/api/token"),
        headers: {
            "Authorization": AUTH_HEADER,
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: form_data,
        success: function(httpResponse) {
            if (httpResponse.status != 200) {
                res.status(550).send("Permission Denied");
                return;
            }

            res.status(httpResponse.status).set({
                "Content-Type": "application/json"
            }).send(httpResponse.text);

        },
        error: function(httpResponse) {
            res.status(500).send("Internal Server Error");
            return;
        }
    });

});

app.post("/api/token", function (req, res) {

    res.status(200).set({
        "Content-Type": "application/json"
    });

    switch (req.body.grant_type) {
        case "authorization_code": {
            res.status(200).set({
                "Content-Type": "application/json"
            }).send({
                "refresh_token": "REFRESH TOKEN"
            });
        } break;
        case "refresh_token": {
            res.status(200).set({
                "Content-Type": "application/json"
            }).send({
                "access_token": "ACCESS TOKEN"
            });
        } break;
        default: {
            res.status(550).set({
                "Content-Type": "text/html"
            }).send("<html><body><h1>Access Denied</h1></body></html>");
        } break;
    }
});

app.listen();