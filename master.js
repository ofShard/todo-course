// Run this in production:
// forever start master.js

var cluster = require('cluster'),
    numCPUs = require('os').cpus().length,
    numWorkers = Math.min(2, numCPUs),
    expectedWorkers = numWorkers,
    fs = require('fs');

if( !cluster.isMaster ) return;

cluster.setupMaster({
    exec:'app.js',
    silent:true
});

for( var i=0; i<numWorkers; i++ ) {
    cluster.fork();
}


/** Inside a worker
 * process.send('sent to master', {my:'data'});
 */

/** In master
 * worker.on('message', function(data) {
 *    var otherWorker;
 *    for( var i in cluster.workers ) {
 *       otherWorker = cluster.workers[i];
 *       if( otherWorker !== worker ) {
 *           otherWorker.send(data);
 *       }
 *    }
 * }
 */


/////////
// Log //
/////////

var colors = require('colors');
var logHandle = fs.createWriteStream('./logs/cluster.log', {flags:"a"});
var log = function(msg, col){

    var sqlDateTime = function(time){
		if(time == null){ time = new Date(); }
		var dateStr =
			padDateDoubleStr(time.getFullYear()) +
			"-" + padDateDoubleStr(1 + time.getMonth()) +
			"-" + padDateDoubleStr(time.getDate()) +
			" " + padDateDoubleStr(time.getHours()) +
			":" + padDateDoubleStr(time.getMinutes()) +
			":" + padDateDoubleStr(time.getSeconds());
		return dateStr;
	};

	var padDateDoubleStr = function(i){
		return (i < 10) ? "0" + i : "" + i;
	};

	msg = sqlDateTime() + " | " + msg;
	logHandle.write(msg + "\r\n");

	if(typeof col == "string"){col = [col];}
	for(var i in col){
		msg = colors[col[i]](msg);
	}

	console.log(msg);
}

//////////
// Main //
//////////
log(" - STARTING CLUSTER -", ["bold", "green"]);

cluster.on('exit', function(worker, code, signal) {
    log("worker " + worker.process.pid + " (#"+worker.id+") has exited");
	setTimeout(reloadWorker, 1000) // to prevent CPU-splsions if crashing too fast
});

function reloadWorker() {
    var count = 0;
    
    for( var i in cluster.workers ) count++;
    
    if( count < numWorkers ) {
        cluster.fork();
    }
}

var restarting = false;

function rollingRestart() {
    if( restarting ) return log('Cannot process new restart command while restarting.');
    
    restarting = true;
    
    var closingWorkers = [],
        restartedWorkers = 0;
    
    for( var i in cluster.workers ) {
        closingWorkers.push(cluster.workers[i]);
    }
    
    restartOneWorker();
    
    function restartOneWorker() {
        if( restartedWorkers >= numWorkers ) return (restarting = false);
        
        var closingWorker = closingWorkers.pop(),
            worker = cluster.fork();
        
        worker.on('listening', function() {
            closingWorker.disconnect();
            closingWorker.send('stop');
            
            // Force close the worker after ten seconds.
            setTimeout(function() {
                closingWorker.destroy();
            }, 10000);
            
            restartedWorkers++;
            
            setTimeout(restartOneWorker, 1000);
        });
    }
}