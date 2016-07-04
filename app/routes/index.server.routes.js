var backgroundID;

module.exports = function(app) {

    var landing = require('../controllers/landing.server.controller');
    var live = require('../controllers/live.server.controller');
    var auth = require('../controllers/auth.server.controller');
    var tasks = require('../controllers/tasks.server.controller.js');
    var query = require('../controllers/query.server.controller.js');
    var background = require('../background');
    background.init();
    console.log('[ROUTES] Starting save loop');
    backgroundID = setInterval(background.save, 60000);

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
    app.get('/getTasks', auth.accessControl, background.getAllUserTasks);
    app.get('/getAllTasks', auth.adminAccessControl, background.getAllTasks);
    app.get('/execute-query', auth.accessControl, background.customQuery)

    //App POST endpoints
    app.post('/addTasks', auth.accessControl, background.addTasks);
    app.post('/updateTasks', auth.accessControl, background.updateTasks);
    app.post('/removeTasks', auth.accessControl, background.removeTasks);
};
