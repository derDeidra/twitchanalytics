var config = require('config');
var app = require('./express_config/express')();
var server = require('http').Server(app);
var io = require('./app/controllers/sockets.server.controller').init(server);

var serverPort = config.get('serverPort');

server.listen(serverPort, function() {
    console.log('[SERVER] Listening on port ' + serverPort);
});

module.exports = app, io;
