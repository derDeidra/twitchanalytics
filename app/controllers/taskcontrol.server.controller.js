var taskBackend = require('../background');

exports.render = function(req, res) {
    res.render('taskcontrol', {tasks : taskBackend.getAllTasks(), page : 'tasks'});
};
