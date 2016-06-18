var TwitchAPI = require('twitch-api');
var twitch = new TwitchAPI({
    clientId: 'pwsnvx4t4b3kz03u1t3359pjx81fz10',
    clientSecret: 'ngkv8v2dhh42lp1ao44aamos7lcceye',
    redirectUri: 'http://localhost:1337/auth_redirect',
    scopes: ['user_read', 'channel_read', 'chat_login']
});

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
                    res.redirect('/dashboard');
                }
            });
        }
    });
};
