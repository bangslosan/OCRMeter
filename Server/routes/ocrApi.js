var im = require('imagemagick');
var exec = require('child_process').exec;
var fs = require('fs');
var nconf = require('nconf');
var winston = require('winston');
var utils = require('../lib/utils');

exports.parseValueForm = function(req, res) {
	if (cfg.server.debug === true) {
		res.send('<form method="post" enctype="multipart/form-data">' + '<p>Image: <input type="file" name="image" /></p>' + '<p><input type="submit" value="Upload" /></p>' + '</form>');
	}
};
/**
 * Get API version
 */
exports.getVersion = function(req, res) {
	res.set('Content-Type', 'application/json');
	var response = {
		version : nconf.get('server:version')
	}
	res.send(response, 200);
};
/**
 * Get status of service
 */
exports.getStatus = function(req, res) {
	res.set('Content-Type', 'application/json');
	var response = {
		version : nconf.get('server:version'),
		debug : (cfg.server.debug) ? 'on' : 'off',
		status : 'running'
	}
	res.send(response, 200);
};
/**
 * Nothing to parse / no image
 */
exports.nothingToParse = function(req, res) {
	res.set('Content-Type', 'application/json');
	var response = {
		error : 'nothing to parse',
		status : 'error'
	}
	res.send(response, 200);
};
/**
 * Reload configs with valid keys
 */
exports.reloadConfig = function(req, res, next) {
	logger.info('Reloading config...')
	if (req.config.key === req.params.key) {
		nconf.load();
		cfg.server = nconf.get('server');
		ocr = nconf.get('ocr');
		users = nconf.get('users');
		var response = {
			status : 'done'
		}
		res.send(response, 200);
	} else {
		var response = {
			error : 'invalid key',
			status : 'error'
		}
		res.send(response, 200);
	}
};
/**
 * Check request parameters
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
exports.checkRequest = function(req, res, next) {
	if (!req.params.config) {
		//load default config
		logger.warn('No config. Using default config');
		req.params.config = ocr.config;
		//nconf.get('ocr:config');
	}
	if (req.files.image.size != 0) {
		next();
	} else {
		logger.warn('No image to parse');
		res.redirect('/api/nothingToParse');
		return;
	}
}
/**
 * Upload file to a directory
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
exports.prepareImages = function(req, res, next) {
	var f = {
		name : Math.random().toString(36).substring(7),
		extension : utils.getExtension(req.files.image.path)
	};
	try {
		req.app = {};
		req.app.files = {};
		req.app.files.name = f.name;
		req.app.files.extension = f.extension;
		req.app.files.original = env.path + '/upload/' + f.name + '.' + f.extension;
		req.app.files.steps = [];
		req.app.results = [];
		//create backup
		fs.createReadStream(req.files.image.path).pipe(fs.createWriteStream(req.app.files.original));
		//prepare images for presteps
		var steps = ocr.steps;
		for (var i = 0; i < steps.length; i++) {
			var filePath = env.path + '/upload/' + f.name + '_' + i + '.' + f.extension;
			utils.copyFileSync(req.files.image.path, filePath);
			req.app.files.steps.push(filePath);
		}
		fs.unlink(req.files.image.path);
		next();
		//unlink temp file
		//go for next step

	} catch(err) {
		logger.error(err);
		res.redirect('/500');
	}
}
/**
 * Parse value
 * @param {Object} req Request
 * @param {Object} res Response
 * @param {Object} next Next
 */
exports.parseValue = function(req, res, next) {
	var filePath = env.path + '/upload/' + req.files.image.newName;
	//var ocr = {};
	//ocr.steps = ocr.config.steps;
	//nconf.get('ocr:steps');
	//ocr.preSteps = ocr.config.preSteps;
	//nconf.get('ocr:preSteps');
	console.log(ocr.steps);
	var stepsRunning = 0;
	var stepsDone = 0;
	//run presteps + steps
	for (var i = 0; i < ocr.steps.length; i++) {
		var stepSteps = [];
		//steps.push(ocr.preSteps[i]);
		//steps = steps.concat(ocr.steps);
		stepSteps=ocr.steps[i];
		//logger.debug(steps);
		stepsRunning = 0;
		runStep(stepSteps, stepsRunning, req.app.files.steps[i], function(file) {
			runOcr(file, function(err, text) {
				stepsDone++;
				if (err) {
					logger.error(err);
				} else {
					text = trim(text);
					//logger.debug(filePath + ' => ' + text);
					req.app.results.push(text)
				}
				if (stepsDone == req.app.files.steps.length) {
					var response = {
						status : 'done',
						ocrValues : req.app.results,
						value : '-',
						number : 0
					};
					//do some magic
					response.value = utils.mergeValues(req.params.config, response.ocrValues);
					response.number = parseInt(response.value, 10) / Math.pow(10, req.params.config.decimalPlaces);
					//response
					res.set('Content-Type', 'application/json');
					res.send(response, 200);
					if (cfg.server.debug != true) {
						//remove temp files
						req.app.files.original
						fs.unlink(req.app.files.original);
						var steps = nconf.get('ocr:steps');
						for (var i = 0; i < steps.length; i++) {
							fs.unlink(req.app.files.steps[i]);
							fs.unlink(req.app.files.steps[i] + '.txt');
						}
					}
				}
			});

		});
	}
}
/**
 * Run image manipulation step(s) from config.json
 * @param {Array} steps OCR steps based on configuration
 * @param {Number} running Runnins step (index)
 * @param {String} file Path to file
 * @param {Object} cb Callback
 */
function runStep(steps, running, file, cb) {
	cb = (cb) ? cb : function() {
	};
	if (running == steps.length) {
		cb(file);
		return;
	} else {
		if (steps[running].valid) {
			var args = [file];
			args = args.concat(steps[running].arg);
			args = args.concat([file]);
			//logger.debug('Args:', args);
			im.convert(args, function(err) {
				if (err) {
					logger.error('PREPROCESSING Step: ' + (running + 1) + ' ' + err)
				}
				running++;
				runStep(steps, running, file, cb);
			});
		} else {
			running++;
			runStep(steps, running, file, cb);
		}
	}
}

/**
 * Run OCR on image
 * @param {String} file Path to file
 * @param {Object} cb Callback
 */
function runOcr(file, cb) {
	//var output = env.path + '/tmp/' + Math.random().toString(36).substring(10);
	var output = file;
	//create temp file
	fs.writeFile(output + '.txt', '', function(err) {
		if (err) {
			logger.error('Cannot create temp file for ' + output + '\n' + err);
			cb(err, 'error');
			return;
		}
		var args = [];
		args.push(nconf.get('server:tesseract:bin'));
		args.push(file);
		args.push('-l eng');
		args.push('-psm 7');
		args.push(output);
		args.push('nobatch digits');
		var command = '' + args.join(' ');
		//logger.debug('OCR: ' + command);
		var child = exec(command, function(err, stdout, stderr) {
			if (err) {
				logger.error('OCR processing |' + err);
				cb(err, null);
				return;
			}
			fs.readFile(output + '.txt', function(err, data) {
				if (!err) {
					data = data.toString('UTF-8');
				} else {
					logger.error(err);
				}
				cb(err, data);
			});
		});
	});
}

/**
 * The 500 Route
 */
exports.http500 = function(req, res) {
	res.status(500).sendfile(env.path + '/public/html/500.html');
};
/**
 * The 404 Route
 */
exports.http404 = function(req, res) {
	res.status(404).sendfile(env.path + '/public/html/404.html');
};

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

var logger = new (winston.Logger)({
	transports : [new (winston.transports.Console)({
		level : false,
		colorize : true
	}), new (winston.transports.File)({
		maxsize : nconf.get('server:log:maxSize') * 1024 * 1024, //Mb
		level : nconf.get('server:log:level'),
		filename : env.path + nconf.get('server:log:app')
	})]
});

/*CONFIG end*/

function trim(string) {
	return string.replace(/^\s+/g, '').replace(/\s+$/g, '');
}
