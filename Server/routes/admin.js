var nconf = require('nconf');
/**
 *
 */
exports.login = function(req, res, next) {
	res.render('login', {
		message : req.flash('error')
	});
	//res.render('login');
};

exports.doLogin = function(req, res, next) {
	res.redirect('/');
};

exports.doLogout = function(req, res, next) {
	req.logOut();
	res.redirect('/');
};

exports.ensureAuthenticated = function(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/login');
}

exports.index = function(req, res, next) {
	res.render('index', {
		title : 'OCRApi Admin'
	});
}
exports.http500 = function(req, res, next) {
	res.status(500).sendfile(env.path + '/public/html/500.html');
};
exports.http404 = function(req, res, next) {
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
/*CONFIG end*/
