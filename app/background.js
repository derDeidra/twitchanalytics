var irc = require('./controllers/irc.server.controller');
var schema = require('./schema');
var config = require('config');

var appAuthToken = config.get('app.auth_token');
var appDisplayName = config.get('app.display_name');
var tasks_global = [];
var paramOperationsPending = 0;
var modelOperationsPending = 0;
var taskOperationsPending = 0;
var listenerLock = {};
var channelTaskMapping = {};
var rawBuffer = [];
var rawBufferMax = 1000;

/*
 {
 name : 'some name',
 channels : [{channel : 'channel'}, ...,{channel : 'channel'}],
 models : [
 {
 name : 'some name',
 params : ['some key','some other key', ... ],
 data : [{ key : 'channel-some key', value : number}, ...]
 },
 ...
 ]
 }
 */


function handleIrcSuccess(area, auth_token, details) {
    if (details) {
        console.log('[BACKGROUND] ' + auth_token + '-success-' + area + ' ' + details);
    } else {
        console.log('[BACKGROUND] ' + auth_token + '-success-' + area)
    }
}

function parseMessage(from, text, channel) {
    var rawObj = {from: from, text: text, channel: channel, timestamp: new Date(), releventParamObjs: []};
    for (var i = 0; i < channelTaskMapping[channel].length; i++) {
        var task = tasks_global[getGlobalIndex(channelTaskMapping[channel][i])]
        for (var j = 0; j < task.models.length; j++) {
            var model = task.models[j];
            for (var k = 0; k < model.data.length; k++) {
                if (model.data[k].channel == channel) {
                    var reg = new RegExp('.*' + model.data[k].param + '.*', 'g');
                    var count = (text.match(reg) || []).length;
                    if (count > 0) {
                        model.data[k].value += count;
                        if (model.data[k]._id) {
                            rawObj.releventParamObjs.push(model.data[k]);
                        }
                    }
                }
            }
        }
    }
    rawBuffer.push(rawObj);
    if (rawBuffer.length > rawBufferMax) {
        for (var i = 0; i < rawBuffer.length; i++) {
            var curRaw = rawBuffer[i];
            with ({prevRaw: curRaw}) {
                schema.Raw.create({
                    from: curRaw.from,
                    text: curRaw.text,
                    channel: curRaw.channel,
                    timestamp: curRaw.timestamp
                }, function (err, raw) {
                    if (err) console.log("[BACKGROUND] Error inserting raw data");
                    else {
                        for (var j = 0; j < prevRaw.releventParamObjs.length; j++) {
                            prevRaw.releventParamObjs[j].data.push(raw._id);
                        }
                    }
                });
            }
        }
        rawBuffer = [];
    }
}

function startTask(task) {
    for (var i = 0; i < task.channels.length; i++) {
        var channel_name = task.channels[i].channel;
        if (listenerLock[channel_name]) {
            listenerLock[channel_name]++;
            channelTaskMapping[channel_name].push(task.name);
        } else {
            irc.joinIrcChannel(appAuthToken, channel_name, handleIrcSuccess);
            irc.addIrcListener(appAuthToken, 'message#' + channel_name, function (from, text) {
                parseMessage(from, text, channel_name);
            });
            listenerLock[channel_name] = 1;
            channelTaskMapping[channel_name] = [task.name];
        }
    }
}

function endTask(task) {
    for (var i = 0; i < task.channels.length; i++) {
        var channel_name = task.channels[i].channel;
        listenerLock[channel_name]--;
        if (listenerLock[channel_name] == 0) {
            irc.removeIrcListener(appAuthToken, 'message#' + channel_name);
            irc.leaveIrcChannel(appAuthToken, channel_name, handleIrcSuccess);
        }
    }
    for (var i = 0; i < channelTaskMapping.length; i++) {
        for (var j = channelTaskMapping[i].length - 1; j >= 0; j--) {
            if (channelTaskMapping[i][j] === task.name) {
                channelTaskMapping[i].splice(j, 1);
            }
        }
    }
}

function parseOutParamData(paramData) {
    var paramDataObjs = [];
    for (var i = 0; i < paramData.length; i++) {
        paramDataObjs.push({
            _id: paramData[i]._id,
            param: paramData[i].param,
            channel: paramData[i].channel,
            value: paramData[i].value,
            data: paramData[i].data
        });
    }
    return paramDataObjs;
}

function parseOutModels(models) {
    var model_objs = [];
    for (var i = 0; i < models.length; i++) {
        model_objs.push({
            _id: models[i]._id,
            name: models[i].name,
            params: models[i].params,
            data: parseOutParamData(models[i].data)
        });
    }
    return model_objs;
}

function constructIdList(objArr) {
    var objIds = [];
    for (var i = 0; i < objArr.length; i++) {
        objIds.push(objArr[i]._id);
    }
    return objIds;
}

function saveParamData() {
    for (var i = 0; i < tasks_global.length; i++) {
        for (var j = 0; j < tasks_global[i].models.length; j++) {
            for (var k = 0; k < tasks_global[i].models[j].data.length; k++) {
                var curParamData = tasks_global[i].models[j].data[k];
                paramOperationsPending += 1;
                if (curParamData._id) {
                    schema.ParamData.update({_id: curParamData._id}, {
                        param: curParamData.param,
                        channel: curParamData.channel,
                        value: curParamData.value,
                        data : curParamData.data
                    }, function (err) {
                        if (err) {
                            console.log('Error: There was an issue updating a parameter');
                        }
                        paramOperationsPending -= 1;
                        if (paramOperationsPending == 0) {
                            saveModels();
                        }
                    });
                } else {
                    with ({param: curParamData}) {
                        schema.ParamData.create({
                            param: curParamData.param,
                            channel: curParamData.channel,
                            value: curParamData.value,
                            data : []
                        }, function (err, obj) {
                            if (err) {
                                console.log('Error: There was an issue creating a parameter');
                            } else {
                                param._id = obj._id;
                            }
                            paramOperationsPending -= 1;
                            if (paramOperationsPending == 0) {
                                saveModels();
                            }
                        });
                    }
                }
            }
        }
    }
}

function saveModels() {
    for (var i = 0; i < tasks_global.length; i++) {
        for (var j = 0; j < tasks_global[i].models.length; j++) {
            var curModel = tasks_global[i].models[j];
            modelOperationsPending += 1;
            if (curModel._id) {
                schema.Model.update({_id: curModel._id}, {
                    name: curModel.name,
                    params: curModel.params,
                    data: constructIdList(curModel.data)
                }, function (err) {
                    if (err) {
                        console.log('Error: There was an issue updating a model');
                    }
                    modelOperationsPending -= 1;
                    if (modelOperationsPending == 0) {
                        saveTasks();
                    }
                });
            } else {
                with ({model: curModel}) {
                    schema.Model.create({
                        name: curModel.name,
                        params: curModel.params,
                        data: constructIdList(curModel.data)
                    }, function (err, obj) {
                        if (err) {
                            console.log('Error: There was an issue creating a model');
                        } else {
                            model._id = obj._id;
                        }
                        modelOperationsPending -= 1;
                        if (modelOperationsPending == 0) {
                            saveTasks();
                        }
                    });
                }
            }
        }
    }
}

function saveTasks() {
    for (var i = 0; i < tasks_global.length; i++) {
        var curTask = tasks_global[i];
        taskOperationsPending += 1;

        if (curTask._id) {
            schema.Task.update({_id: curTask._id}, {
                name: curTask.name,
                channels: curTask.channels,
                models: constructIdList(curTask.models)
            }, function (err) {
                if (err) {
                    console.log('Error: There was an issue updating a task');
                }
                taskOperationsPending -= 1;
                if (taskOperationsPending == 0) {
                    console.log("[BACKGROUND] Saving complete");
                }
            });
        } else {
            with ({task: curTask}) {
                schema.Task.create({
                    owner: curTask.owner,
                    name: curTask.name,
                    channels: curTask.channels,
                    models: constructIdList(curTask.models)
                }, function (err, obj) {
                    if (err) {
                        console.log('Error: There was an issue creating a task');
                    } else {
                        task._id = obj._id;
                        with ({task_id: obj._id}) {
                            User.find({username: task.owner}, function (err, userObj) {
                                userObj.tasks.push(task_id);
                                userObj.save(function (err) {
                                    if (err) {
                                        console.log("[BACKGROUND] Error updating user object");
                                    }
                                })
                            });
                        }

                        taskOperationsPending -= 1;
                        if (taskOperationsPending == 0) {
                            console.log("[BACKGROUND] Saving complete");
                        }
                    }
                });
            }
        }
    }
}

function getGlobalIndex(name) {
    for (var i = 0; i < tasks_global.length; i++) {
        if (tasks_global[i].name == name)
            return i;
    }
    return -1;
}

function getTaskById(id) {
    for (var i = 0; i < tasks_global.length; i++) {
        if (tasks_global[i]._id == id)
            return tasks_global[i];
    }
    return null;
}

function initHelper() {
    schema.Task.find({}).populate({path: 'models', model: 'Model'}).exec(function (err, tasks) {
        if (err) {
            console.log('Error: There was an issue loading tasks');
        } else {
            schema.Task.populate(tasks, {path: 'models.data', model: 'ParamData'}, function (err, tasks) {
                if (err) {
                    console.log('Error: There was an issue loading tasks');
                } else {
                    for (var i = 0; i < tasks.length; i++) {
                        console.log('[BACKGROUND] Kicking off task ' + tasks[i].task_name);
                        tasks_global.push({
                            _id: tasks[i]._id,
                            owner: tasks[i].owner,
                            name: tasks[i].name,
                            channels: tasks[i].channels,
                            models: parseOutModels(tasks[i].models)
                        });
                        startTask(tasks_global[i]);
                    }
                }
            });
        }
    });
}

exports.init = function () {
    irc.createIrcClient(appAuthToken, appDisplayName);
    irc.connectIrcClient(appAuthToken, initHelper);
};

exports.save = function () {
    saveParamData();
};

exports.updateTasks = function (req, res) {
    var tasksToUpdate = req.body.tasks;
    console.log("[BACKGROUND] Got request to update " + tasksToUpdate.length + " tasks");
    var rejectedTasks = [];
    for (var i = 0; i < tasksToUpdate.length; i++) {
        var index = getGlobalIndex(tasksToUpdate[i].task_name)
        if (index != -1) {
            if (tasks_global[index].owner == req.session.display_name) {
                endTask(tasks_global[index]);
                tasks_global[index] = tasksToUpdate[i];
                startTask(tasks_global[index]);
            }
        } else {
            rejectedTasks.push(tasksToUpdate.task_name);
        }
    }
    saveParamData();
    res.json({success: 1, rejected: rejectedTasks})
}

exports.addTasks = function (req, res) {
    var newTasks = req.body.tasks;
    console.log("[BACKGROUND] Got request to add " + newTasks.length + " new tasks");
    var rejectedTasks = []
    for (var i = 0; i < newTasks.length; i++) {
        var index = getGlobalIndex(newTasks[i].task_name);
        if (index != -1) {
            rejectedTasks.push(newTasks.splice(index, 1));
            i--;
        } else {
            newTasks[i].owner = req.session.display_name;
        }
    }
    tasks_global = tasks_global.concat(newTasks);
    for (var i = 1; i <= newTasks.length; i++) {
        startTask(tasks_global[tasks_global.length - i]);
    }
    saveParamData();
    res.json({success: 1, rejected: rejectedTasks});
};

exports.removeTasks = function (req, res) {
    var taskNames = req.body.taskNames;
    console.log("[BACKGROUND] Got request to remove " + taskNames.length + " tasks");
    var tasksRemoved = 0;
    for (var i = 0; i < taskNames.length; i++) {
        var index = getGlobalIndex(taskName);
        if (index != -1) {
            if (tasks_global[index].owner == req.session.display_name) {
                var removedTask = tasks_global.splice(index, 1);
                schema.Task.remove({_id: removedTask[0].id}).exec();
                tasksRemoved++;
                i--;
            }
        }
    }
    saveParamData();
    res.json({removed: tasksRemoved});
};

exports.getAllUserTasks = function (req, res) {
    console.log("[BACKGROUND] Got request for all tasks listing from user " + req.sesson.display_name);
    schema.User.findOne({username: req.session.display_name}).populate({
        path: "tasks",
        model: "Task"
    }).exec(function (err, user) {
        if (err) {
            console.log("[BACKGROUND] Error resolving user object for user " + req.session.display_name);
            res.json({});
        } else {
            var tasks = [];
            for (var i = 0; i < user.tasks.length; i++) {
                tasks.push(getTaskById(user.tasks[i]._id));
            }
            res.json(tasks);
        }
    });
};

exports.getAllTasks = function (req, res) {
    res.json(tasks_global);
}
