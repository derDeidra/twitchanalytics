exports.render = function(req, res) {
    if(req.session.auth_token){
        res.redirect('/dashboard');
    } else {
        res.render('landing', {});
    }
};
