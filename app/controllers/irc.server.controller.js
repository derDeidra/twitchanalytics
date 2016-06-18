var irc = require('irc');
var clients = {};

exports.createIrcClient = function(auth_token, username){
    var config = {
        server: 'irc.chat.twitch.tv',
        userName: username,
        nick: username,
        password: 'oauth:' + auth_token,
        autoConnect: false
    };

    var client = new irc.Client(config.server, config.nick, config);

    clients[auth_token] = client;
};

exports.destroyIrcClient = function(auth_token){
    clients[auth_token] = null;
};

exports.connectIrcClient = function(auth_token, success){
    clients[auth_token].connect(2,function(){
        console.log('Successfully created IRC connection');
        success('connect', auth_token);
    });
};

exports.disconnectIrcClient = function(auth_token, success){
    clients[auth_token].disconnect(function(){
        success('disconnect', auth_token);
    });
};

exports.joinIrcChannel = function(auth_token, channel_name, success){
    clients[auth_token].join('#' + channel_name, function(){
        success('join', auth_token);
    });
};

exports.leaveIrcChannel = function(auth_token, channel_name, success){
    clients[auth_token].part('#' + channel_name, function(){
        success('part', auth_token);
    });
};

exports.addIrcListener = function(auth_token, key, callback){
    clients[auth_token].addListener(key,callback);
};
