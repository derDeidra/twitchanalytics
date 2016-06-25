var irc = require('./controllers/irc.server.controller');
var schema = require('./schema');
var config = require('config');

var appAuthToken = config.get('app.auth_token');
var appDisplayName = config.get('app.display_name');
var tasks_global = [];
var paramCreationsPending = 0;
var modelCreationsPending = 0;
var taskCreationsPending = 0;
var listenerLock = {};
var channelTaskMapping = {};

/*
    {
        task_name : 'some name',
        channel_names : [{channel_name : 'channel'}, {channel_name : 'channel'}],
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



function handleIrcSuccess(area, auth_token, details){
    if(details){
        console.log('[BACKGROUND] ' + auth_token + '-success-' + area + ' ' + details);
    } else {
        console.log('[BACKGROUND] ' + auth_token + '-success-' + area)
    }
}

function parseMessage(from, text, channel){
    for(var i = 0; i < channelTaskMapping[channel].length; i++) {
        var task = tasks_global[getGlobalIndex(channelTaskMapping[channel][i])]
        for (var j = 0; j < task.models.length; j++) {
            var model = task.models[j];
            for (var k = 0; k < model.model_params.length; k++) {
                var reg = new RegExp('.*' + model.model_params[k].key + '.*', 'g');
                var count = (text.match(reg) || []).length;
                model.model_params[k].value += count;
            }
        }
    }
}

function startTask (task) {
    for(var i = 0; i < task.channel_names.length; i++){
        var channel_name = task.channel_names[i].channel_name;
        if(listenerLock[channel_name]){
            listenerLock[channel_name]++;
            channelTaskMapping[channel_name].push(task.task_name);
        } else {
            irc.joinIrcChannel(appAuthToken, channel_name, handleIrcSuccess);
            irc.addIrcListener(appAuthToken, 'message#' + channel_name, function(from, text){
                parseMessage(from, text, channel_name);
            });
            listenerLock[channel_name] = 1;
            channelTaskMapping[channel_name] = [task.task_name];

        }
    }
}

function endTask (task){
    for(var i = 0; i < task.channel_names.length; i++){
        var channel_name = task.channel_names[i];
        listenerLock[channel_name]--;
        if(listenerLock[channel_name] == 0){
            irc.removeIrcListener(appAuthToken, 'message#' + channel_name);
            irc.leaveIrcChannel(auth_token, channel_name, handleIrcSuccess);
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
        model_objs.push({ id: models[i]._id, model_name : models[i].model_name, model_params : parseOutParams(models[i].params)});
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
            for(var k = 0; k < tasks_global[i].models[j].model_params.length; k++){
                var curParam = tasks_global[i].models[j].model_params[k];
                if(curParam.id){
                    schema.Param.update({_id : curParam.id}, {key : curParam.key, value : curParam.value}, function(err){
                        if(err){
                            console.log('Error: There was an issue updating a parameter');
                        }
                    });
                } else {
                    paramCreationsPending += 1;
                    with ({param : curParam}) {
                        schema.Param.create({key : curParam.key, value : curParam.value}, function(err, obj){
                            if(err){
                                console.log('Error: There was an issue creating a parameter');
                            } else {
                                param.id = obj._id;
                            }
                            paramCreationsPending -= 1;
                            if(paramCreationsPending == 0){
                                saveModels()
                            }
                        });
                    }
                }
            }
        }
    }
}

function saveModels(){
    for(var i = 0; i < tasks_global.length; i++){
        for(var j = 0; j < tasks_global[i].models.length; j++){
            var curModel = tasks_global[i].models[j];
            if(curModel.id){
                schema.Model.update({_id : curModel.id}, {model_name : curModel.model_name, params : constructIdList(curModel.model_params)}, function(err){
                    if(err){
                        console.log('Error: There was an issue updating a model');
                    }
                });
            } else {
                modelCreationsPending += 1;
                with ({model : curModel}) {
                    schema.Model.create({model_name : curModel.model_name, params : constructIdList(curModel.model_params)}, function(err, obj){
                        if(err){
                            console.log('Error: There was an issue creating a model');
                        } else {
                            model.id = obj._id;
                        }
                        modelCreationsPending -= 1;
                        if(modelCreationsPending == 0){
                            saveTasks();
                        }
                    });
                }
            }
        }
    }
}

function saveTasks(){
    for(var i = 0; i < tasks_global.length; i++){
        var curTask = tasks_global[i];
        if(curTask.id){
            schema.Task.update({_id : curTask.id}, {task_name : curTask.model_name, channel_names : curTask.channel_names, models : constructIdList(curTask.models)}, function(err){
                if(err){
                    console.log('Error: There was an issue updating a task');
                }
            });
        } else {
            taskCreationsPending += 1;
            with({task : curTask}){
                schema.Task.create( {task_name : curTask.task_name, channel_names : curTask.channel_names, models : constructIdList(curTask.models)}, function(err, obj){
                    if(err){
                        console.log('Error: There was an issue creating a task');
                    } else {
                        task.id = obj._id;
                        taskCreationsPending -= 1;
                        if(taskCreationsPending == 0){
                            console.log("[BACKGROUND] Saving complete");
                        }
                    }
                });
            }
        }
    }
}

function getGlobalIndex(taskname){
    for(var i = 0; i < tasks_global.length; i++){
        if (tasks_global[i].task_name == taskname)
            return i;
    }
    return -1;
}

function initHelper(){
    schema.Task.find({}).populate({path : 'models', model : 'Model'}).exec(function(err, tasks){
        if(err){
            console.log('Error: There was an issue loading tasks');
        } else {
            schema.Task.populate(tasks, {path : 'models.params', model : 'Param'}, function(err, tasks){
                if(err){
                    console.log('Error: There was an issue loading tasks');
                } else {
                    for(var i = 0; i < tasks.length; i++){
                        console.log('[BACKGROUND] Kicking off task ' + tasks[i].task_name);
                        tasks_global.push({ id : tasks[i]._id, task_name : tasks[i].task_name, channel_names : tasks[i].channel_names, models : parseOutModels(tasks[i].models)});
                        startTask(tasks_global[i]);
                    }
                }
            });
        }
    });
}

exports.init = function(){
    irc.createIrcClient(appAuthToken, appDisplayName);
    irc.connectIrcClient(appAuthToken, initHelper);
};

exports.save = function(){
    saveParams();
};

exports.updateTasks = function(req, res){
    var tasksToUpdate = req.body.tasks;
    console.log("[BACKGROUND] Got request to update " + tasksToUpdate.length + " tasks");
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
    saveParams();
    res.json({success : 1, rejected : rejectedTasks})
}

exports.addTasks = function(req, res){
    var newTasks = req.body.tasks;
    console.log("[BACKGROUND] Got request to add " + newTasks.length + " new tasks");
    var rejectedTasks = []
    for(var i = 0; i < newTasks.length; i++){
        var index = getGlobalIndex(newTasks[i].task_name);
        if(index != -1) {
            rejectedTasks.push(newTasks.splice(index, 1));
            i--;
        }
    }
    tasks_global = tasks_global.concat(newTasks);
    for(var i = 1; i <= newTasks.length; i++){
        startTask(tasks_global[tasks_global.length-i]);
    }
    saveParams();
    res.json({success : 1, rejected : rejectedTasks});
};

exports.removeTasks = function(req, res){
    var taskNames = req.body.taskNames;
    console.log("[BACKGROUND] Got request to remove " + taskNames.length + " tasks");
    for(var i = 0; i < taskNames.length; i++){
        var index = getGlobalIndex(taskName);
        if(index != -1){
            var removedTask = tasks_global.splice(index,1);
            schema.Task.remove({_id : removedTask[0].id}).exec();
            i--;
        }
    }
    saveParams();
    res.json({success : 1});
};

exports.getAllTasks = function(req, res){
    console.log("[BACKGROUND] Got request for all tasks listing");
    res.json(tasks_global);
};
