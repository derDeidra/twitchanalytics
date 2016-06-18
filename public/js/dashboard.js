
var app = angular.module("chatstats", ["chart.js"]);

app.controller("chatstats-body", function($scope, $http){
    $scope.currentChannel;
    $scope.feedback = [];

    $scope.ircActive = false;
    $scope.channelActive = false;

    $scope.data_pie = [];
    $scope.labels_pie = [];

    function handleDataConnection(data){
        for(var i = 0; i < $scope.labels_pie.length; i++){
            var val = $scope.labels_pie[i];
            var reg = new RegExp('.*' + val + '.*', "g")
            var count = (data.text.match(reg) || []).length;
            $scope.data_pie[i] += count;
        }
        $scope.$apply();
    }

    var socket = io('http://localhost:1337');

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
        $scope.feedback.push('Successfully connected to ' + currentChannel);
        $scope.channelActive = true;
        $scope.$apply();
    });
    socket.on(authToken + '-success-part', function(){
        $scope.feedback.push('Successfully disconnected from ' + currentChannel);
        $scope.channelActive = false;
        $scope.$apply();
    });

    socket.emit('authenticate', {auth_token : authToken});
    socket.emit('create-client', {auth_token : authToken, display_name: displayName});

    $scope.channelConnect = function(){
        var channelName = $scope.channelName.toLowerCase();
        currentChannel = channelName;
        socket.on(authToken + '-' + channelName + '-message', handleDataConnection);
        socket.emit('join-channel', {auth_token : authToken, channel: channelName});
        socket.emit('listen', {auth_token : authToken, channel: channelName});
    };

    $scope.channelDisconnect = function(){
        socket.emit('part-channel', {auth_token : authToken, channel: currentChannel});
    };

    $scope.addModelParam = function(){
        $scope.labels_pie.push($scope.modelParam);
        $scope.data_pie.push(0);
    }

    $scope.resetValues = function(){
        for(var i = 0; i < $scope.data_pie.length; i++){
            $scope.data_pie[i] = 0;
        }
    }

    $scope.resetParams = function(){
        $scope.data_pie = [];
        $scope.labels_pie = [];
    }
});
