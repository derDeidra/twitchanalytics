var backgroundID;

module.exports = function(app) {

    var landing = require('../controllers/landing.server.controller');
    var live = require('../controllers/live.server.controller');
    var auth = require('../controllers/auth.server.controller');
    var tasks = require('../controllers/tasks.server.controller.js');
    var background = require('../background');
    background.init();
    console.log("[ROUTES] Starting save loop");
    backgroundID = setInterval(background.save, 300000);

    app.get('/', auth.accessRedirect, landing.render);
    app.get('/live', auth.accessControl, live.render);
    app.get('/tasks', auth.adminAccessControl, tasks.render);
    app.get('/auth', auth.initialize);
    app.get('/auth_redirect', auth.handleRedirect);
    app.get('/getTasks', auth.adminAccessControl, background.getAllTasks);
    app.get('/logout', auth.accessControl, auth.logout);

    app.post('/addTasks', auth.adminAccessControl, background.addTasks);
    app.post('/updateTasks', auth.adminAccessControl, background.updateTasks);
    app.post('/removeTasks', auth.adminAccessControl, background.removeTasks);
};
