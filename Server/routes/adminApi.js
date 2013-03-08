var nconf = require('nconf');
var fs = require('fs');
var http = require('http');

/**
 * Refresh settings
 */
exports.reloadOcr = function(req, res) {
	res.set('Content-Type', 'application/json');
	var response = {
		status : 'done'
	}
	res.send(response, 200);
};

/**
 * Refresh settings
 */
exports.truncateImages = function(req, res) {
	var allFiles = fs.readdirSync(env.path + '/upload/');
	for (var i = 0; i < allFiles.length; i++) {
		fs.unlink(env.path + '/upload/' + allFiles[i]);
	}
	var response = {
		status : 'done'
	}
	res.send(response, 200);
};

/**
 * Images table
 */
exports.loadImages = function(req, res) {
	var allFiles = fs.readdirSync(env.path + '/upload/');
	var files = [];
	for (var i = 0; i < allFiles.length; i++) {
		if (allFiles[i].indexOf('_') == -1) {
			files.push({
				file : allFiles[i],
				name : allFiles[i].replace(/(.*)\.(.*?)$/, "$1"),
				extension : getExtension(allFiles[i])
			});
		}
	}
	//console.log(JSON.stringify(files));
	res.render('images', {
		files : files,
		stepsCount : (nconf.get('ocr:steps')).length
	});
};

/**
 * Images table
 */
exports.loadStatus = function(req, res) {
	res.render('statuses', {
		server : {
			version : req.config.server.version,
			debug : req.config.server.debug
		}
	});
};
/**
 * Config table
 */
exports.loadConfig = function(req, res) {
	nconf.load();
	ocr = nconf.get('ocr');
	res.render('configs', {
		steps : ocr.steps,
	});

};
/**
 * Config apply to OCR server
 */
exports.applyConfig = function(req, res) {
	try {
		var options = {
			host : '127.0.0.1',
			port : cfg.server.http.port,
			path : '/api/reloadConfig/' + req.config.key
		};
		var callback = function(response) {
			var data = '';
			response.on('data', function(chunk) {
				data += chunk;
			});
			response.on('end', function(chunk) {
				res.send(data, 200);
			});
		}
		var client = http.request(options, callback);
		client.end();
	} catch(e) {
		logger.error(e);
		var response = {
			error : 'invalid key',
			status : 'error'
		}
		res.send(response, 200);
	}
};
/**
 * Accesss logs
 */
exports.loadAccessLog = function(req, res) {
	var logLines = 100;
	var array = fs.readFileSync(env.path + "/log/access.log").toString().split("\n");
	var logs = [];
	var lines = {
		from : (array.length - logLines - 1 > 0) ? array.length - 1 - logLines : 0,
		to : array.length - 2
	};
	//for (var ind = lines.from; ind < lines.to; ind++) {
	for (var ind = lines.to; ind > lines.from; ind--) {
		var log = JSON.parse(array[ind]);
		log.date = dateFormat(new Date(log.timestamp), "%Y.%m.%d", true);
		log.time = dateFormat(new Date(log.timestamp), "%H:%M:%S", true);
		logs.push(log);
	}
	array = [];
	res.render('logsAccess', {
		logs : logs
	});

};
/**
 * App logs
 */
exports.loadAppLog = function(req, res) {
	var logLines = 100;
	var array = fs.readFileSync(env.path + "/log/app.log").toString().split("\n");
	var logs = [];
	var lines = {
		from : (array.length - logLines - 1 > 0) ? array.length - 1 - logLines : 0,
		to : array.length - 2
	};
	//for (var ind = lines.from; ind < lines.to; ind++) {
	for (var ind = lines.to; ind > lines.from; ind--) {
		var log = JSON.parse(array[ind]);
		log.date = dateFormat(new Date(log.timestamp), "%Y.%m.%d", true);
		log.time = dateFormat(new Date(log.timestamp), "%H:%M:%S", true);
		logs.push(log);
	}
	array = [];
	res.render('logsApp', {
		logs : logs
	});

};
exports.ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}
/*CONFIG begin*/
var cfg = {};
var ocr = {};
var env = {};
nconf.argv().env();
env.path = nconf.get('path');
nconf.file('server', env.path + '/config.json');
nconf.file('ocr', env.path + '/ocr.json');
nconf.file('users', env.path + '/users.json');
cfg.server = nconf.get('server');
ocr = nconf.get('ocr');
users = nconf.get('users');
/*CONFIG end*/

/**
 * Get extension from file path
 */
function getExtension(filePath) {
	var re = /(?:\.([^.]+))?$/;
	return re.exec(''+filePath)[1];
}

function dateFormat(date, fstr, utc) {
	utc = utc ? 'getUTC' : 'get';
	return fstr.replace(/%[YmdHMS]/g, function(m) {
		switch (m) {
			case '%Y':
				return date[utc + 'FullYear']();
			// no leading zeros required
			case '%m':
				m = 1 + date[utc + 'Month']();
				break;
			case '%d':
				m = date[utc + 'Date']();
				break;
			case '%H':
				m = date[utc + 'Hours']();
				break;
			case '%M':
				m = date[utc + 'Minutes']();
				break;
			case '%S':
				m = date[utc + 'Seconds']();
				break;
			default:
				return m.slice(1);
			// unknown code, remove %
		}
		// add leading zero if required
		return ('0' + m).slice(-2);
	});
}