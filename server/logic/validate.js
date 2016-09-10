'use strict';

const fs = require('fs');
const assert = require('assert');

/* Check if a file exists */
function exists(path) {
	try {
		fs.accessSync(path, fs.constants.F_OK);
		return true;
	} catch(e) {
		return false;
	}
}

/* Format something as json and indent it by 4 spaces */
function printJSON(obj) {
	let json = JSON.stringify(obj, null, 4);

	return json.split('\n').map(line => `    ${line}`).join('\n');
}

/* Check the task objects validity */
module.exports = tasks => {
	assert(Array.isArray(tasks), 'Toplevel entry in task definitions has to be an Array.');

	tasks.forEach((task, i) => {
		assert(
			task.name,
			`The task at position ${i + 1} seems to be missing a name:\n${printJSON(task)}`
		);

		assert(
			typeof task.name === 'string',
			`The tasks name at position ${i + 1} is not a string:\n${printJSON(task)}`
		);

		assert(
			task.script,
			`The '${task.name}' task is missing a 'script' property:\n${printJSON(task)}`
		);

		assert(
			typeof task.script === 'string',
			`The '${task.name}' tasks 'script' property is not a string:\n${printJSON(task)}`
		);

		assert(
			exists(task.script),
			`The '${task.name}' tasks 'script' target does not exist:\n${printJSON(task)}`
		);

		if(task.args) {
			assert(
				Array.isArray(task.args),
				`The '${task.name}' tasks 'args' property is not an array:\n${printJSON(task)}`
			);

			assert(
				task.args.filter(a => typeof a !== 'string').length === 0,
				`The '${task.name}' tasks 'args' property does not consist only of strings:\n${printJSON(task)}`
			);
		}

		if(task.cwd) {
			assert(
				typeof task.cwd === 'string',
				`The '${task.name}' tasks 'cwd' property is not a string:\n${printJSON(task)}`
			);

			assert(
				exists(task.cwd),
				`The '${task.name}' task has a 'cwd' property but the target is not accessible:\n${printJSON(task)}`
			);
		}
	});
};
