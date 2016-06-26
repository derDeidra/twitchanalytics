var mongoose = require('mongoose');

var RawSchema = new mongoose.Schema({
    from : String,
    text : String,
    channel : String
});

var Raw = mongoose.model('Raw', RawSchema);

//Define the mongoose user schema
var UserSchema = new mongoose.Schema({
    username : String,
    oauth : String,
    tasks : [mongoose.Schema.Types.ObjectId]
});


var User = mongoose.model('User', UserSchema);

var ParamDataSchema = new mongoose.Schema({
    param: String,
    channel: String,
    value: Number
});

var ParamData = mongoose.model('ParamData', ParamDataSchema);

var ModelSchema = new mongoose.Schema({
    name : String,
    params : {
        type: [String],
        get: function(data) {
            var arrBuilder = [];
            for(var i = 0; i < data.length; i++){
                arrBuilder.push({param : data[i]});
            }
            return arrBuilder;
        },
        set: function(data) {
            var arrBuilder = [];
            for(var i = 0; i < data.length; i++){
                arrBuilder.push(data[i].param);
            }
            return arrBuilder;
        }
    },
    data : [mongoose.Schema.Types.ObjectId]
});

ModelSchema.pre("remove", function(next){
    for(var i = 0; i < this.data.length; i++){
        ParamData.remove({_id : this.data[i]}).exec();
    }
    next();
});

var Model = mongoose.model('Model', ModelSchema);

var TaskSchema = new mongoose.Schema({
    owner : String,
    name : String,
    channels : {
        type: [String],
        get: function(data) {
            var arrBuilder = [];
            for(var i = 0; i < data.length; i++){
                arrBuilder.push({channel : data[i]});
            }
            return arrBuilder;
        },
        set: function(data) {
            var arrBuilder = [];
            for(var i = 0; i < data.length; i++){
                arrBuilder.push(data[i].channel);
            }
            return arrBuilder;
        }
    },
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
    ParamData : ParamData,
    Model : Model,
    Raw : Raw
};
