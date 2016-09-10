'use strict';

const ws = require('ws');
const koa = require('koa');
const http = require('http');
const etag = require('koa-etag');
const bodyparser = require('koa-bodyparser');

const logic = require('./server/logic');
const assets = require('./server/assets');
const database = require('./server/database');
const migrations = require('./server/migrations');

module.exports = (data, { port, dbFile, timeout }) => {
	/* Allow graceful shutdown */
	let beforeExit = [];
	let registerExit = f => beforeExit.push(f);

	/* Create http, web and socket server as well as database */
	let db = database(dbFile);
	let app = koa();
	let server = http.createServer();
	let wsServer = new ws.Server({ server });

	/* Define a function to gracefully shut down everything */
	let gracefulExit = reason => {
		/* Prevent calling this multiple times */
		gracefulExit = () => {};
		console.log(`Exiting: ${reason}`);

		/* Do anything that was registered to run before shutdown */
		let all = Promise.all(beforeExit.map(e => e()));

		/* Prevent a blocking handler from fucking up our shutdown */
		let max = new Promise((res, rej) => {
			setTimeout(() => {
				rej(`Timeout of ${timeout / 1000} seconds passed. Shutting down immediately`);
			}, timeout);
		});

		Promise.race([all, max])
			.then(() => db.destroy())
			.then(() => process.exit())
			.catch(e => {
				console.error(e);
				process.exit(1);
			});
	};

	/* Use some basic middleware */
	app.use(etag());
	app.use(bodyparser());

	/* Load our asset loading logic (js, css, static assets and html) */
	app.use(assets);

	/* Wait for all migrations */
	migrations(db).then(() => {
		/* Load all business logic */
		logic({
			data,
			exit: registerExit,
			server: app,
			socket: wsServer,
			database: db
		});

		/* Register our own signal handlers */
		process.on('SIGTERM', () => gracefulExit('SIGTERM'));
		process.on('SIGQUIT', () => gracefulExit('SIGQUIT'));
		process.on('SIGINT', () => gracefulExit('SIGINT'));

		/* Boot the thing up */
		server.on('request', app.callback());
		server.listen(port, () => console.log(`Started on port ${port}`));
	})
	.catch(e => {
		console.error(`Initialization failed:\n\n${e}`);
		process.exit(1);
	});
};
