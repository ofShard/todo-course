var connect = require('connect'),
    cookie = require('cookie'),
    utils = connect.utils;

exports.init = init;
function init(server, sessionKey, sessionSecret, sessionStore) {
    
    var io = require('socket.io'),
        Session = connect.middleware.session.Session;

    var sio = exports.sio = io.listen(server);
    
    sio.set('log level', 1);
    sio.set('transports', ['htmlfile', 'xhr-polling', 'jsonp-polling']);

    sio.set('authorization', function(data, callback) {
		if( data.headers.cookie ) {
            var parsedCookies = parseCookies(data.headers.cookie, sessionSecret);
            data.cookies = parsedCookies.cookies;
            data.signedCookies = parsedCookies.signedCookies;
			data.sessionID = sessionSecret ? data.signedCookies[sessionKey] : data.cookies[sessionKey];
            data.sessionStore = sessionStore;

			sessionStore.get(data.sessionID, function(err, session) {
				if( err || !session ) {
					callback('Could not validate session.', false);
				} else {
					data.session = new Session(data, session);
					callback(undefined, true);
				}
			})
		} else {
			callback('Could not validate session. No cookie transmitted.', false);
		}
	});

	sio.sockets.on('connection', function(socket) {
		var session = socket.handshake.session;

        socket.emit('news', {hello:'world', user:session.userID});
        socket.on('my other event', function(data) {
            console.log('my other event', data);
        });

		var intervalID = setInterval(function() {
			session.reload(function() {
				session.touch().save();
			});
		}, 60*1000);

		socket.on('disconnect', function(){
			console.log('socket disconnected');

			clearInterval(intervalID);
		});
	});
}

function parseCookies(cookies, secret) {
    var data = {};
    
    if( !cookies ) return {};
    
    data.secret = secret;
    data.cookies = {};
    data.signedCookies = {};

    data.cookies = cookie.parse(cookies);
    if (secret) {
      data.signedCookies = utils.parseSignedCookies(data.cookies, secret);
      var obj = utils.parseJSONCookies(data.signedCookies);
      data.signedCookies = obj;
    }
    data.cookies = utils.parseJSONCookies(data.cookies);
    
    
    return data;
}