var backgroundID;

module.exports = function(app) {

    var landing = require('../controllers/landing.server.controller');
    var livestats = require('../controllers/livestats.server.controller');
    var auth = require('../controllers/auth.server.controller');
    var taskcontrol = require('../controllers/taskcontrol.server.controller.js');
    var background = require('../background');
    background.init();
    backgroundID = setInterval(background.save, 300000);

    app.get('/', auth.accessRedirect, landing.render);
    app.get('/livestats', auth.accessControl, livestats.render);
    app.get('/tasksummary', auth.adminAccessControl, taskcontrol.render);
    app.get('/auth', auth.initialize);
    app.get('/auth_redirect', auth.handleRedirect);
};
