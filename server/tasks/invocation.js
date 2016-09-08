const co = require('co');
const EventEmitter = require('events').EventEmitter;

module.exports = (knex, onExit) => {
	/*
	 * Mapping of loaded invocations and their ids
	 * Needed because we have some data per invocation which persists across requests.
	 */
	let cache = {};

	return class Invocation extends EventEmitter {
		constructor({ task, id = null, end = null, start = Date.now(), output = '[]', exit = null }) {
			super();

			this.id = id;
			this.end = end;
			this.exit = exit;
			this.task = task;
			this.start = start;
			this.output = JSON.parse(output);
		}

		toJSON() {
			return {
				id: this.id,
				end: this.end,
				exit: this.exit,
				task: this.task,
				start: this.start,
				output: this.output
			};
		}

		/* Save the thing to disk */
		*save() {
			let data = this.toJSON();
			data.output = JSON.stringify(data.output);

			if(this.id) {
				yield knex('invocations').update(data).where({ id: this.id });
			} else {
				/* Set the inserted id on ourselves */
				this.id = (yield knex('invocations').insert(data))[0];
				cache[this.id] = this;
			}
		}

		/*
		 * Attach a set of output file descriptors to this task.
		 * The output will be redirected to the output property.
		 * For each piece of data, an event will be emitted and once the streams close,
		 * the data will be written to the database.
		 */
		attachProcess(proc) {
			proc.stdout.on('data', data => {
				data = data.toString();

				this.output.push({ fd: 'stdout', data: data });
				this.emit('output', { fd: 'stdout', data: data });
			});

			proc.stderr.on('data', data => {
				data = data.toString();

				this.output.push({ fd: 'stderr', data: data });
				this.emit('output', { fd: 'stderr', data: data });
			});

			let done = new Promise(res => {
				proc.on('exit', code => {
					this.end = Date.now();
					this.exit = code;

					this.emit('end', code);
					res();
				});
			})
			.then(() => co(this.save()))
			.catch(e => {
				console.error(e);
				process.exit(1);
			});

			/* Properly shut down the child process before we exit */
			onExit(() => {
				if(this.exit === null) {
					console.log(`Received exit signal. Aborting process ${proc.pid} for invocation ${this.id}`);
					proc.kill();

					setTimeout(() => {
						if(this.exit === null) {
							console.error(`Process ${proc.pid} did not exit within 5 seconds. Sending SIGKILL`);
							proc.kill('SIGKILL');
						}
					}, 5000);
				}

				return done;
			});
		}

		/* Get a set of invocations for a given where clause */
		static *get(where) {
			let data = yield knex('invocations').select('*').where(where);

			return data.map(record => {
				if(!cache[record.id]) {
					cache[record.id] = new Invocation(record);
				}

				return cache[record.id];
			});
		}
	};
};
