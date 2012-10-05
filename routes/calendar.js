var Calendar = require("../models/Calendar"),
    User = require("../models/User"),
    Event = require('../models/Event'),
    sio = require('../socketIoBridge').sio;

var mongoose = require('mongoose'),
    ObjectId = mongoose.Types.ObjectId;

exports.get = {};
exports.post = {};
exports.all = {};

exports.get["/calendar"] = function(request, response){
    response.render('calendar');
};

exports.get['/calendar/:calendarID'] = function(request, response) {
    
};

exports.get['/calendar/:calendarID/events'] = function(request, response) {
    var start = new Date(request.query.start*1000),
        end = new Date(request.query.end*1000);
    
    console.log('events range', start, end);
    
    //if( (start >= s && start < e) || (end > s && end < e) || (end > s && start < e) )
    
    var or = [
            {start:{$gte:start, $lt:end}}, // Starts within range.
            {end:{$gt:start, $lt:end}}, // Ends within range.
            {end:{$exists:true, $gt:start}, start:{$lt:end}} // Starts before range and ends after range.
        ];
    
    Event.find({calendar:request.params.calendarID, $or:or}, '-calendar', {sort:'start'}, function(err, docs) {
        if( err ) return internalError(response);
        
        console.log('event count', docs.length);
        
        response.end(JSON.stringify(docs));
    });
};

exports.get['/user/:userID/calendar'] = function(request, response) {
    var userID = request.params.userID;
    
    Calendar.findOne({owner:userID}, function(err, doc) {
        if( err ) {
            console.log('error retrieving calendar', err.stack||err);
            return;
        }
        
        if( !doc ) {
            var user = request.user;
            
            if( !user || user._id.toString() !== userID ) {
                console.log('Insufficient privileges to create this calendar.');
                return;
            }
            
            console.log('creating calendar');
            doc = new Calendar();
            doc.owner=userID;
            doc.save(function(err) {
                if( err ) {
                    console.log('error creating calendar', err.stack||err);
                    return;
                }
                
                console.log('updating user\'s calendar');
                User.update({_id:userID}, {calendar:doc._id}, function(err) {
                    if( err ) {
                        console.log('error updating user calendar', err.stack||err);
                        return;
                    }
                    
                    renderCalendar(doc);
                });
            });
        }
        else renderCalendar(doc);
    });
    
    function renderCalendar(calendar) {
        var user = request.user,
            requestWrite = user && calendar.owner.equals(user._id);
        
        response.render('calendar', {calendar:calendar, requestWrite:requestWrite});
    }
};


function internalError(res) {
    var body = 'Internal Server Error';
    res.setHeader('Content-Type', 'text/plain');
	res.setHeader('Content-Length', body.length);
    res.statusCode = 500;
    res.end(body);
}

sio.of('calendar').on('connection', function(socket) {
    console.log('connected to calendar');
    var session = socket.handshake.session;
    
    socket.on('calendar', function(calendarID, requestWrite) {
        handleAccess(session.userID, calendarID, requestWrite, function(err, calendar, canWrite) {
            if( err ) {
                console.log('error', err.message||err);
                return socket.emit('error', err.message||err);
            }
            
            socket.emit('success');
            
            handleSocket(socket, calendar, canWrite);
        });
    });
});

function handleSocket(socket, calendar, canWrite) {
    socket.join(calendar._id.toString());
    socket.emit('can write', canWrite);
    
    if( canWrite ) {
        socket.on('write', function(data) {
            socket.broadcast.emit('write', data);
        });
        
        socket.on('event created', function(event, nonce) {
            console.log('event created', event, nonce);
            calendar.createEvent(event, function(err, newEvent) {
                if( err ) {
                    console.log('error creating event', err.stack||err);
                    return socket.emit('error', err.message);
                }
                
                delete newEvent.calendar;
                
                console.log('broadcasting new event', newEvent);
                socket.emit('event id', newEvent.id, nonce);
                //socket.emit('event created', newEvent);
                socket.broadcast.emit('event created', newEvent);
            });
        });
        
        socket.on('event changed', function(event) {
            console.log('event changed', event);
            
            var _id = event._id;
            
            delete event._id;
            
            Event.update({_id:_id}, event, function(err) {
                if( err ) {
                    return socket.emit('error', err.message);
                }
                
                event._id = _id;
                
                console.log('broadcast event changed');
                socket.broadcast.emit('event changed', event);
            });
        });
        
        socket.on('event removed', function(eventID) {
            console.log('event removed', eventID);
            Event.remove({_id:eventID}, function(err) {
                if( err ) return socket.emit('error', err.message);
                Calendar.update({_id:calendar._id}, {$pull:{events:eventID}}, function(err) {
                    if( err ) return socket.emit('error', err.message);
                    
                    console.log('broadcast event removed', eventID);
                    socket.broadcast.emit('event removed', eventID);
                });
            });
        });
    }
}

function handleAccess(userID, calendarID, requestWrite, callback) {
    Calendar.findById(calendarID).exec(function(err, calendar) {
        if( err ) {
            return callback(err);
        }
        else if( !calendar ) {
            return callback(new Error('Calendar does not exist.'));
        }
        else if( !requestWrite ) {
            return callback(null, calendar, true);
        }
        else if( !userID ) {
            return callback(new Error('Insufficient permissions for '+(requestWrite?'write':'read')+' access.'));
        }
        else if( calendar.owner.equals(userID) ) {
            if( requestWrite ) return callback(null, calendar, true);
            
            return callback(null, calendar, false);
        }
        else if( requestWrite ) {
            return callback(new Error('Insufficient permissions for write access.'));
        }
        else if( !calendar.contributors || !calendar.contributors.length ) {
            return callback(new Error('Insufficient permissions for read access.'));
        }
        else {
            for( var i=0; i<calendar.contributors.length; i++ ) {
                if( calendar.contributors[i].equals(userID) ) {
                    return callback(null, calendar, false);
                }
            }
            
            return callback(new Error('Insufficient permissions for read access.'));
        }
    });
}

sio.sockets.on('connection', function(socket) {
    console.log('socket connected');
    socket.on('message', function(data) {
        console.log('message', data);
    });
});
