var http = require('http');
var https = require('https');

var emoteCache = null;

function _getJSON(options, onResult) {
    var prot = options.port == 443 ? https : http;
    var req = prot.request(options, function(res)
    {
        var output = '';
        res.setEncoding('utf8');

        res.on('data', function (chunk) {
            output += chunk;
        });

        res.on('end', function() {
            var obj = JSON.parse(output);
            onResult(res.statusCode, obj);
        });
    });

    req.on('error', function(err) {
        //res.send('error: ' + err.message);
    });

    req.end();
}

function refreshCache(){
    var options = {
        host: 'twitchemotes.com',
        port: 443,
        path: '/api_cache/v2/global.json',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    _getJSON(options, function(status, obj){
        if(status == 200){
            emoteCache = obj;
            console.log('[UTILS] Emote cache refreshed');
        } else {
            console.log('[UTILS] Error refreshing emote cache: ' + status);
        }
    });
}

exports.init = function(){
    refreshCache();
    setInterval(refreshCache, 3600000);
};

exports.getEmotes = function(req, res) {
    if(req && res)
        res.json(emoteCache);
    else
        return emoteCache;
};

exports.getJSON = function(options, onResult){
    _getJSON(options,onResult);
};