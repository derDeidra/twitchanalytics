var app = angular.module('tasks', ['chart.js', 'xeditable']);
/*
    {
        task_name : 'some name',
        channel_names : ['channel', 'channel'],
        models : [
            {
                model_name : 'some name',
                model_params : [
                    {
                        key : 'some key',
                        value : 'some value'
                    },
                    ...
                ]
            },
            ...
        ]
    }
*/
app.controller('tasks-body', function($scope, $http) {
    $scope.tasks_global = [];

    function isValidTask(task){
        if(task.task_name.length <= 0)
            return false;
        if(task.channel_names.length <= 0)
            return false;
        for(var i = 0; i < task.models.length; i++){
            var model = task.models[i];
            if(model.model_name.length <= 0)
                return false;
            for(var j = 0; j < model.model_params.length; j++){
                var param = model.model_params[j];
                if(param.key.length <= 0)
                    return false;
            }
        }
        return true;
    }

    function httpSuccessHandler(data){
        console.log("Success!");
        console.log(data);

    }

    function httpFailureHandler(data){
        console.log("Failure");
        console.log(data);
    }

    function addNewTasks(tasks){
        var req = {
            method: 'POST',
            url: '/addTasks',
            headers: {
                'Content-Type': 'application/json'
            },
            data: {tasks : tasks}
        }
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
        }
        $http(req).then(httpSuccessHandler, httpFailureHandler);
    }

    $scope.getTasks = function() {
        $http({
            method: 'GET',
            url: '/getTasks'
        }).then(function successCallback(response) {
            console.log(response);
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
                    if(task.id){
                        toUpdate.push(task);
                    } else {
                        toSave.push(task);
                    }
                } else {
                    console.log("Invalid task");
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
            task_name: '',
            channel_names: [],
            models: []
        });
    };

    $scope.addChannel = function(task) {
        task.channel_names.push({channel_name : ''});
    };

    $scope.addModel = function(task) {
        task.models.push({
            model_name: '',
            model_params: []
        });
    };

    $scope.addParam = function(model) {
        model.model_params.push({
            key: '',
            value: 0
        });
    };

    $scope.markChanged = function(task){
        task.modified = true;
    }

    $scope.getTasks();
});

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});
