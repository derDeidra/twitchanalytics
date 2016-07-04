exports.render = function(req, res) {
    res.render('query', { page : 'query', display_name : req.session.display_name });
};