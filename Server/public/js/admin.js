$(function() {
	$('#myTab a:first').tab('show');

	$('#statusReload').click(function() {
		var btn = $(this);
		btn.button('loading');
		statusReload(function() {
			btn.button('reset');
		})
	});

	$('#configReload').click(function() {
		var btn = $(this);
		btn.button('loading');
		configReload(function() {
			btn.button('reset');
		})
	});
	$('#configApply').click(function() {
		var btn = $(this);
		btn.button('loading');
		applyConfig(function() {
			btn.button('reset');
		})
	});
	$('#debugTruncate').click(function() {
		var btn = $(this);
		btn.button('loading');
		debugTruncate(function() {
			btn.button('reset');
		});

	});
	$('#debugLoadImages').click(function() {
		var btn = $(this);
		btn.button('loading');
		debugLoadImages(function() {
			btn.button('reset');
			$('#files .btn.btn-link.values').click(function() {
				var file = $(this).attr('file-name');
				var steps = $(this).attr('file-steps');
				var extension = $(this).attr('file-extension');
				$('#myModal .modal-body').html('');
				$('#myModal').modal({
					show : true
				});
				$('#myModalLabel').html('Parsed values for: '+file);
				for (var i = 0; i < steps; i++) {
					$.ajax({
						url : 'ocrimages/' + file + '_' + i + '.' + extension + '.txt',
						success : function(data) {
							$('#myModal .modal-body').append('<p>Thread #' + (i + 1) + ' <img class="thumbnailImage" src="ocrimages/' + file + '_' + i + '.' + extension + '"> => <b>' + data + '</b></p>');
						},
						async : false
					});

				}
			});

		});
	});
	$('#logLoadApp').click(function() {
		var btn = $(this);
		btn.button('loading');
		logLoadApp(function() {
			btn.button('reset');
		});
	});
	$('#logLoadAccess').click(function() {
		var btn = $(this);
		btn.button('loading');
		logLoadAccess(function() {
			btn.button('reset');
		});
	});
	function statusReload(cb) {
		$.get('ocrAdmin/api/status/loadStatus', function(data) {
			//console.log(data);
			$('#statuses').html(data);
			cb();
		});
	}

	function configReload(cb) {
		$.get('ocrAdmin/api/config/loadConfig', function(data) {
			//console.log(data);
			$('#configs').html(data);
			cb();
		});
	}

	function applyConfig(cb) {
		console.log('applyConfig');
		$.get('ocrAdmin/api/config/applyConfig', function(data) {
			console.log(data);
			cb();
		});
	}

	function debugTruncate(cb) {
		$('#files').html('<div class="jumbotron"><h2>Loading images...</h2></div>');
		$.getJSON('ocrAdmin/api/debug/truncateImages', function(data) {
			//console.log(data);
			if (data.status == 'done') {
				setTimeout(function() {
					cb();
					loadImages();
				}, 500);

			} else {
				console.log('Something went wrong. Check server log');
				cb();
			}
		});
	}

	function debugLoadImages(cb) {
		$('#files').html('<div class="jumbotron"><h2>Loading images...</h2></div>');
		$.get('ocrAdmin/api/debug/loadImages', function(data) {
			$('#files').html(data);
			cb();
		});
	}

	function logLoadApp(cb) {
		$('#logs').html('<div class="jumbotron"><h2>Loading logs...</h2></div>');
		$.get('ocrAdmin/api/log/loadApp', function(data) {
			$('#logs').html(data);
			cb();
		});
	}

	function logLoadAccess(cb) {
		$('#logs').html('<div class="jumbotron"><h2>Loading logs...</h2></div>');
		$.get('ocrAdmin/api/log/loadAccess', function(data) {
			$('#logs').html(data);
			cb();
		});
	}

	//chain
	setTimeout(function() {
		statusReload(function() {
			configReload(function() {
				/*debugLoadImages(function() {
				 });*/
			});
		});
	}, 100);
});
