var fs = require('fs');

/**
 * Get extension from file path
 */
exports.getExtension = function(filePath) {
	var re = /(?:\.([^.]+))?$/;
	return re.exec(''+filePath)[1];
}
/**
 * Merge values
 */
exports.mergeValues = function(conf, values) {
	var ret = '';
	var originalValues = values;
	//logger.debug('1 ' + JSON.stringify(values));
	function prepareString(str) {
		//remove non digits chars
		str = str.replace(/[^\d]/g, '')
		//strip length based on config
		str = str.substr(0, conf.valueLength);
		//split string to array
		str = str.split('');
		for (var i = 0; i < conf.valueLength; i++) {
			str[i] = (str[i]) ? str[i] : '0';
		}
		return str;
	}

	function sortByFrequency(array) {
		//http://stackoverflow.com/questions/3579486/sort-a-javascript-array-by-frequency-and-then-filter-repeats
		var frequency = {}, value;
		// compute frequencies of each value
		for (var i = 0; i < array.length; i++) {
			value = array[i];
			if ( value in frequency) {
				frequency[value]++;
			} else {
				frequency[value] = 1;
			}
		}
		// make array from the frequency object to de-duplicate
		var uniques = [];
		for (value in frequency) {
			uniques.push(value);
		}
		// sort the uniques array in descending order by frequency
		function compareFrequency(a, b) {
			return frequency[b] - frequency[a];
		}

		return uniques.sort(compareFrequency);
	}

	//prepare value arrays
	for (var i = 0; i < values.length; i++) {
		var preparedValue = prepareString(values[i]);
		values[i] = preparedValue;
	}
	//do magic (get digits by frequency)
	var valueAfterMagic = [];
	for (var i = 0; i < conf.valueLength; i++) {
		////var preparedValue = prepareString(originalValues[i]);
		var arr = [];
		for (var j = 0; j < values.length; j++) {
			if (parseInt(values[j].join(''), 10) !== 0) {
				arr.push(values[j][i]);
			}
		}
		var unsortedArr=arr;
		var sortedArr = sortByFrequency(arr);
		
		if(unsortedArr.length===sortedArr.length){
			//ak sa kazda honota vyskytuje iba raz tak zober posledny (zvycajne to nie je 0)
			valueAfterMagic.push(sortedArr[sortedArr.length-1]);
		}else{
			//ak sa nejaka hodnota vyskytuje viackrat
			valueAfterMagic.push(sortedArr[0]);
		}
	}
	//join
	for (var i = 0; i < values.length; i++) {
		values[i] = values[i].join('');
	}
	ret = valueAfterMagic.join('');
	return ret;
}
/**
 * Sync file copying
 */
exports.copyFileSync = function(srcFile, destFile) {
	var BUF_LENGTH, buff, bytesRead, fdr, fdw, pos;
	BUF_LENGTH = 64 * 1024;
	buff = new Buffer(BUF_LENGTH);
	fdr = fs.openSync(srcFile, 'r');
	fdw = fs.openSync(destFile, 'w');
	bytesRead = 1;
	pos = 0;
	while (bytesRead > 0) {
		bytesRead = fs.readSync(fdr, buff, 0, BUF_LENGTH, pos);
		fs.writeSync(fdw, buff, 0, bytesRead);
		pos += bytesRead;
	}
	fs.closeSync(fdr);
	return fs.closeSync(fdw);
};

exports.generateKey = function() {
	var key=Math.random().toString(35).substring(7);
	return key;
}

exports.findById = function(id, fn) {
	var idx = id - 1;
	if (users[idx]) {
		fn(null, users[idx]);
	} else {
		fn(new Error('User ' + id + ' does not exist'));
	}
}

exports.findByUsername = function(username, fn) {
	for (var i = 0, len = users.length; i < len; i++) {
		var user = users[i];
		if (user.username === username) {
			return fn(null, user);
		}
	}
	return fn(null, null);
}