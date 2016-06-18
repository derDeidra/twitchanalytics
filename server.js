var serverPort = 1337;
var app = require('./config/express')();
var server = require('http').Server(app);
var io = require('./app/controllers/sockets.server.controller').init(server);

server.listen(serverPort, function() {
    console.log('Listening on port ' + serverPort);
});

module.exports = app, io;
