'use strict';

module.exports = ({ schema }) => schema.createTable('invocations', table => {
	table.increments();
	table.string('task');
	table.integer('exit');
	table.text('output');
	table.integer('start');
	table.integer('end');
});
