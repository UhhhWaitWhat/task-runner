const fs = require('fs');
const path = require('path');

module.exports = knex => {
	let migrationDir = path.join(__dirname, '../migrations');

	/* Load all migrations */
	let migrations = fs.readdirSync(migrationDir)
		.sort((a, b) => parseInt(a) - parseInt(b))
		.map(f => path.join(migrationDir, f))
		.map(require);

	/* Create migrations table if neccessary */
	return knex.schema.createTableIfNotExists('migrations', table => {
		table.integer('id');
	}).then(() => {
		/* Get latest applied migration */
		let ids = knex.select('id').from('migrations')
			.orderBy('id', 'desc').limit(1);

		return ids.then(i => i.length ? parseInt(i[0].id) : 0);
	}).then(latest => {
		let needed = migrations.slice(latest);

		/* Run all the needed migrations in order */
		return needed.reduce(
			(last, next, i) =>
				last.then(() => knex.transaction(next))
					.then(() => knex.insert({ id: latest + i + 1 }).into('migrations')),
			Promise.resolve()
		).then(() => knex);
	});
};
