var User = require("../models/User");

exports.get = {};
exports.post = {};
exports.all = {};

exports.get["/login"] = function(request, response){
    
    response.render("login", {});
};

exports.post["/login"] = function(request, response){
    var username = request.body.username;
    var password = request.body.password;
    
    User.findOne({username: username}, function(err, user){
        if( err || !user ) {
            // handle error
            if( !user ) err = new Error('No user by that username exists.');
            
            return response.render('login', {error:err});
        }
        
        console.log('login', user);
        
        if(user.checkPassword(password)){
            console.log('password correct', request.session, request.sessionID);
            if( request.sessionID && request.session ) {
                request.session.userID = user._id;
                request.user = user;
            }
            response.redirect("/");
        }else{
            err = new Error("Login incorrect!");
            return response.render('login', {error:err});
        }
    });
};