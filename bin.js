#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const server = require('./index.js');

/* Load everything from environment */
const port = process.env.PORT || 3000;
const database = path.resolve(process.cwd(), process.env.DATABASE || 'tasks.db');
const taskfile = path.resolve(process.cwd(), process.env.TASKFILE || 'tasks.json');

/* Set default timeout. The application will wait this many ms for any running tasks to terminate */
const timeout = 10000;

/* Give some information if arguments were passed */
if(process.argv.length > 2) {
	console.log('This application takes no arguments.');
	console.log('You may set the environment variables PORT, DATABASE and TASKFILE.');

	process.exit(1);
}

/* Try to read the task information */
let taskData;
try {
	taskData = JSON.parse(fs.readFileSync(taskfile, 'utf8'));
} catch(e) {
	console.error(`Failed to load input file:\n\n${e}`);
	process.exit(1);
}

/* Start the server */
server(taskData, { port, dbFile: database, timeout });
