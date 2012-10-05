var crypto = require('crypto');

/**
 * Randomly generates a string of the specified length.
 * 
 * @param {Integer} len How long a string to generate.
 * @param {String} [pool='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'] Characters to draw the random string from.
 * @returns {String} The uid.
 */
exports.uid = function uid(len, pool) {
    var S = pool || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
        str = '';
	
	for( var i=0; i<len; i++ ) {
		str += S[randInt(0, S.length-1)];
	}
	
	return str;
};

exports.randInt = randInt;
function randInt(min, max) {
    var range = max-min+1;

	try {
		var sampleMax = Math.pow(2, 32)-1,
			acceptableMax = Math.floor(sampleMax/range)*range-1,
			sample;

		do {
			sample = crypto.randomBytes(4).readUInt32LE(0);
		} while( sample > acceptableMax );
		
		return min + (sample % range);
	}
	catch(e) {
		return Math.floor(min + (Math.random()*range));
	}
}

exports.mapToApp = function mapToApp(routes, app) {
    var method, route;

    for( method in routes ) {
        for( route in routes[method] ) {
            app[method](route, routes[method][route]);
        }
    }
};

exports.mapToObject = function mapToObject(routes, object) {
    var method, route;
    
    for( method in routes ) {
        for( route in routes[method] ) {
            object[method][route] = routes[method][route];
        }
    }
}