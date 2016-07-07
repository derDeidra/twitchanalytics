module.exports = function(app) {

    var landing = require('../controllers/landing.server.controller');
    var live = require('../controllers/live.server.controller');
    var auth = require('../controllers/auth.server.controller');
    var tasks = require('../controllers/tasks.server.controller.js');
    var query = require('../controllers/query.server.controller.js');
    var handler = require('../task.handler');
    var utils = require('../utils.js');
    handler.init();

    //Pages
    app.get('/', auth.accessRedirect, landing.render);
    app.get('/live', auth.accessControl, live.render);
    app.get('/tasks', auth.accessControl, tasks.render);
    app.get('/query', auth.accessControl, query.render)

    //Auth
    app.get('/auth', auth.initialize);
    app.get('/auth_redirect', auth.handleRedirect);
    app.get('/logout', auth.accessControl, auth.logout);

    //App GET endpoints
    app.get('/getTasks', auth.accessControl, handler.getAllUserTasks);
    app.get('/getAllTasks', auth.adminAccessControl, handler.getAllTasks);
    app.get('/execute-query', auth.accessControl, handler.customQuery)
    app.get('/emotes', auth.accessControl, utils.getEmotes);

    //App POST endpoints
    app.post('/addTasks', auth.accessControl, handler.addTasks);
    app.post('/updateTasks', auth.accessControl, handler.updateTasks);
    app.post('/removeTasks', auth.accessControl, handler.removeTasks);
};
