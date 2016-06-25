var irc = require('./controllers/irc.server.controller');
var schema = require('./schema');
var config = require('config');

var appAuthToken = config.get('app.auth_token');
var appDisplayName = config.get('app.display_name');
var tasks_global = [];
var paramCreationsPending = 0;
var modelCreationsPending = 0;
var listenerLock = {};
var channelTaskMapping = {};

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

function handleIrcSuccess(area, auth_token){
    console.log('[Background Tasks] ' + auth_token + '-success-' + area);
}

function parseMessage(from, text, channel){
    for(var z = 0; z < channelTaskMapping[channel].length; z++) {
        var task = tasks_global[getGlobalIndex(channelTaskMapping[channel][z])]
        for (var i = 0; i < task.models; i++) {
            for (var j = 0; j < task.models[i].params.length; j++) {
                var reg = new RegExp('.*' + task.models[i].params[j].key + '.*', 'g');
                var count = (text.match(reg) || []).length;
                task.models[i].params[j].value += count;
            }
        }
    }
}

function startTask (task) {
    for(var i = 0; i < task.channel_names.length; i++){
        if(listenerLock[task.channel_names[i]]){
            listenerLock[task.channel_names[i]]++;
            channelTaskMapping[task.channel_names[i]].push(task.task_name);
        } else {
            irc.joinIrcChannel(appAuthToken, task.channel_names[i], handleIrcSuccess);
            irc.addIrcListener(appAuthToken, 'message#' + task.channel_names[i], function(from, text){
                parseMessage(from, text, task.channel_names[i]);
            });
            listenerLock[task.channel_names[i]] = 1;
            channelTaskMapping[task.channel_names[i]] = [task.task_name];

        }
    }
}

function endTask (task){
    for(var i = 0; i < task.channel_names.length; i++){
        listenerLock[task.channel_names[i]]--;
        if(listenerLock[task.channel_names[i]] == 0){
            irc.removeIrcListener(appAuthToken, 'message#' + task.channel_names[i], function(from, text){
                parseMessage(from, text, task);
            });
            irc.leaveIrcChannel(auth_token, task.channel_names[i], handleIrcSuccess);
        }
        for(var i = 0; i < channelTaskMapping.length; i++){
            for (var j=channelTaskMapping[i].length-1; j>=0; j--) {
                if (channelTaskMapping[i][j] === task.task_name) {
                    channelTaskMapping[i].splice(j, 1);
                }
            }
        }
    }
}

function parseOutParams(params){
    var paramObjs = [];
    for(var i = 0; i < params.length; i++){
        paramObjs.push({ id : params[i]._id, key : params[i].key, value : params[i].value});
    }
    return paramObjs;
}

function parseOutModels(models){
    var model_objs = [];
    for(var i = 0; i < models.length; i++){
        model_objs.push({ id: models[i]._id, model_name : models[i].model_name, params : parseOutParams(models[i].params)});
    }
    return model_objs;
}

function constructIdList(objArr){
    var objIds = [];
    for(var i = 0; i < objArr.length; i++){
        objIds.push(objArr[i].id);
    }
    return objIds;
}

function saveParams(){
    for(var i = 0; i < tasks_global.length; i++){
        for(var j = 0; j < tasks_global[i].models.length; j++){
            for(var k = 0; k < tasks_global[i].models[j].params.length; k++){
                var curParam = tasks_global[i].models[j].params[k];
                if(curParam.id != -1){
                    schema.Param.update({_id : curParam.id}, {key : curParam.key, value : curParam.value}, function(err){
                        if(err){
                            console.log('Error: There was an issue updating a parameter');
                        }
                    });
                } else {
                    paramCreationsPending += 1;
                    schema.Param.create({key : curParam.key, value : curParam.value}, function(err, obj){
                        if(err){
                            console.log('Error: There was an issue creating a parameter');
                        } else {
                            tasks_global[i].models[j].params[k].id = obj._id;
                        }
                        paramCreationsPending -= 1;
                    });
                }
            }
        }
    }
    saveModels();
}

function saveModels(){
    if(paramCreationsPending == 0){
        for(var i = 0; i < tasks_global.length; i++){
            for(var j = 0; j < tasks_global[i].models.length; j++){
                var curModel = tasks_global[i].models[j];
                if(curModel.id != -1){
                    schema.Model.update({_id : curModel.id}, {model_name : curModel.model_name, params : constructIdList(curModel.params)}, function(err){
                        if(err){
                            console.log('Error: There was an issue updating a model');
                        }
                    });
                } else {
                    modelCreationsPending += 1;
                    schema.Model.create({model_name : curModel.model_name, params : constructIdList(curModel.params)}, function(err, obj){
                        if(err){
                            console.log('Error: There was an issue creating a model');
                        } else {
                            tasks_global[i].models[j].id = obj._id;
                        }
                        modelCreationsPending -= 1;
                    });
                }
            }
        }
        saveTasks();
    } else {
        setTimeout(saveModels, 5000);
    }
}

function saveTasks(){
    if(modelCreationsPending == 0){
        for(var i = 0; i < tasks_global.length; i++){
            var curTask = tasks_global[i];
            if(curTask.id != -1){
                schema.Task.update({_id : curTask.id}, {task_name : curTask.model_name, channel_names : curTask.channel_names, models : constructIdList(curTask.models)}, function(err){
                    if(err){
                        console.log('Error: There was an issue updating a task');
                    }
                });
            } else {
                schema.Task.create( {task_name : curTask.model_name, channel_names : curTask.channel_names, models : constructIdList(curTask.models)}, function(err, obj){
                    if(err){
                        console.log('Error: There was an issue creating a task');
                    } else {
                        tasks_global[i].id = obj._id;
                    }
                });
            }
        }
        console.log('Saving complete');
    } else {
        setTimeout(saveTasks, 5000);
    }
}

function getGlobalIndex(taskname){
    for(var i = 0; i < tasks_global.length; i++){
        if (tasks_global[i].task_name == taskname)
            return i;
    }
    return -1;
}

exports.init = function(){
    irc.createIrcClient(appAuthToken, appDisplayName);
    irc.connectIrcClient(appAuthToken, handleIrcSuccess);
    schema.Task.find({}).populate('models').exec(function(err, tasks){
        if(err){
            console.log('Error: There was an issue loading tasks');
        } else {
            for(var i = 0; i < tasks.length; i++){
                tasks_global.push({ id : tasks[i]._id, task_name : tasks[i].task_name, channel_names : tasks[i].channel_names, models : parseOutModels(tasks[i].models)});
                startTask(tasks_global[i]);
            }
        }
    });
};

exports.save = function(){
    saveParams();
};

exports.updateTasks = function(req, res){
    var tasksToUpdate = req.body.tasks;
    var rejectedTasks = [];
    for(var i = 0; i < tasksToUpdate.length; i++){
        var index = getGlobalIndex(tasksToUpdate[i].task_name)
        if(index != -1){
            endTask(tasks_global[index])
            tasks_global[index] = tasksToUpdate[i];
            startTask(tasks_global[index])
        } else {
            rejectedTasks.push(tasksToUpdate.task_name);
        }
    }
    res.json({success : 1, rejected : rejectedTasks})
}

exports.addTasks = function(req, res){
    var newTasks = req.body.tasks;
    var rejectedTasks = []
    for(var i = 0; i < newTasks.length; i++){
        var index = getGlobalIndex(newTasks[i].task_name);
        if(index == -1) {
            rejectedTasks.push(newTasks.splice(index, 1));
            i--;
        }
    }
    tasks_global = tasks_global.concat(newTasks);
    for(var i = 0; i < newTasks.length; i++){
        startTask(tasks_global[tasks_global.length-i]);
    }
    res.json({success : 1, rejected : rejectedTasks});
};

exports.removeTasks = function(req, res){
    var taskNames = req.body.taskNames;
    for(var i = 0; i < taskNames.length; i++){
        var index = getGlobalIndex(taskName);
        if(index != -1){
            var removedTask = tasks_global.splice(index,1);
            schema.Task.remove({_id : removedTask[0].id}).exec();
            i--;
        }
    }
    res.json({success : 1});
};

exports.getAllTasks = function(req, res){
    res.json(tasks_global);
};
