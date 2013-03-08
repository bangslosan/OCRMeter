/*
 * OCRParse is OCR value parsing library / module
 * by Miroslav Magda, blog.ejci.net,
 *
 *
 * Copyright 2012 Miroslav Magda
 *
 *
 */

var OCRParse = function(o) {
	Titanium.include('/lib/json2.js');
	//Version
	var _version = '0.1.0';
	var _const = {
		timeout : 20000,
		height : 100,
		width : 80,
		ratio : 100 / 80
	};
	var _conf = {
		valueLength : 7,
		decimalPlaces : 1,
		ratio : _const.ratio
	};
	//Options
	o = (o) ? o : {};
	var _opt = {
		textProcessing : (o.textProcessing) ? o.textProcessing : 'Processing measurment...',
		textHelp : (o.textHelp) ? o.textHelp : 'Please take a picture',
		textError : (o.textError) ? o.textError : 'Something bad happened :(',
		closeTitle : (o.closeTitle) ? o.closeTitle : 'Close',
		saveTitle : (o.closeTitle) ? o.closeTitle : 'Save',
		winTitle : (o.winTitle) ? o.winTitle : '',
		winColor : (o.winColor) ? o.winColor : '#000',
		allowEditing : ( typeof (o.allowEditing) === 'undefined') ? true : o.allowEditing,
		quiet : ( typeof (o.quiet) === 'undefined') ? true : o.quiet,
		api : (o.api) ? o.api : 'http://mscan.qbsw.sk/ocr',
		backgroundGradient : {
			type : 'linear',
			colors : ['#444', '#111'],
			startPoint : {
				x : 0,
				y : 0
			},
			endPoint : {
				x : '100%',
				y : '100%'
			},
			backFillStart : false
		},
		backgroundValueGradient : {
			type : 'linear',
			colors : ['#3f3f3f', '#202020'],
			startPoint : {
				x : 0,
				y : 0
			},
			endPoint : {
				x : 0,
				y : '100%'
			},
			backFillStart : false
		},
		backgroundValueDecimalGradient : {
			type : 'linear',
			colors : ['#900', '#700'],
			startPoint : {
				x : 0,
				y : 0
			},
			endPoint : {
				x : 0,
				y : '100%'
			},
			backFillStart : false
		}
	};
	_opt.quiet = false;
	/**
	 * Log namespace
	 */
	var log = function() {
	};
	log.error = function(t) {
		if (!_opt.quiet) {
			Ti.API.error('' + t);
		}
	}
	log.info = function(t) {
		if (!_opt.quiet) {
			Ti.API.info(t);
		}
	}
	log.debug = function(t) {
		if (!_opt.quiet) {
			Ti.API.debug('' + t);
		}
	}
	log.trace = function(t) {
		if (!_opt.quiet) {
			Ti.API.trace('' + t);
		}
	}
	//UTILS
	log.info('-------------------------------------');
	log.info('| OCR value parsing library          |');
	log.info('| Titanium Module (v.:' + _version + ')         |');
	log.info('| by Miroslav Magda                  |');
	log.info('-------------------------------------');

	/**
	 * Set configuration
	 * @param {Object} conf configuration profile
	 * @example
	 *
	 * {
	 * 	 valueLength : 7, //how many values
	 * 	 decimalPlaces : 1, //how many decimal places
	 * 	 ratio : 1.25 //width of one number / height of one number
	 * }
	 *
	 */
	function setConfig(conf) {
		_conf = (conf) ? conf : _conf;
	}

	var size = {};
	size.getWidth = function(width) {
		return Math.round(width / _conf.ratio * _conf.valueLength);

	}
	size.getHeight = function(height) {
		return Math.round((height / _conf.valueLength) * _conf.ratio);
	}
	log.debug('Height: ' + size.getHeight(224));
	log.debug('Width: ' + size.getWidth(40));
	/**
	 * Crop image
	 * Lots of magic :D
	 * @param {Object} media
	 */
	function cropImage(media) {
		//:D
		var bulgarianConstant = 336;
		var actualImage = Titanium.UI.createImageView({
			height : 'auto',
			width : 'auto',
			image : media
		});
		var actualImage = actualImage.toImage();

		var screen = {
			width : Titanium.Platform.displayCaps.platformHeight, //platformWidth
			height : Titanium.Platform.displayCaps.platformWidth//platformHeight
		};
		var image = {
			width : actualImage.width,
			height : actualImage.height
		};
		var koef = {
			x : (image.width / screen.width),
			y : (image.height / screen.height),
			real : Math.sqrt(image.width * image.height) / Math.sqrt(screen.width * screen.height)
		};

		log.debug('Screen size: ' + JSON.stringify(screen));
		log.debug('Image size: ' + JSON.stringify(image));
		log.debug('koef: ' + JSON.stringify(koef));
		var cropping = {
			x : ((image.width - (koef.x * size.getWidth(40)/*224*/))) / 2 + bulgarianConstant / 2,
			y : (image.height - (koef.y * 40)) / 2,
			width : (koef.x * size.getWidth(40)/*224*/),
			height : koef.y * 40
		};
		log.debug('Crop: ' + JSON.stringify(cropping));
		var im = actualImage.imageAsCropped(cropping);
		log.debug('Image size: ' + im.width + ' x ' + im.height);
		log.debug('Exporting image...');
		log.debug(im);
		return {
			image : im,
			size : {
				width : im.width,
				height : im.height
			}

		};
	}

	/**
	 * Send picture to server and get value
	 * @param {Object} media
	 */
	function serverGetValue(im, cb) {
		//resize image for sending to server...
		log.debug('Preparing request...');
		var koef = im.size.height / 100;
		var imV = Titanium.UI.createImageView({
			image : im.image,
			width : im.size.width / koef,
			height : 100
		});
		im.image = imV.toImage();
		/*var size = {
		 width : im.getWidth(),
		 height : im.getHeight()
		 };
		 var koef = size.height / 100;
		 im = im.imageAsResized(size.width / koef, 100);
		 log.debug('Prepared image size: ' + JSON.stringify(size));
		 */
		var timeout = _const.timeout;
		var done = false;
		var xhr = Titanium.Network.createHTTPClient({
			enableKeepAlive : false
		});
		var params = {
			image : im.image,
			valueLength : _conf.valueLength,
			decimalPlaces : _conf.decimalPlaces
		};
		xhr.timeout = timeout;
		xhr.open('POST', _opt.api + '/api/parseValue');
		xhr.onload = function() {
			if (done) {
				return;
			}
			done = true;
			var value = 0;
			try {
				log.debug('Parsing response...')
				log.debug(this.responseText);
				var response = JSON.parse(this.responseText);
				value = response.value;
				/*if (response.status == 'done') {
				 value = response.value;
				 }*/
			} catch(e) {
				value = 0;
			}
			cb(value);
		};
		xhr.onerror = function() {
			if (done) {
				return;
			}
			done = true;
			log.debug('Request error: ' + err);
			cb(false, err);
		};
		xhr.onsendstream = function(e) {
			log.debug('SENDING PROGRESS: ' + e.progress);
		};
		xhr.setRequestHeader("Connection", "close");
		xhr.send(params);
		log.debug('Sending request...')
		var x = setTimeout(function() {
			if (done) {
				return;
			}
			done = true;
			log.debug('Request timeout...')
			cb(0);
		}, timeout + 5000);
		//return '123456789'
	}

	/**
	 * Get value (take picture, parse and return image)
	 * @param {Object} cb Callback function
	 * @param {Object} window Titanium window
	 *
	 */
	function updateValue(value, cb) {
		ui.showValue(value, cb);
	}

	/**
	 * Get value (take picture, parse and return image)
	 * @param {Object} cb Callback function
	 * @param {Object} window Titanium window
	 *
	 */
	function getValue(cb, window) {
		cb = (cb) ? cb : function() {
		};
		ui.showCamera({
			success : cb
		});
	}

	/**
	 * UI namespace
	 */
	var ui = {};

	ui.showValue = function(value, cb, image) {
		var height = (_conf.valueLength < 5) ? 55 : 50;
		height = (_conf.valueLength < 8) ? 50 : 45;
		//sanitize value
		value = '' + value;
		value = value.substring(0, _conf.valueLength);
		newValue = "";
		for (var i = 0; i < _conf.valueLength; i++) {
			var chr = (value.charAt(i)) ? value.charAt(i) : '0';
			chr = (isInt(chr)) ? chr : '0';
			newValue = newValue + '' + chr;
		}
		value = newValue;

		var win = Ti.UI.createWindow({
			backgroundColor : '#222',
			backgroundGradient : _opt.backgroundGradient,
			barColor : _opt.winColor,
			modal : true,
			title : _opt.winTitle
		});
		var spinner = Ti.UI.createActivityIndicator({
			zIndex : 1,
			height : 50,
			width : 50,
			hide : true,
			style : Ti.UI.iPhone.ActivityIndicatorStyle.PLAIN
		});
		var close = Ti.UI.createButton({
			title : _opt.closeTitle
		});
		var save = Ti.UI.createButton({
			title : _opt.saveTitle
		});
		var dummyField = Titanium.UI.createTextField({
			keyboardType : Titanium.UI.KEYBOARD_DECIMAL_PAD,
			returnKeyType : Titanium.UI.RETURNKEY_DEFAULT,
			hide : true,
			bottom : -50,
			value : '',
			color : '#fff',
			//top : 110,
			width : 100,
			autocorrect : false
		});
		if (image) {
			var imageView = Ti.UI.createImageView({
				image : image,
				backgroundColor : 'transparent',
				borderWidth : 1,
				borderRadius : 2,
				borderColor : '#000',
				width : size.getWidth(height)/*224*/ + 4,
				height : height + 2,
				top : 30 + height + 2 + 15
			});
		}
		var hintLabel = Ti.UI.createLabel({
			color : '#fff',
			text : 'Please Tap the number\nYou like to change..',
			textAlign : 'center',
			bottom : 20,
			font : {
				fontSize : 14
				//,fontWeight : 'bold'
			},
			shadowColor : '#111',
			shadowOffset : {
				x : 1,
				y : 1
			},
			height : 'auto',
			width : 'auto'
		});
		var valueContainer = Ti.UI.createView({
			backgroundColor : 'transparent',
			borderWidth : 1,
			borderRadius : 2,
			borderColor : '#000',
			width : size.getWidth(height)/*224*/ + 4,
			height : height + 2,
			top : 30,
		});
		var values = [];
		var previousElm = false;
		for (var i = 0; i < _conf.valueLength; i++) {
			var valueNumberView = Ti.UI.createView({
				backgroundColor : '#000',
				backgroundGradient : (i < _conf.valueLength - _conf.decimalPlaces) ? _opt.backgroundValueGradient : _opt.backgroundValueDecimalGradient,
				borderWidth : 1,
				borderRadius : 2,
				borderColor : '#000',
				width : (height / _conf.ratio) + 2,
				height : height,
				top : 1,
				left : 1 + i * (height / _conf.ratio),
				_index : i,
				_type : 'view'
			});
			var valueNumberLabel = Ti.UI.createLabel({
				color : '#ddd',
				text : '' + value[i],
				textAlign : 'center',
				font : {
					fontSize : (height - 10),
					fontWeight : 'bold'
				},
				shadowColor : '#111',
				shadowOffset : {
					x : 1,
					y : 1
				},
				height : 'auto',
				width : 'auto',
				_type : 'label'
			});

			values.push({
				view : valueNumberView,
				label : valueNumberLabel
			});
			valueNumberView.add(valueNumberLabel);
			valueNumberView.addEventListener('click', function(e) {
				focusField(e);
			});
			valueContainer.add(valueNumberView);
		}
		dummyField.addEventListener('change', function(e) {
			changeField(e);
		});
		function changeField(e) {
			//todo: osetrit .
			var l = e.value.length;
			//log.debug('1. field: ' + e.value + ' value: ' + value);
			//log.debug('2. new: ' + e.value.charAt(l - 1) + ' old: ' + value.charAt(l - 1));
			//log.debug('3. field: ' + e.value + ' value: ' + value);
			if (l <= _conf.valueLength) {
				value = replaceAt(value, l - 1, e.value.charAt(l - 1));
			}
			if (l >= _conf.valueLength) {
				dummyField.blur();
				dummyField.value = '';
				values[0].view.fireEvent('click');
			}
			fillValue(l);
		}

		/**
		 * fill value
		 */
		function fillValue(l) {
			log.debug('value length: ' + l);
			for (var i = 0; i < _conf.valueLength; i++) {
				values[i].label.text = '' + value[i];
				if (l == i) {
					values[i].label.color = '#dd0';
				} else {
					values[i].label.color = '#ddd';
				}
			}
		}

		/**
		 * Focus field
		 */
		function focusField(e) {
			dummyField.focus();
			//if (previousElm != false) {
			//	values[previousElm].label.color = '#ddd';
			//}
			var elm = (e.source._type == 'label') ? e.source.parent : e.source;
			var index = elm._index;
			dummyField.value = (value.substring(0, index));
			//log.debug('previousElm: ' + previousElm + ' elm: ' + index);
			//values[index].label.color = '#dd0';
			//previousElm = index;
			fillValue(index);
		}


		values[0].view.fireEvent('click');
		win.add(spinner);
		win.add(hintLabel);
		win.add(dummyField);
		win.add(valueContainer);
		if (image) {
			win.add(imageView);
		}
		//win.leftNavButton = close;
		win.rightNavButton = save;

		close.addEventListener('click', function() {
			win.close();
		});
		save.addEventListener('click', function() {
			var number = parseInt(value, 10) / Math.pow(10, _conf.decimalPlaces);
			cb(value, number);
			win.close();
		});
		win.open();
	}

	ui.showCamera = function(cbs) {
		cbs = (cbs) ? cbs : {};
		cbs.success = (cbs.success) ? cbs.success : doNothing;
		var spinner = Ti.UI.createActivityIndicator({
			zIndex : 1,
			height : 50,
			width : 50,
			hide : true,
			style : Ti.UI.iPhone.ActivityIndicatorStyle.PLAIN
		});
		var view = Ti.UI.createView({
			backgroundColor : 'transparent'
		});
		var viewTransp = Ti.UI.createView({
			backgroundColor : '#444',
			backgroundGradient : _opt.backgroundGradient,
			opacity : 0.3,
			width : 'auto',
			height : 'auto',
			visible : false
		});

		var buttonLeft = Ti.UI.createView({
			bottom : 10,
			width : 60,
			height : 60,
			backgroundColor : '#222',
			backgroundGradient : _opt.backgroundValueGradient,
			borderRadius : 30,
			borderWidth : 2,
			borderColor : '#fff'
		});
		var icon1 = Ti.UI.createView({
			width : 25,
			height : 33,
			backgroundImage : 'images/86-camera.png',
			backgroundColor : 'transparent'
		});
		buttonLeft.add(icon1);
		var closeLeft = Ti.UI.createView({
			bottom : 10,
			right : 10,
			width : 40,
			height : 40,
			backgroundColor : '#a00',
			backgroundGradient : _opt.backgroundValueDecimalGradient,
			borderRadius : 20,
			borderWidth : 2,
			borderColor : '#900'
		});
		var iconCloseLeft = Ti.UI.createView({
			width : 22,
			height : 22,
			backgroundImage : 'images/37-circle-x.png',
			backgroundColor : 'transparent'
		});
		closeLeft.add(iconCloseLeft);

		var buttonRight = Ti.UI.createView({
			top : 10,
			width : 60,
			height : 60,
			backgroundColor : '#222',
			backgroundGradient : _opt.backgroundValueGradient,
			borderRadius : 30,
			borderWidth : 2,
			borderColor : '#fff'
		});
		var icon2 = Ti.UI.createView({
			width : 25,
			height : 33,
			backgroundImage : 'images/86-camera.png',
			backgroundColor : 'transparent'
		});
		buttonRight.add(icon2);
		var closeRight = Ti.UI.createView({
			top : 10,
			right : 10,
			width : 40,
			height : 40,
			backgroundColor : '#a00',
			backgroundGradient : _opt.backgroundValueDecimalGradient,
			borderRadius : 20,
			borderWidth : 2,
			borderColor : '#900'
		});
		var iconcloseRight = Ti.UI.createView({
			width : 22,
			height : 22,
			backgroundImage : 'images/37-circle-x.png',
			backgroundColor : 'transparent'
		});
		var progressLabel = Ti.UI.createLabel({
			color : '#fff',
			//text : 'Please take a picture',
			textAlign : 'center',
			bottom : 10,
			font : {
				fontSize : 14,
				fontWeight : 'bold'
			},
			shadowColor : '#555',
			shadowOffset : {
				x : 1,
				y : 1
			},
			height : 'auto',
			width : 'auto'
		});
		closeRight.add(iconcloseRight);
		//100x640 (80)
		//one number: 100X80 (WxH)
		var scope = Ti.UI.createView({
			width : 40,
			height : size.getWidth(40)/*224*/,
			backgroundColor : 'transparent',
			borderWidth : 2,
			borderColor : 'yellow'
		});
		buttonLeft.addEventListener('click', function(e) {
			buttonLeft.borderColor = '#cc0';
			//progressLabel.text='Please wait. Magic is happening...';
			viewTransp.show();
			Titanium.UI.orientation = Titanium.UI.LANDSCAPE_RIGHT;
			Titanium.Media.takePicture();
			spinner.show();
			buttonLeft.hide();
			buttonRight.hide();
		});
		buttonRight.addEventListener('click', function(e) {
			buttonRight.borderColor = '#cc0';
			//progressLabel.text='Please wait. Magic is happening...';
			viewTransp.show();
			Titanium.UI.orientation = Titanium.UI.LANDSCAPE_RIGHT;
			Titanium.Media.takePicture();
			spinner.show();
			buttonLeft.hide();
			buttonRight.hide();

		});
		closeLeft.addEventListener('click', function(e) {
			closeLeft.borderColor = '#fff';
			Titanium.Media.hideCamera();
		});
		closeRight.addEventListener('click', function(e) {
			closeRight.borderColor = '#fff';
			Titanium.Media.hideCamera();
		});

		//Titanium.UI.orientation = Titanium.UI.LANDSCAPE_RIGHT;
		view.add(viewTransp);
		view.add(spinner);
		view.add(scope);
		view.add(buttonLeft);
		view.add(buttonRight);
		view.add(closeLeft);
		view.add(closeRight);
		view.add(progressLabel);
		Titanium.Media.showCamera({
			success : function(event) {
				if (event.mediaType == Ti.Media.MEDIA_TYPE_PHOTO) {
					log.debug('Picture taken... trying to get picture part');
					try {
						var im = cropImage(event.media);
						serverGetValue(im, function(value, err) {
							log.debug('Parsed value: ' + value);
							if (_opt.allowEditing) {
								ui.showValue(value, function(val, number) {
									var number = parseInt(val, 10) / Math.pow(10, _conf.decimalPlaces);
									cbs.success(im.image, val, number);
									Titanium.Media.hideCamera();
								}, im.image);
							} else {
								var number = parseInt(value, 10) / Math.pow(10, _conf.decimalPlaces);
								cbs.success(im.image, value, number);
								Titanium.Media.hideCamera();
							}
						});
					} catch(e) {
						log.error('Image capturing error: ' + e);
					}
				} else {
					alert("got the wrong type back =" + event.mediaType);
					Titanium.Media.hideCamera();
				}

			},
			cancel : function() {
				// called when user cancels taking a picture
			},
			error : function(error) {
				// called when there's an error
				var a = Titanium.UI.createAlertDialog({
					title : 'Error'
				});
				if (error.code == Titanium.Media.NO_CAMERA) {
					a.setMessage('Please run this test on device');
				} else {
					log.error('Unexpected error: ' + error.code)
					//a.setMessage('Unexpected error: ' + error.code);
					a.setMessage(_opt.textError);
				}
				a.show();
			},
			overlay : view,
			saveToPhotoGallery : false,
			allowEditing : false,
			autohide : false,
			showControls : false,
			mediaTypes : [Ti.Media.MEDIA_TYPE_PHOTO]
		});
		//todo:
		Ti.Media.setCameraFlashMode(Ti.Media.CAMERA_FLASH_ON);
	}
	/**
	 * Public methods
	 */
	return {
		getValue : getValue,
		//getStatus : getStatus,
		updateValue : updateValue,
		size : size,
		version : _version
	}
};
/**
 * dummy function for not defined callbacks
 */
var doNothing = function() {
	//do nothing :)
}
/**
 * set character at index
 */
function replaceAt(str, index, chr) {
	var a = str.split("");
	a[index] = chr;
	return a.join("");
}

/**
 * Is number
 */
function isInt(value) {
	var er = /^[0-9]+$/;
	return ( er.test(value) ) ? true : false;
}

/**
 * Exports module
 */
module.exports = OCRParse;
