var config = require('config');
var TwitchAPI = require('twitch-api');
var twitch = new TwitchAPI(config.get('twitchapi'));
var authAdmins = config.get('authorizedAdmins');
var User = require('../schema').User

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
            console.log('[AUTH] Got access token ' + body.access_token);
            twitch.getAuthenticatedUser(body.access_token, function(err, user_data){
                if(err){
                    console.log('[AUTH] Error: Unable to access authenticated user object for auth token ' + body.access_token);
                    res.redirect('/');
                } else {
                    console.log('[AUTH] Got channel information for user: ' + user_data.display_name);
                    req.session.display_name = user_data.display_name;
                    req.session.auth_token = body.access_token;
                    User.findOne({username : user_data.display_name}, function(err, user){
                        if(err){
                            console.log("[AUTH] Error getting user object for " + user_data.display_name);
                        } else {
                            if(user != null){
                                User.update({_id : user._id}, {auth : body.access_token});
                            } else {
                                User.create({username : user_data.display_name, auth : body.access_token, tasks : []});
                            }
                        }
                    });
                    res.redirect('/live');
                }
            });
        }
    });
};

exports.accessRedirect = function(req, res, next){
    if(req.session.display_name){
        res.redirect('/live');
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
        if(authAdmins.indexOf(req.session.display_name) >= 0){
            next();
        } else {
            res.redirect('/');
        }
    } else {
        res.redirect('/');
    }
};

exports.logout = function(req, res){
    req.session.destroy();
    res.redirect('/');
};
