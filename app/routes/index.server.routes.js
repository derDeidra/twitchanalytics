module.exports = function(app) {
    var landing = require('../controllers/landing.server.controller');
    var dashboard = require('../controllers/dashboard.server.controller');
    var auth = require('../controllers/auth.server.controller');

    app.get('/', landing.render);
    app.get('/dashboard', dashboard.render);
    app.get('/auth', auth.initialize);
    app.get('/auth_redirect', auth.handleRedirect);
};
