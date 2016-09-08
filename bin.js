#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const server = require('./index.js');

/* Load everything from environment */
const port = process.env.PORT || 3000;
const debug = process.env.NODE_ENV === 'development';
const database = path.resolve(process.cwd(), process.env.DATABASE || 'tasks.db');
const taskfile = path.resolve(process.cwd(), process.env.TASKFILE || 'tasks.json');

/* Give some information if arguments were passed */
if(process.argv.length > 2) {
	console.log('This application takes no arguments.');
	console.log('You may set the environment variables PORT, DATABASE and TASKFILE.');

	process.exit(1);
}

/* Start the server */
server(JSON.parse(fs.readFileSync(taskfile, 'utf8')), { port, database, debug });
