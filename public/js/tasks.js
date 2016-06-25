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

    $scope.getTasks = function() {
        $http({
            method: 'GET',
            url: '/getTasks'
        }).then(function successCallback(response) {
            console.log(response);
        }, function errorCallback(response) {
            console.log(response);
        });
    };

    $scope.saveTasks = function(){
        
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

});

app.run(function(editableOptions) {
    editableOptions.theme = 'bs3'; // bootstrap3 theme. Can be also 'bs2', 'default'
});
