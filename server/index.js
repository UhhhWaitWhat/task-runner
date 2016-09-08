const fs = require('fs');
const path = require('path');
const knex = require('knex');
const routes = require('./routes');
const streams = require('./streams');
const validate = require('./validate');
const migrations = require('./migrations');

/* Print message to stderr and exit program */
function bail(message) {
	console.error(message);
	process.exit(1);
}

module.exports = (koaServer, socketServer, onExit) => {
	/* Define input data */
	let dbFile = path.resolve(process.cwd(), process.env.DATABASE || 'tasks.db');
	let taskFile = path.resolve(process.cwd(), process.env.TASKFILE || 'tasks.json');

	/* Load the tasks from the configuration file */
	try {
		var taskData = JSON.parse(fs.readFileSync(taskFile, 'utf8'));

		validate(taskData);
	} catch(e) {
		bail(`Failed to load task definitions:\n\n${e.message}`);
	}

	/* Create a knex database */
	let database = knex({
		client: 'sqlite3',
		useNullAsDefault: true,
		connection: {
			filename: dbFile
		}
	});

	/* Die on database error */
	database.client.pool.on('error', e => {
		bail(`Database connection failed:\n\n${e}`);
	});

	/* Run migrations */
	migrations(database).then(() => {
		/* Now set up our actual logic */
		let tasks = require('./tasks')(taskData, database, onExit);

		/* And attach the corresponding routes */
		routes(tasks, koaServer);
		streams(tasks, socketServer);
	}).catch(bail);
};
