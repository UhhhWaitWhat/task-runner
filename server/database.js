const knex = require('knex');

module.exports = database => {
	/* Create database */
	let db = knex({
		client: 'sqlite3',
		useNullAsDefault: true,
		connection: {
			filename: database
		}
	});

	/* Die on database error */
	db.client.pool.on('error', e => {
		console.error(`Database connection failed:\n\n${e}`);
		process.exit(1);
	});

	return db;
};
