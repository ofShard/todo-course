var User = require("../models/User");

exports.get = {};
exports.post = {};
exports.all = {};

exports.get["/register"] = function(request, response){
    response.render('register');
};

exports.post['/register'] = function(request, response) {
    var username = request.body.username,
        password = request.body.password,
        confirm = request.body.confirm,
        email = request.body.email;
    
    console.log('params', request.body);
    
    if( !password || password !== confirm ) {
        var error = new Error('The two passwords must match');
        
        return response.render('register', {err:error});
    }
    
    if( !username ) {
        return response.render('register', {err:'You must provide a username'});
    }
    
    if( !email ) {
        return response.render('register', {err:'You must provide an email address.'});
    }
    
    var newUser = new User({username:username, email:email});
    
    newUser.setPassword(password);
    
    newUser.save(function(err) {
        if( err ) {
            return response.render('register', {err:err});
        }
        
        request.session.userID = newUser._id;
        request.user = newUser;
        
        console.log('user saved', newUser);
        
        response.redirect('/');
    });
};