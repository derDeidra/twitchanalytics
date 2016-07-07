var http = require('http');
var https = require('https');

var emoteCache = {};

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
    var twichemotes = {
        host: 'twitchemotes.com',
        port: 443,
        path: '/api_cache/v2/global.json',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    var betterttvemotes = {
        host: 'api.betterttv.net',
        port: 443,
        path: '/emotes',
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    };
    _getJSON(twichemotes, function(status, obj){
        if(status == 200){
            var keys = Object.keys(obj.emotes);
            for(var i = 0; i < keys.length; i++ ){
                var key = keys[i];
                emoteCache[key] = obj.template.small.replace('{image_id}',obj.emotes[key].image_id);
            }
            console.log('[UTILS] Twitch Emote cache refreshed');
        } else {
            console.log('[UTILS] Error refreshing twitch emote cache: ' + status);
        }
    });
    _getJSON(betterttvemotes, function(status, obj){
        if(status == 200){
            for(var i = 0; i < obj.emotes.length; i++){
                var curEmote = obj.emotes[i];
                emoteCache[curEmote.regex] = curEmote.url;
            }
            console.log('[UTILS] BTTV Emote cache refreshed');
        } else {
            console.log('[UTILS] Error refreshing BTTV emote cache: ' + status);
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