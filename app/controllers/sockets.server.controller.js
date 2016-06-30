var io;
var irc = require('./irc.server.controller');
var sockets = {};
var idtoauth = {};

function createClient(data){
    console.log('[SOCKETS] Creating client for ' + data.display_name);
    irc.createIrcClient(data.auth_token, data.display_name);
    irc.connectIrcClient(data.auth_token, emitSuccess);
}

function destroyClient(data){
    console.log('[SOCKETS] Destroying client for ' + data.auth_token);
    irc.disconnectIrcClient(data.auth_token, emitSuccess);
    irc.destoryIrcClient(data.auth_token);
}

function joinChannel(data){
    console.log('[SOCKETS] Joining channel ' + data.channel + ' for ' + data.auth_token);
    irc.joinIrcChannel(data.auth_token, data.channel, emitSuccess);
}

function leaveChannel(data){
    console.log('[SOCKETS] Leaving ' + data.channel + ' for ' + data.auth_token);
    irc.leaveIrcChannel(data.auth_token, data.channel, emitSuccess);
}

function listen(data){
    console.log('[SOCKETS] Listening on channel ' + data.channel + ' for ' + data.auth_token);
    irc.addIrcListener(data.auth_token, 'message#' + data.channel, function(from, text, message){
        if(sockets[data.auth_token])
            sockets[data.auth_token].emit(data.auth_token + '-' + data.channel + '-message', {from : from, text: text, message: message});
    });
}

function emitSuccess(area, auth_token){
    var event = auth_token + '-success-' + area;
    if(sockets[auth_token])
        sockets[auth_token].emit(event, {status : 1});
    else {
        console.log("[SOCKETS] " + event);
    }
}

function setupSocket(socket){
    console.log('[SOCKETS] Socket connection achieved');
    socket.on('authenticate', function(data){
        sockets[data.auth_token] = socket;
        idtoauth[socket.id] = data.auth_token;
    });
    socket.on('create-client', createClient);
    socket.on('destroy-client', destroyClient);
    socket.on('join-channel', joinChannel);
    socket.on('part-channel', leaveChannel);
    socket.on('listen', listen);
    socket.on('disconnect', function(){
        console.log('[SOCKETS] Cleaning up socket');
        var auth = idtoauth[socket.id];
        delete sockets[auth];
        delete idtoauth[socket.id];
        irc.disconnectIrcClient(auth, emitSuccess);
        irc.destroyIrcClient(auth);
    })
}

exports.init = function(server){
    io = require('socket.io')(server);
    io.on('connection', setupSocket);
    return io;
};
