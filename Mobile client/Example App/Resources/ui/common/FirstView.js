//FirstView Component Constructor
function FirstView() {
	//create object instance, a parasitic subclass of Observable
	var self = Ti.UI.createView({
		backgroundGradient : {
			type : 'linear',
			colors : ['#ddd', '#f0f0f0'],
			startPoint : {
				x : 0,
				y : 0
			},
			endPoint : {
				x : '100%',
				y : '100%'
			},
			backFillStart : false
		}
	});
	var Button = require('ui/common/Button');
	var OCRparse = require('lib/OcrParse');
	var ocr = new OCRparse();

	//label using localization-ready strings from <app dir>/i18n/en/strings.xml
	var label = Ti.UI.createLabel({
		color : '#555',
		text : 'OCRParse lib v' + ocr.version + '\nDemo application',
		textAlign : 'center',
		top : 50,
		font : {
			fontSize : 18
			//,fontWeight : 'bold'
		},
		shadowColor : '#fff',
		shadowOffset : {
			x : 1,
			y : 1
		},
		height : 'auto',
		width : 'auto'
	});
	var imageView = Ti.UI.createImageView({
		bottom : 200,
		//width: 280,
		//height: 'auto'
		height : 40,
		width : ocr.size.getWidth(40)/*224*/
	});
	var valueLabel = Ti.UI.createLabel({
		color : '#333',
		text : ' ',
		_value : 0,
		textAlign : 'center',
		bottom : 270,
		font : {
			fontSize : 40,
			//fontFamily : "Viva La Vida",
			fontWeight : 'bold'
		},
		shadowColor : '#fff',
		shadowOffset : {
			x : 1,
			y : 1
		},
		height : 'auto',
		width : 'auto'
	});
	var buttonPicture = new Button({
		title : 'Take a picture',
		bottom : 10,
		left : 10,
		action : function() {
			ocr.getValue(function(image, value, number) {
				//imageView.width = self.width;
				//imageView.height = self.height;
				imageView.image = image;
				//alert('Value: ' + value);
				valueLabel.text = number;
				valueLabel._value = value;
			});
		}
	});
	var buttonValue = new Button({
		bottom : 10,
		right : 10,
		title : 'Update value',
		action : function() {
			Ti.API.debug(valueLabel._value);
			ocr.updateValue(valueLabel._value, function(value, number) {
				//alert('Value: ' + value);
				valueLabel.text = number;
				valueLabel._value = value;
			});
		}
	});

	//Add behavior for UI
	self.add(label);
	self.add(buttonPicture);
	self.add(buttonValue);
	self.add(imageView);
	self.add(valueLabel)
	return self;
}

module.exports = FirstView;
