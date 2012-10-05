var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId;

var EventSchema = new Schema({
    title: {type:String, required:true},
    start: {type:Date, required:true, index:true},
    end: {type:Date, sparse:true},
    allDay: Boolean,
    calendar: {type:ObjectId, select:false, index:true}
}, {versionKey:false});

//EventSchema.index({start:1, end:1}, {sparse:true});

module.exports = mongoose.model('Event', EventSchema);