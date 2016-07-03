
var app = angular.module('live', ['chart.js']);

app.controller('live-body', function($scope){
    $scope.currentChannel;
    $scope.feedback = [];

    $scope.ircActive = false;
    $scope.channelActive = false;

    $scope.data_pie = [];
    $scope.labels_pie = [];

    $scope.chat = [];

    function handleDataConnection(data){
        for(var i = 0; i < $scope.labels_pie.length; i++){
            var val = $scope.labels_pie[i];
            var reg = new RegExp('.*' + val + '.*', 'g');
            $scope.data_pie[i] += (data.text.match(reg) || []).length;
        }
        $scope.chat.push(data);
        if(($scope.labels_pie.length > 0 && $scope.chat.length > 23) || ($scope.labels_pie.length == 0 && $scope.chat.length > 11))
            $scope.chat.shift();
        $scope.$apply();
    }

    var socket = io(window.location.host);

    socket.on(authToken + '-success-connect', function(){
        $scope.feedback.push('Twitch IRC Connection Successful');
        $scope.ircActive = true;
        $scope.$apply();
    });
    socket.on(authToken + '-success-disconnect', function(){
        $scope.feedback.push('Successfully disconnected from twitch');
        $scope.ircActive = false;
        $scope.$apply();
    });
    socket.on(authToken + '-success-join', function(){
        $scope.feedback.push('Successfully connected to ' + $scope.currentChannel);
        $scope.channelActive = true;
        $scope.$apply();
    });
    socket.on(authToken + '-success-part', function(){
        $scope.feedback.push('Successfully disconnected from ' + $scope.currentChannel);
        $scope.channelActive = false;
        $scope.$apply();
    });

    socket.emit('authenticate', {auth_token : authToken});
    socket.emit('create-client', {auth_token : authToken, display_name: displayName});

    $scope.channelConnect = function(){
        var channelName = $scope.channelName.toLowerCase();
        $scope.channelName = '';
        $scope.currentChannel = channelName;
        socket.on(authToken + '-' + channelName + '-message', handleDataConnection);
        socket.emit('join-channel', {auth_token : authToken, channel: channelName});
        socket.emit('listen', {auth_token : authToken, channel: channelName});
    };

    $scope.channelDisconnect = function(){
        socket.emit('part-channel', {auth_token : authToken, channel: $scope.currentChannel});
    };

    $scope.addModelParam = function(){
        $scope.labels_pie.push($scope.modelParam);
        $scope.modelParam = '';
        $scope.data_pie.push(0);
    };

    $scope.resetValues = function(){
        for(var i = 0; i < $scope.data_pie.length; i++){
            $scope.data_pie[i] = 0;
        }
    };

    $scope.resetParams = function(){
        $scope.data_pie = [];
        $scope.labels_pie = [];
    };
});
