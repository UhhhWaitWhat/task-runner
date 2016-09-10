'use strict';

const crypto = require('crypto');
const spawn = require('child_process').spawn;

module.exports = Invocation => class Task {
	constructor({ name, script, cwd = process.cwd(), args = [] }) {
		/* Create an id based on the scipt properties */
		this.id = crypto.createHash('sha256').update(JSON.stringify({ script, args, cwd })).digest('hex');

		this.cwd = cwd;
		this.args = args;
		this.name = name;
		this.script = script;
		this.running = false;
		this.invocations = [];
	}

	toJSON() {
		return {
			id: this.id,
			cwd: this.cwd,
			args: this.args,
			name: this.name,
			script: this.script,
			running: this.running,
			invocations: this.invocations
		};
	}

	/* Load all invocations of this task, ordered by descending invocation time */
	*loadInvocations() {
		this.invocations = (yield Invocation.get({ task: this.id })).sort((a, b) => b.start - a.start);

		return this;
	}

	/*
	 * Run this task if it is not running yet
	 */
	*run() {
		if(!this.running) {
			this.running = true;

			/* Create a new invocation */
			let invocation = new Invocation({ task: this.id });
			yield invocation.save();

			/* Start the task */
			invocation.attachProcess(spawn(this.script, this.args, { cwd: this.cwd }));
			invocation.once('end', () => { this.running = false; });

			this.invocations.unshift(invocation);
		}
	}
};
