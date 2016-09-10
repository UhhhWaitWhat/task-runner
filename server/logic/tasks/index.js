'use strict';

const EventEmitter = require('events').EventEmitter;

module.exports = (data, knex, onExit) => {
	let Invocation = require('./invocation')(knex, onExit);
	let Task = require('./task')(Invocation);

	class Tasks extends EventEmitter {
		constructor(taskData) {
			super();

			/* Instantiate all tasks */
			this.taskStore = taskData.map(d => new Task(d)).reduce((c, t) => { c[t.id] = t; return c; }, {});
		}

		/* Get a single task */
		*task(id) {
			return yield this.taskStore[id].loadInvocations();
		}

		/* Get a list of all tasks */
		*tasks() {
			return yield Object.keys(this.taskStore).map(id => this.taskStore[id].loadInvocations());
		}

		/* Get a specific invocation */
		*invocation(id) {
			let invocations = yield Invocation.get({ id });

			if(invocations[0]) {
				return invocations[0];
			} else {
				throw new Error('Invocation not found');
			}
		}

		/* Run a specific task */
		*run(task) {
			if(task.running) {
				/* Return the currently running invocation if available */
				return task.invocations[0];
			} else {
				yield task.run();
				let invocation = task.invocations[0];

				this.emit('startedInvocation', invocation);
				invocation.once('end', () => this.emit('finishedInvocation', invocation));

				return invocation;
			}
		}
	}

	return new Tasks(data);
};
