import Vuex from 'vuex';

let socket;

export default new Vuex.Store({
	state: {
		tasks: [],
		socket: {
			connected: false
		},

		errors: [],
		loading: true
	},

	getters: {
		activeTask: state => state.tasks.find(t => t.active),
		activeInvocation: state => {
			let task = state.tasks.find(t => t.active);
			return task ? task.invocations.find(i => i.active) : undefined;
		}
	},

	mutations: {
		addError: (state, message) => {
			state.errors.push(message);
		},
		removeError: (state, position) => {
			state.errors.splice(position, 1);
		},

		setTasks: (state, tasks) => {
			tasks.forEach(t => {
				t.active = false;
				t.invocations.forEach(i => {
					i.active = false;
				});
			});

			state.tasks = tasks;
			state.loading = false;
		},

		selectTask: (state, id) => {
			let activeTask = state.tasks.find(t => t.active)

			if(activeTask) {
				activeTask.active = false;
			}

			state.tasks.find(t => t.id === id).active = true;
		},
		selectInvocation: (state, id) => {
			let activeTask = state.tasks.find(t => t.active);

			activeTask.invocations.forEach(i => i.active = false);
			activeTask.invocations.find(t => t.id === id).active = true;
		},

		socketDisconnected: state => {
			state.socket.connected = false;
		},
		socketConnected: state => {
			state.socket.connected = true;
		},
		socketSubscribed: state => {
			state.tasks.find(t => t.active).invocations.find(i => i.active).output = [];
		},

		setExit: (state, { id, exit, end }) => {
			for(let task of state.tasks) {
				let invocation = task.invocations.find(i => i.id === id);

				if(invocation) {
					task.running = false;
					invocation.end = end;
					invocation.exit = exit;
				}
			}
		},
		addInvocation: (state, invocation) => {
			invocation.active = false;
			let task = state.tasks.find(t => t.id === invocation.task);

			task.running = true;
			task.invocations.unshift(invocation);
		},
		pushOutput: (state, { id, data }) => {
			state.tasks.find(t => t.active).invocations.find(i => i.id === id).output.push(data);
		}
	},

	actions: {
		loadTasks: ({ commit, dispatch, state }) => {
			return fetch('/api/tasks')
				.then(res => res.json())
				.then(tasks => {
					commit('setTasks', tasks);
					dispatch('selectTask', tasks[0].id);
				})
				.catch(e => {
					console.error(e);
					commit('addError', 'Failed to load Tasks.');
				});
		},

		connectSocket: ({ commit, dispatch, state }) => {
			commit('socketDisconnected');
			socket = new WebSocket('ws://localhost:3000');

			socket.onopen = () => {
				commit('socketConnected');
				dispatch('subscribeSocket');
			};

			socket.onclose = () => dispatch('connectSocket');

			socket.onmessage = ({ data: json }) => {
				let { type, data } = JSON.parse(json);

				switch(type) {
					case 'start':
						commit('addInvocation', data);

						if(state.tasks.find(t => t.id === data.task).active) {
							dispatch('selectInvocation', data.id);
						}

						break;
					case 'end':
						commit('setExit', data);
						break;
					case 'output':
						commit('pushOutput', data);
						break;
				}
			};
		},

		subscribeSocket: ({ getters, commit, state }) => {
			if(state.socket.connected && getters.activeInvocation) {
				socket.send(getters.activeInvocation.id);

				commit('socketSubscribed');
			}
		},

		selectTask: ({ commit, dispatch, getters, state }, id) => {
			commit('selectTask', id);

			if(!getters.activeInvocation && getters.activeTask.invocations.length > 0) {
				commit('selectInvocation', getters.activeTask.invocations[0].id);
			}

			return dispatch('subscribeSocket');
		},

		selectInvocation: ({ commit, dispatch }, id) => {
			commit('selectInvocation', id);

			return dispatch('subscribeSocket');
		},

		startInvocation: ({ dispatch }, taskId) => {
			return fetch('/api/invocation', {
				headers: { 'Content-Type': 'application/json' },
				method: 'POST',
				body: JSON.stringify({ task: taskId })
			}).catch(e => {
				console.error(e);
				commit('addError', 'Failed to invoke Task.');
			});
		}
	}
});
