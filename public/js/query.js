var app = angular.module('query', ['chart.js', 'xeditable']);

app.controller('query-body', function($scope, $http) {
    $scope.query_interface = true;
    $scope.query = {};

    $scope.queryInterface = function(){
        $scope.query = {channels : [], params : [], senders : [], startdate : null, enddate : null};
        $scope.visualize_task = false;
        $scope.view_task = false;
        $scope.query_interface = true;
    };

    $scope.finishQuery = function(){
        $scope.query_interface = false;
        $scope.view_task = true;
    };

    $scope.addQueryChannel = function(){
      $scope.query.channels.push({channel : ""});
    };

    $scope.addQuerySender = function(){
        $scope.query.senders.push({sender : ""});
    };

    $scope.addQueryParam = function(){
        $scope.query.params.push({param : ""});
    };

    $scope.executeQuery = function(){
        console.log("Executing query with content");
        console.log($scope.query);
        $http({
            method: 'GET',
            url: 'execute-query?q=' + encodeURIComponent(JSON.stringify($scope.query))
        }).then(function successCallback(response) {
            console.log(response);
        }, function errorCallback(response) {
            console.log(response);
        });
    };
});

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});