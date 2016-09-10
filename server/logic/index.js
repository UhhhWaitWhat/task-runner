'use strict';

const routes = require('./routes');
const streams = require('./streams');
const validate = require('./validate');

module.exports = ({ data, database, server, socket, exit }) => {
	/* Validate task configuration */
	validate(data);

	/* Initialize tasks */
	let tasks = require('./tasks')(data, database, exit);

	/* And attach the corresponding routes */
	routes(tasks, server);
	streams(tasks, socket);
};
