#!/usr/bin/env node
const fs = require('fs');
const ws = require('ws');
const koa = require('koa');
const path = require('path');
const http = require('http');
const send = require('koa-send');
const sass = require('node-sass');
const route = require('koa-route');
const rollup = require('rollup');
const replace = require('rollup-plugin-replace');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const bodyparser = require('koa-bodyparser');

/* Load port from environment */
const port = process.env.PORT || 3000;

/* Give some information if arguments were passed */
if(process.argv.length > 2) {
	console.log('This application takes no arguments.\nYou may set the environment variables PORT, DATABASE and TASKFILE.');
	process.exit(2);
}

/* Create http and socket server */
let server = http.createServer();
let wsServer = new ws.Server({ server });

/* Create webserver */
let app = koa();
app.use(bodyparser());

/* Add routes for js and css, as well as the default html frame */
app.use(route.get('/', function* () {
	let file = path.join(__dirname, 'client/index.html');

	this.type = 'text/html';
	this.body = fs.createReadStream(file);
}));

app.use(route.get('/js', function* () {
	let file = path.join(__dirname, 'client/js/index.js');

	this.type = 'application/javascript';
	this.body = yield rollup.rollup({
			entry: file,
			plugins: [
				replace({ 'process.env.NODE_ENV': process.env.NODE_ENV || 'development', 'process.env.VUE_ENV': 'client' }),
				resolve({ jsnext: true }),
				commonjs()
			]
		}).then(d => d.generate().code);
}));

app.use(route.get('/css', function* () {
	let file = path.join(__dirname, 'client/scss/index.scss');

	this.type = 'text/css';
	this.body = yield new Promise((res, rej) => sass.render({ file }, (e, d) => e ? rej(e) : res(d.css)));
}));

app.use(function* (next) {
	yield send(this, '/' + this.path.split('/').slice(2).join('/'), { root: path.join(__dirname, 'client/fonts') });
	yield next;
});

/* Try to shut down gracefully */
let exit = [];
let exiting = false;
let gracefulExit = signal => {
	if(!exiting) {
		exiting = true;
		console.log(`Exiting: Received ${signal}`);

		Promise.all(exit.map(e => e())).then(
			() => process.exit(),
			e => {
				console.error(e);
				process.exit(1);
			}
		);

		setTimeout(() => {
			console.error('Timeout of 10 seconds passed. Shutting down immediately');
			process.exit();
		}, 10000);
	}
}

process.on('SIGTERM', () => gracefulExit('SIGTERM'));
process.on('SIGQUIT', () => gracefulExit('SIGQUIT'));
process.on('SIGINT', () => gracefulExit('SIGINT'));

/* Load all businesslogic */
require('./server')(app, wsServer, p => exit.push(p));

/* Boot the thing up */
server.on('request', app.callback());
server.listen(port, () => console.log(`Started on port ${port}`));
