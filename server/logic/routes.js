const route = require('koa-route');

module.exports = (tasks, server) => {
	server.use(route.get('/api/tasks', function*() {
		this.body = yield tasks.tasks();
	}));

	server.use(route.get('/api/task/:id', function*(id) {
		this.body = yield tasks.task(id);
	}));

	server.use(route.get('/api/invocation/:id', function*(id) {
		this.body = yield tasks.invocation(id);
	}));

	server.use(route.post('/api/invocation', function*() {
		let taskId = this.request.body.task;

		if(!taskId) {
			this.status = 400;
		} else {
			let task = yield tasks.task(taskId);

			if(!task) {
				this.status = 400;
			} else {
				this.body = yield tasks.run(task);
			}
		}
	}));
};
