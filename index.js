var _               = require('lodash'),
	chokidar        = require('chokidar'),
	commondir       = require('commondir'),
	extend          = require('node.extend'),
	glob            = require('glob'),
	glob2base       = require('glob2base'),
	globule         = require('globule'),
	path            = require('path'),
	EventEmitter    = require('events').EventEmitter;

module.exports = function(globs, opts, cb) {
	var defaults    = {
			ignored:        [],
			ignoreInitial:  true,
			persistent:     true,
			batch:          false,
			batchTimeout:   200
		},
		ignored     = [],
		batchTimer  = null,
		batchFiles  = [];

	var out         = new EventEmitter();

	if (_.isString(globs)) {
		globs = [globs];
	}

	/* Figure out where to put the watcher */
	var watchDir    = commondir(process.cwd(), _.map(globs, function(g){ return glob2base(new glob.Glob(g)); }));

	if (typeof opts === 'function') {
		cb = opts;
		opts = {};
	}

	opts = extend(defaults, opts);

	ignored         = opts.ignored;
	opts.ignored    = function(path) {
		return globule.isMatch(ignored, path);
	};

	var watcher = chokidar.watch(watchDir, opts);

	function onChange(event, path){
		if (globule.isMatch(globs, path)) {
			if (opts.batch) {
				batchChange(event, path);
			}
			else {
				emitChange(event, path);
			}
		}
	}

	function batchChange(event, path) {
		batchFiles.push(path);

		clearTimeout(batchTimer);
		batchTimer = setTimeout(emitBatch, opts.batchTimeout);
	}

	function emitBatch() {
		emitChange('change', batchFiles);
		batchFiles = [];
	}

	function emitChange(event, path) {
		out.emit(event, path);
		if(cb) cb(event, path);
	}

	watcher.on('all',   onChange);

	watcher.on('error', out.emit.bind(out, 'error'));

	out.add = function(){
		return watcher.add.apply(watcher, arguments);
	};
	out.remove = function(){
		return watcher.remove();
	};
	out._watcher = watcher;

	return out;
};
