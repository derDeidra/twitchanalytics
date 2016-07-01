exports.render = function(req, res) {
    res.render('visualizer', { page : 'visualizer', display_name : req.session.display_name });
};