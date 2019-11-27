import Vue from 'vue'
import App from './App.vue'
import store from './store'
import firebase from 'firebase/app'

Vue.config.productionTip = false

const config = {
  apiKey: 'AIzaSyBcZvpPSP5R9zeoGdQxZF8jJSZqvLVk-Ss',
  authDomain: 'word-bricks-8376e.firebaseapp.com',
  databaseURL: 'word-bricks-8376e.firebaseio.com',
  projectId: 'word-bricks-8376e'
}

firebase.initializeApp(config)

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')
