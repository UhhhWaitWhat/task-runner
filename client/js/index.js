import Vue from 'vue/dist/vue.js';
import Vuex from 'vuex';

import store from './store';

document.addEventListener('DOMContentLoaded', function ready() {
	document.removeEventListener('DOMContentLoaded', ready);

	new Vue({
		store,
		el: '#app',

		data: () => {
			let state = { now: Date.now() };

			window.setInterval(() => { state.now = Date.now(); }, 1000);

			return state;
		},

		computed: Object.assign(
			Vuex.mapState([
				'tasks',
				'socket',
				'errors',
				'loading'
			]),
			Vuex.mapGetters([
				'activeTask',
				'activeInvocation'
			])
		),

		methods: Object.assign(
			Vuex.mapActions([
				'selectTask',
				'selectInvocation',
				'startInvocation'
			]),
			Vuex.mapMutations([
				'removeError'
			])
		)
	});

	store.dispatch('loadTasks');
	store.dispatch('connectSocket');
});
