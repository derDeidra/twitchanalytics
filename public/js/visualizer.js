var app = angular.module('visualizer', ['chart.js', 'xeditable']);

app.controller('visualizer-body', function($scope, $http) {
    $scope.tasks_global = [];
    $scope.chart_data = {};
    $scope.view_task = true;
    $scope.visualize_task = false;
    $scope.query_interface = false;
    $scope.task = {};
    $scope.query = {};

    function findParamDataForChannel(model, channel){
        var paramData = [];
        for(var i = 0; i < model.data.length; i++) {
            if(model.data[i].channel == channel)
                paramData.push(model.data[i]);
        }
        return paramData;
    }

    function populateData(rData){
        for(var i = 0; i < rData.length; i++){
            var task = rData[i];
            $scope.chart_data[task.name] = {};
            var channels = task.channels;
            var models = task.models;
            for(var j = 0; j < models.length; j++){
                var model = models[j];
                $scope.chart_data[task.name][model.name] = {};
                $scope.chart_data[task.name][model.name].aggregate_labels = [];
                $scope.chart_data[task.name][model.name].aggregate_data = [];
                for(var k = 0; k < channels.length; k++){
                    var channel = channels[k].channel;
                    $scope.chart_data[task.name][model.name][channel] = {};
                    $scope.chart_data[task.name][model.name][channel].data = [];
                    $scope.chart_data[task.name][model.name][channel].labels = [];
                    var channel_aggregate_index = $scope.chart_data[task.name][model.name].aggregate_labels.push(channel) - 1;
                    $scope.chart_data[task.name][model.name].aggregate_data.push(0);
                    var paramDataObjs = findParamDataForChannel(model, channel)
                    for(var l = 0; l < paramDataObjs.length; l++){
                        var curParam = paramDataObjs[l];
                        $scope.chart_data[task.name][model.name][channel].data.push(curParam.value);
                        $scope.chart_data[task.name][model.name][channel].labels.push(curParam.param);
                        $scope.chart_data[task.name][model.name].aggregate_data[channel_aggregate_index] += curParam.value;
                        if(!$scope.chart_data[task.name][model.name][curParam.param])
                            $scope.chart_data[task.name][model.name][curParam.param] = {};
                        if($scope.chart_data[task.name][model.name][curParam.param].data){
                            var indexOfChannel = $scope.chart_data[task.name][model.name][curParam.param].labels.indexOf(channel)
                            if(indexOfChannel != -1){
                                $scope.chart_data[task.name][model.name][curParam.param].data[indexOfChannel] += curParam.value;
                            } else {
                                $scope.chart_data[task.name][model.name][curParam.param].data.push(curParam.value)
                                $scope.chart_data[task.name][model.name][curParam.param].labels.push(channel)
                            }
                        } else {
                            $scope.chart_data[task.name][model.name][curParam.param].data = [curParam.value]
                            $scope.chart_data[task.name][model.name][curParam.param].labels = [channel]
                        }
                    }
                }
            }
        }
        console.log($scope.chart_data);
    }

    $scope.getTasks = function() {
        $http({
            method: 'GET',
            url: '/getTasks'
        }).then(function successCallback(response) {
            console.log(response);
            populateData(response.data);
            $scope.tasks_global = response.data;
        }, function errorCallback(response) {
            console.log(response);
        });
    };

    $scope.resolveChartData = function(type, task, model, final){
        if(type == "channelLocalAggregate" || type == "paramChannelAggregate"){
            return $scope.chart_data[task][model][final].data
        } else if(type == "paramGlobalAggregate"){
            return $scope.chart_data[task][model].aggregate_data;
        }
    };

    $scope.resolveChartLabel= function(type, task, model, final){
        if(type == "channelLocalAggregate" || type == "paramChannelAggregate"){
            return $scope.chart_data[task][model][final].labels
        } else if(type == "paramGlobalAggregate"){
            return $scope.chart_data[task][model].aggregate_labels;
        }
    };

    $scope.visualizeTask = function(task){
        $scope.task = task;
        $scope.view_task = false;
        $scope.visualize_task = true;
    };

    $scope.finishVisualization = function(){
        $scope.visualize_task = false;
        $scope.view_task = true;
    };

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
      $scope.query.channels.push({channel : "Enter a channel name"});
    };

    $scope.addQuerySender = function(){
        $scope.query.senders.push({sender : "Enter a sender name"});
    };

    $scope.addQueryParam = function(){
        $scope.query.params.push({param : "Enter a param"});
    };

    $scope.executeQuery = function(){
        console.log("Executing query with content");
        console.log($scope.query);
    };

    $scope.getTasks();
});