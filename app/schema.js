var mongoose = require('mongoose');

//Define the mongoose user schema
var UserSchema = new mongoose.Schema({
    username : String,
    oauth : String
});


var User = mongoose.model('User', UserSchema);

module.exports = {
    User : User
};
