exports.render = function(req, res) {
    res.render('tasks', { page : 'tasks', display_name : req.session.display_name });
};
