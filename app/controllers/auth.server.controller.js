var config = require('config');
var TwitchAPI = require('twitch-api');
var twitch = new TwitchAPI(config.get('twitchapi'));
var authAdmins = config.get('authorizedAdmins');

exports.initialize = function(req, res) {
    var auth_url = twitch.getAuthorizationUrl();
    res.redirect(auth_url);
};

exports.handleRedirect = function(req, res) {
    twitch.getAccessToken(req.query.code, function(err, body){
        if (err){
            console.log(err);
            res.redirect('/');
        } else {
            console.log('Got access token ' + body.access_token);
            twitch.getAuthenticatedUserChannel(body.access_token, function(err, channel_data){
                if(err){
                    res.redirect('/');
                } else {
                    console.log('Got channel information for user: ' + channel_data.display_name);
                    req.session.display_name = channel_data.display_name;
                    req.session.auth_token = body.access_token;
                    res.redirect('/live');
                }
            });
        }
    });
};

exports.accessRedirect = function(req, res, next){
    if(req.session.display_name){
        res.redirect('/dashboard');
    } else {
        next();
    }
};

exports.accessControl = function(req, res, next){
    if(req.session.display_name){
        next();
    } else {
        res.redirect('/');
    }
};

exports.adminAccessControl = function(req, res, next){
    if(req.session.display_name){
        if(authAdmins.includes(req.session.display_name)){
            next();
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/');
    }
};
