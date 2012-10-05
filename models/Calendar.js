var mongoose = require('mongoose'),
	User = require("./User"),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    Event = require('./Event'),
    Calendar;

var CalendarSchema = new Schema({
    name: String,
	events: [{type:ObjectId, ref:'Event'}],
	owner: { type: ObjectId, required: true },
    authors: [ObjectId],
    readers: [ObjectId],
	contributors: [ { type: ObjectId } ]
});

CalendarSchema.methods.createEvent = function createEvent(data, callback) {
    var event = new Event(data),
        self = this;
    
    event.calendar = this._id;
    
    event.save(function(err) {
        if( err ) return callback(err);
        
        Calendar.update({_id:self._id}, {$push:{events:event._id}}, function(err) {
            if( err ) return callback(err);
            
            callback(null, event);
        });
    });
};

CalendarSchema.methods.addEvent = function addEvent(event, callback) {
    var eventID = event instanceof Event ? event._id : event;
    
    if( event instanceof Event && event.calendar ) return this.createEvent(event, callback);
    
    event.calendar = this._id;
    event.save();
    
    Calendar.update({_id:this._id}, {$addToSet:{events:eventID}}, callback);
};

/**
 * @param {ObjectId} userID
 * @param {Boolean} [canWrite=false]
 * @param {Function} [callback]
 */
CalendarSchema.methods.shareWithUser = function shareWithUser(userID, canWrite, callback) {
    if( typeof canWrite === 'function' ) {
        callback = canWrite;
        canWrite = false;
    }
    
    if( typeof userID === 'string' ) userID = ObjectId.fromString(userID);
    
    var update = {$addToSet:{}};
    
    update.$addToSet[canWrite?'authors':'readers'] = userID;
    
    this.model('Calendar').update({_id:this._id}, update, callback);
};

CalendarSchema.methods.shareWithEmail - function shareWithEmail(email, canWrite, callback) {
    if( typeof canWrite === 'function' ) {
        callback = canWrite;
        canWrite = false;
    }
    
    var self = this;
    
    callback = callback || function(){};
    
    User.findOne({email:email.toLowerCase()}, function(err, user) {
        if( err ) return callback(err);
        else if( !user ) return callback(new Error('That user has not registered.'));
        // TODO: Send an email if not registered.
        
        self.shareWithUser(user._id, canWrite, callback);
    });
};

module.exports = Calendar = mongoose.model('Calendar', CalendarSchema);