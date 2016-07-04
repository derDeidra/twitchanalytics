var app = angular.module('tasks', ['chart.js', 'xeditable']);

app.controller('tasks-body', function($scope, $http) {
    $scope.tasks_global = [];
    $scope.task = {};
    $scope.chart_data = {};
    $scope.view_task = true;
    $scope.edit_task = false;
    $scope.visualize_task = false;

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

    function isValidTask(task){
        if(task.name.length <= 0)
            return false;
        if(task.channels.length <= 0)
            return false;
        for(var i = 0; i < task.models.length; i++){
            var model = task.models[i];
            if(model.name.length <= 0)
                return false;
            for(var j = 0; j < model.params.length; j++){
                var param = model.params[j];
                if(param.param.length <= 0)
                    return false;
            }
        }
        return true;
    }

    function httpSuccessHandler(data){
        console.log('Success!');
        console.log(data);
        swal("Success!", "Tasks successfully saved!", "success")
    }

    function httpFailureHandler(data){
        console.log('Failure');
        console.log(data);
        swal("Oops...", "Something went wrong saving your tasks!", "error");
    }

    function addNewTasks(tasks){
        var req = {
            method: 'POST',
            url: '/addTasks',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {tasks : tasks}
        };
        $http(req).then(httpSuccessHandler, httpFailureHandler);
    }

    function updateExistingTasks(tasks){
        var req = {
            method: 'POST',
            url: '/updateTasks',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {tasks : tasks}
        };
        $http(req).then(httpSuccessHandler, httpFailureHandler);
    }

    function dataExistsFor(param, data){
        for(var i = 0; i < data.length; i++){
            if(data[i].param == param)
                return true;
        }
        return false;
    }

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

    $scope.saveTasks = function(){
        var toUpdate = [];
        var toSave = [];
        for(var i = 0; i < $scope.tasks_global.length; i++){
            var task = $scope.tasks_global[i];
            if(task.modified){
                if(isValidTask(task)){
                    for(var j = 0; j < task.models.length; j++){
                        var model = task.models[j];
                        if(model.data.length <= 0){
                            for(var k = 0; k < task.channels.length; k++){
                                for(var l = 0; l < model.params.length; l++){
                                    model.data.push({
                                        channel : task.channels[k].channel,
                                        param : model.params[l].param,
                                        value : 0,
                                        data : []
                                    });
                                }
                            }
                        } else if(model.data.length != model.params.length){
                            for(var k = 0; k < model.params.length; k++){
                                var param = model.params[k].param;
                                if(!dataExistsFor(param,model.data)){
                                    for(var l = 0; l < task.channels.length; l++)
                                        model.data.push({
                                            channel : task.channels[l].channel,
                                            param : param,
                                            value : 0,
                                            data : []
                                        });
                                }
                            }
                        }
                    }
                    if(task._id){
                        toUpdate.push(task);
                    } else {
                        toSave.push(task);
                    }
                } else {
                    console.log('Invalid task');
                    console.log(task);
                }
            }
        }
        if(toUpdate.length > 0){
            updateExistingTasks(toUpdate);
        }
        if(toSave.length > 0){
            addNewTasks(toSave);
        }
    };

    $scope.addTask = function() {
        $scope.tasks_global.push({
            name: '',
            channels: [],
            models: []
        });
        $scope.task = $scope.tasks_global[$scope.tasks_global.length-1];
        $scope.edit_task = true;
    };

    $scope.addChannel = function(task) {
        task.channels.push({channel : ''});
    };

    $scope.addModel = function(task) {
        task.models.push({
            name: '',
            params: [],
            data : []
        });
    };

    $scope.addParam = function(model) {
        model.params.push({
            param: ''
        });
    };

    $scope.markChanged = function(task){
        task.modified = true;
    };

    $scope.removeTask = function(task){
        console.log(task);
        console.log($scope.tasks_global.indexOf(task));
    };

    $scope.editTask = function(task){
        $scope.task = task;
        $scope.visualize_task = false;
        $scope.edit_task = true;
    };

    $scope.finishEdit = function(){
        $scope.edit_task = false;
    };

    $scope.visualizeTask = function(task){
        $scope.task = task;
        $scope.edit_task = false;
        $scope.visualize_task = true;
    };

    $scope.finishVisualization = function(){
        $scope.visualize_task = false;
    };

    $scope.getTasks();
});

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});
