var mongoose = require('mongoose'),
    express = require('express'),
    http = require('http'),
    app = express(),
    server = http.createServer(app),
    path = require('path'),
    tools = require('./tools'),
    sio,
    User = require('./models/User'),
    dbpath = 'mongodb://cloud9:mdm01Master@alex.mongohq.com:10097/ofshardSandbox';

initDatabase();

function initDatabase() {
    mongoose.connect(dbpath);
    
    mongoose.connection.once('open', function() {
        setupServer();
        initServer();
    });
    
    mongoose.connection.once('error', function(err) {
        console.log('Error connecting to database:');
        console.log(err, err.stack);
    });
}

function setupServer() {
    app.configure(function(){
        require('./dotBridge');
        
        app.set('port', process.env.PORT || 3000);
        app.set('dbpath', dbpath);
        app.set('views', path.join(__dirname, '/views'));
        app.set("view engine", "dot");
        app.set('host', 'http://todo-course.ofshard.c9.io');
        
        var MongoStore = require('./lib/sessions/MongoStore'),
            sessionKey = 'express.sid',
            sessionSecret = 'duPJiBWRdIYOgS6yXM1X',
            sessionStore = new MongoStore({db:mongoose.connection.db});
        
        app.use(express.favicon());
        app.use(express.logger('tiny'));
        app.use(express.bodyParser());
        app.use(express.methodOverride());
        app.use(express.cookieParser(sessionSecret));
        app.use(express.session({
            key:sessionKey,
            secret:sessionSecret,
            store:sessionStore
        }));
        
        var url = require('url');
        
        app.use(function(req, res, next) {
            req.sio = sio;
            var _redirect = res.redirect;
                
            res.redirect = function redirect(path) {
                _redirect.call(res, url.resolve(app.get('host'), path));
            };
            next();
        });
        app.use(function(req, res, next) {
            if( req.session && req.session.userID ) {
                User.findById(req.session.userID, function(err, user) {
                    if( err ) {
                        return next(err);
                    } else if( !user ) {
                        return next();
                    } else {
                        req.user = user;
                        next();
                    }
                });
            } else next();
        });
        app.use(app.router);
        app.use(express.static(path.join(__dirname, 'public')));
        
        initSocketIo(server, sessionKey, sessionSecret, sessionStore);
    });
}

function initServer() {
    var routes = require('./routes');
    
    tools.mapToApp(routes, app);

    server.listen(app.get('port'), function() {
        console.log('express listening on port', app.get('port'));
    });
}

function initSocketIo(server, sessionKey, sessionSecret, sessionStore) {
    var socket = require('./socketIoBridge');
    
    socket.init(server, sessionKey, sessionSecret, sessionStore);
    
    sio = socket.sio;
}

module.exports = app;