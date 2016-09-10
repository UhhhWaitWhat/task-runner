'use strict';

const fs = require('fs');
const path = require('path');
const send = require('koa-send');
const sass = require('node-sass');
const route = require('koa-route');
const rollup = require('rollup');
const compose = require('koa-compose');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');

const debug = process.env.NODE_ENV === 'development';
const clientDir = path.join(__dirname, '../client/');

/* Helper to wrap a function (with no arguments) and cache its result in production */
function cachify(fn) {
	if(debug) {
		return fn;
	} else {
		let value = fn();

		return () => value;
	}
}

/* Simply read html from disk */
let html = cachify(() => new Promise((res, rej) => {
	let cb = (e, d) => e ? rej(e) : res(d);

	fs.readFile(path.join(clientDir, 'index.html'), cb);
}));


/* Compile js via rollup */
let js = cachify(() => rollup.rollup({
	entry: path.join(clientDir, 'js/index.js'),
	plugins: [
		replace({ 'process.env.NODE_ENV': debug ? 'development' : 'production', 'process.env.VUE_ENV': 'client' }),
		resolve({ jsnext: true }),
		commonjs()
	]
}).then(d => d.generate().code));

/* Compile scss into single css file */
let css = cachify(() => new Promise((res, rej) => {
	let cb = (e, d) => e ? rej(e) : res(d.css);

	let options = {
		file: path.join(clientDir, 'scss/index.scss')
	};

	return sass.render(options, cb);
}));

/* Compose into a single middleware, including the static directory */
module.exports = compose([
	route.get('/', function* () {
		this.type = 'text/html';
		this.body = yield html();
	}),
	route.get('/js', function* () {
		this.type = 'application/javascript';
		this.body = yield js();
	}),
	route.get('/css', function* () {
		this.type = 'text/css';
		this.body = yield css();
	}),
	function* (next) {
		yield send(this, this.path, { root: path.join(clientDir, 'static') });
		yield next;
	}
]);
