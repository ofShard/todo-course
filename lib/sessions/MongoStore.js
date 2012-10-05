var Store = require('express').session.Store,
    _collection,
    _db,
    _defaults = {collection:'sessions'};

module.exports = MongoStore;
function MongoStore(options) {
    this.db = _db = options.db;
	
	var self = this;
	
	Store.call(this, options);
	
	_db.collection(options.collection||_defaults.collection, function(err, col) {
		self.collection = _collection = col;
	});
}

/**
 * Inherit from Store
 */
require('util').inherits(MongoStore, Store);

/**
 * Attempt to fetch the session associated with the given `sid`.
 * 
 * @param {String} sid Session ID
 * @param {Function} cb Callback in format function(error, session).
 */
MongoStore.prototype.get = function(sid, cb) {
	_collection.findOne({_id:sid}, function(err, data) {
		var sess;
		
		if( data && data.session ) {
			sess = data.session;
		}
		
		cb(err, sess);
	});
};

/**
 * Attempt to store the given session.
 * 
 * @param {String} sid Session ID
 * @param {Session} sess Object containing the session data.
 * @param {Function} cb Callback
 */
MongoStore.prototype.set = function(sid, sess, cb) {
	var data = {_id:sid, session:sess};
	if( sess && sess.cookie && sess.cookie.expires ) {
		data.expires = Date.parse(sess.cookie.expires);
	}
	
	_collection.update({_id:sid}, data, {upsert:true}, function(err, data) {
		cb(err, data);
	});
};

/** Attempt to delete the session associated with `sid` from storage.
 * 
 * @param {String} sid Session ID
 * @param {Function} cb Callback.
 */
MongoStore.prototype.destroy = function(sid, cb) {
	_collection.remove({_id:sid}, cb);
};