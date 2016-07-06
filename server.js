var config = require('config');
var app = require('./express_config/express')();
var server = require('http').Server(app);
var io = require('./app/controllers/sockets.server.controller').init(server);
var handler = require('./app/task.handler');
var utils = require('./app/utils')

var serverPort = config.get('serverPort');

handler.init();
utils.init();
server.listen(serverPort, function() {
    console.log('[SERVER] Listening on port ' + serverPort);
});

module.exports = app, io;
