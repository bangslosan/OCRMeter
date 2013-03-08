/**
 * Text (digits) parsing node.js server
 * by Miroslav Magda, http://ejci.net,
 *
 *
 * Copyright 2012 Miroslav Magda
 *
 * All code is open source and dual licensed under GPL and MIT. Check the individual licenses for more information.
 */

/**
 * Include modules
 */
var winston = require('winston');
var sys = require("sys");
var express = require("express");
var nconf = require('nconf');
var http = require('http');
var im = require('imagemagick');
var exec = require('child_process').exec;
var fs = require('fs');
var ejs = require('ejs');
var passport = require('passport');
var flash = require('connect-flash');
var util = require('util');
var LocalStrategy = require('passport-local').Strategy;
var utils = require('./lib/utils');
var adminRoutes = require('./routes/admin');
var adminApiRoutes = require('./routes/adminApi');
var ocrApiRoutes = require('./routes/ocrApi');

process.on('uncaughtException', function(error) {
	console.log("=[uncaughtException]=====================================================");
	console.error(error);
	console.log(error.stack);
	console.log("=========================================================================");
});

/**
 * App specific variables
 */
/*CONFIG begin*/
var cfg = {};
var ocr = {};
var env = {};
var users = [];
nconf.argv().env();
env.path = nconf.get('path');

nconf.file('server', env.path + '/config.json');
nconf.file('ocr', env.path + '/ocr.json');
nconf.file('users', env.path + '/users.json');

cfg.server = nconf.get('server');
ocr = nconf.get('ocr');
users = nconf.get('users');

im.identify.path = nconf.get('server:imagemagick:bin:identify');
im.convert.path = nconf.get('server:imagemagick:bin:convert');

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

var accessLogger = new (winston.Logger)({
	transports : [new (winston.transports.File)({
		maxsize : nconf.get('server:log:maxSize') * 1024 * 1024, //Mb
		filename : env.path + nconf.get('server:log:access')
	})]
});

var accessLogStream = {
	write : function(message, encoding) {
		accessLogger.info(message);
	}
};
var key = utils.generateKey();
/* CONFIG END */
var app = express();

app.configure(function() {
	app.use('/css', express.static(env.path + '/public/css'));
	app.use('/img', express.static(env.path + '/public/img'));
	app.use('/js', express.static(env.path + '/public/js'));
	app.set('key', key);
	app.use(express.static(env.path + '/public/html'));
	app.use(express.favicon(env.path + '/public/favicon.ico'));
	app.use(express.bodyParser({
		uploadDir : env.path + '/tmp',
		keepExtensions : true
	}));
	app.use(express.limit('5mb'));
	app.use(express.logger({
		stream : accessLogStream
	}));
	app.use(function(req, res, next) {
		req.config = {};
		req.config.key = appAdmin.get('key');
		next();
	});

	app.use(function(err, req, res, next) {
		logger.error(err.stack);
		res.status(500).sendfile(env.path + '/public/html/500.html');
	});
});

/* begin*/
/**
 * Only for debug purposes
 */
app.get('/api/parseValue', ocrApiRoutes.parseValueForm);

/**
 * Get API version
 */
app.get('/api/getVersion', ocrApiRoutes.getVersion);
/**
 * Get status of service
 */
app.get('/api/getStatus', ocrApiRoutes.getStatus);
/**
 * Get API version
 */
app.get('/api/nothingToParse', ocrApiRoutes.ocrApiRoutes);
/**
 * Reload configs
 */
app.get('/api/reloadConfig/:key', ocrApiRoutes.reloadConfig);
/**
 * Parse value from image
 */
app.post('/api/parseValue', ocrApiRoutes.checkRequest, ocrApiRoutes.prepareImages, ocrApiRoutes.parseValue);
/**
 * The 500 Route
 */
app.get('/500', function(req, res) {
	res.status(500).sendfile(env.path + '/public/html/500.html');
});
/**
 * The 404 Route
 */
app.get('/*', function(req, res) {
	res.status(404).sendfile(env.path + '/public/html/404.html');
});

//Start listening
app.listen(nconf.get('server:http:port'));
logger.info('App started at port: ' + nconf.get('server:http:port'));

if (cfg.server.debug === true) {
	logger.warn('Server is starting with DEBUG mode ON');
	logger.warn('Imagemagick identify bin: ' + nconf.get('server:imagemagick:bin:identify'));
	logger.warn('Imagemagick convert bin: ' + nconf.get('server:imagemagick:bin:convert'));
	logger.warn('Tesseract bin: ' + nconf.get('server:tesseract:bin'));
}

/**
 * ADMIN App
 */
var appAdmin = express();
appAdmin.configure(function() {
	appAdmin.set('views', env.path + '/views');
	appAdmin.set('view engine', 'html');
	appAdmin.set('view engine', 'ejs');
	appAdmin.use('/img', express.static(env.path + '/public/img'));
	appAdmin.use('/ocrimages', express.static(env.path + '/upload'));
	appAdmin.use('/css', express.static(env.path + '/public/css'));
	appAdmin.use('/js', express.static(env.path + '/public/js'));
	appAdmin.set('key', key);
	appAdmin.use(express.favicon(env.path + '/public/favicon.ico'));
	appAdmin.use(express.bodyParser());
	appAdmin.use(express.methodOverride());
	appAdmin.use(express.cookieParser('9f93hP*XB(P#bc208hc0xnlJB#&obx9)'));
	appAdmin.use(express.session({
		secret : '9f93hP*XB(P#bc208hc0xnlJB#&obx9)'
	}));
	appAdmin.use(flash());
	appAdmin.use(passport.initialize());
	appAdmin.use(passport.session());
	appAdmin.use(function(req, res, next) {
		req.config = {};
		req.config.key = appAdmin.get('key');
		req.config.server = cfg.server;
		req.config.ocr = ocr.config;
		next();
	});
	appAdmin.use(appAdmin.router);
	appAdmin.use(function(err, req, res, next) {
		logger.error(err.stack);
		res.status(500).sendfile(env.path + '/public/html/500.html');
	});
});

//API
appAdmin.get('/ocrAdmin/api/config/loadConfig', adminRoutes.ensureAuthenticated, adminApiRoutes.loadConfig);
appAdmin.get('/ocrAdmin/api/config/applyConfig', adminRoutes.ensureAuthenticated, adminApiRoutes.applyConfig);
appAdmin.get('/ocrAdmin/api/debug/truncateImages', adminRoutes.ensureAuthenticated, adminApiRoutes.truncateImages);
appAdmin.get('/ocrAdmin/api/debug/loadImages', adminRoutes.ensureAuthenticated, adminApiRoutes.loadImages);
appAdmin.get('/ocrAdmin/api/status/loadStatus', adminRoutes.ensureAuthenticated, adminApiRoutes.loadStatus);
appAdmin.get('/ocrAdmin/api/log/loadApp', adminRoutes.ensureAuthenticated, adminApiRoutes.loadAppLog);
appAdmin.get('/ocrAdmin/api/log/loadAccess', adminRoutes.ensureAuthenticated, adminApiRoutes.loadAccessLog);

//FE
appAdmin.get('/login', adminRoutes.login);
appAdmin.post('/login', passport.authenticate('local', {
	failureRedirect : '/login',
	failureFlash : true
}), adminRoutes.doLogin);
appAdmin.get('/logout', adminRoutes.doLogout);
appAdmin.get('/', adminRoutes.ensureAuthenticated, adminRoutes.index);

//UI error
appAdmin.get('/500', adminRoutes.http500);
appAdmin.get('/*', adminRoutes.http404);

//Start listening
appAdmin.listen(nconf.get('server:http:portAdmin'));
logger.info('Admin App started at port: ' + nconf.get('server:http:portAdmin'));

/**
 * PASSPORT SPECIFIC
 */
function findById(id, fn) {
	var idx = id - 1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}

function findByUsername(username, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}

passport.serializeUser(function(user, done) {
	done(null, user.id);
});

passport.deserializeUser(function(id, done) {
	findById(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(function(username, password, done) {
	process.nextTick(function() {
		findByUsername(username, function(err, user) {
			if (err) {
				return done(err);
			}
			if (!user) {
				return done(null, false, {
					message : 'Unknown user ' + username
				});
			}
			if (user.password != password) {
				return done(null, false, {
					message : 'Invalid password'
				});
			}
			return done(null, user);
		})
	});
}));

