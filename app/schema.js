var mongoose = require('mongoose');

//Define the mongoose user schema
var UserSchema = new mongoose.Schema({
    username : String,
    oauth : String
});


var User = mongoose.model('User', UserSchema);

var ParamSchema = new mongoose.Schema({
    key: String,
    value: Number
});

var Param = mongoose.model('Param', ParamSchema);

var ModelSchema = new mongoose.Schema({
    model_name : String,
    params : [mongoose.Schema.Types.ObjectId]
});

ModelSchema.pre("remove", function(next){
    for(var i = 0; i < this.params.length; i++){
        Param.remove({_id : this.params[i]}).exec();
    }
    next();
});

var Model = mongoose.model('Model', ModelSchema);

var TaskSchema = new mongoose.Schema({
    task_name : String,
    channel_names : [String],
    models : [mongoose.Schema.Types.ObjectId]
});

TaskSchema.pre("remove", function(next){
    for(var i = 0; i < this.models.length; i++){
        Model.remove({_id : this.models[i]}).exec();
    }
    next();
});

var Task = mongoose.model('Task', TaskSchema);

module.exports = {
    User : User,
    Task : Task,
    Param : Param,
    Model : Model
};
