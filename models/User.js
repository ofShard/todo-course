var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    ObjectId = Schema.ObjectId,
    crypto = require('crypto'),
    uid = require('../tools').uid,
    PWD_ROUNDS_MAX = 999999999, // One Billion - 1
    PWD_ROUNDS_MIN = 5000,
    PWD_ROUNDS_DEFAULT = 40000;

var UserSchema = new Schema({
    username: {type:String, unique:true, sparse:true},
    name: String,
    email: {type:String, unique:true, sparse:true, set:function(email) { return email.toLowerCase(); }},
    password: {salt: String, hash: String},
    joined: {type:Date, default:Date.now},
    calendar: ObjectId
});

UserSchema.methods.setPassword = function setPassword(plaintext, rounds) {
    // Set rounds to the default, if not provided, or limit it to the MIN/MAX range.
	rounds = Math.min(PWD_ROUNDS_MAX, (Math.max(PWD_ROUNDS_MIN, rounds || PWD_ROUNDS_DEFAULT)));
    
    var salt = uid(24),
        hash = this.getHashedPassword(plaintext, salt, rounds);
    
    this.password.salt = salt;
    this.password.hash = hash;
    this.password.rounds = rounds
};

UserSchema.methods.checkPassword = function checkPassword(plaintext) {
	var hash = this.getHashedPassword(plaintext, this.password.salt, this.password.rounds);
	
	if( hash === this.password.hash ) return true;
	
	return false;
};

/**
 * 
 * @param {String} plaintext
 * @param {String} salt
 * @param {Number} [rounds]
 * @return {String}
 */
UserSchema.methods.getHashedPassword = function getHashedPassword(plaintext, salt, rounds) {
	// RECOMMENDATION: Currently using sha512, as this is officially recognized by the
	// US Government as secure, and hence a requirement handed down by management in
	// certain applications. However, bcrypt is more hostile to attackers. Sha512 runs
	// about 10-20 times faster on the GPU than the CPU for similar price-point
	// hardware, which gives the attacker a computational advantage. However, bcrypt is
	// specifically designed to be hostile to the GPU computing environment, which
	// means the attacker gets no advantage.
	
	// Set rounds to the default, if not provided, or limit it to the MIN/MAX range.
	rounds = Math.min(PWD_ROUNDS_MAX, (Math.max(PWD_ROUNDS_MIN, rounds || PWD_ROUNDS_DEFAULT)));
	
	var digest = salt+plaintext;
	
	for( var i=0; i<rounds; i++ ) {
		digest = hash(digest);
	}
	
	return digest;
	
	function hash(str) {
		return crypto.createHash('sha512').update(str).digest('base64');
	}
};

module.exports = mongoose.model('User', UserSchema);