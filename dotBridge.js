var dot = require('dot')
  , fs = require('fs');

var cache = exports.cache = {},
    loading = {},
    mtimes = {};

dot.templateSettings.strip = false;

exports.__express = dotExpressBridge;
function dotExpressBridge(path, options, callback) {
    if( typeof options === 'function' ) {
        callback = options;
        options = {};
    }
    
    if( cache[path] ) {
        try {
            return callback(null, cache[path](options));
        }
        catch(err) {
            return callback(err);
        }
    }
    else {
        var group = (loading[path] = loading[path] || []),
            pathLoading = loading[path] && loading[path].length;
        
        group.push(callback);
        
        if( pathLoading ) return;
        
        fs.readFile(path, 'utf8', function(err, str) {
            var i, len;
            
            try {
                cache[path] = dot.compile(str);
                
                for( i=0, len=group.length; i<len; i++ ) {
                    group[i](null, cache[path](options));
                }
                
                delete loading[path];
            }
            catch(err) {
                for( i=0, len=group.length; i<len; i++ ) {
                    group[i](err);
                }
                
                delete loading[path];
            }
        });
    }
}

var intervalID = setInterval(checkMTimes, 3000);

function checkMTimes() {
    for( var path in cache ) {
        checkMTime(path);
    }
    
    function checkMTime(path) {
        fs.stat(path, function(err, stat) {
            if( mtimes[path] && mtimes[path] < stat.mtime ) {
                delete cache[path];
            }
            
            mtimes[path] = stat.mtime;
        });
    }
}

dot.__express = exports.__express;