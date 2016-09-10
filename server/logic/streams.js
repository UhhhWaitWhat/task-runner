'use strict';

const co = require('co');

module.exports = (tasks, server) => {
	tasks.on('startedInvocation', invocation => {
		server.clients.forEach(c => {
			c.send(JSON.stringify({
				type: 'start',
				data: invocation
			}));
		});
	});

	tasks.on('finishedInvocation', invocation => {
		server.clients.forEach(c => {
			c.send(JSON.stringify({
				type: 'end',
				data: invocation
			}));
		});
	});

	server.on('connection', connection => {
		let handler = () => {};

		/* Subscribe to the output stream of a specific invocation */
		function subscribe(invocation) {
			/* Detach if already attached */
			handler();

			/* Define the handlers */
			let output = data => connection.send(JSON.stringify({ type: 'output', data: { id: invocation.id, data } }));

			/* Create a detachment function */
			handler = () => {
				invocation.removeListener('output', output);

				/* Prevent detaching twice */
				handler = () => {};
			};

			/* Actually attach the handlers */
			invocation.on('output', output);

			/* Send the already existing output to prevent mismatches */
			invocation.output.forEach(data => {
				output(data);
			});
		}

		/* Handle subscription */
		connection.on('message', id => {
			co(tasks.invocation(id))
				.then(invocation => subscribe(invocation))
				.catch(e => console.error(e));
		});

		/* Detach upon connection close */
		connection.on('close', () => handler());
	});
};
