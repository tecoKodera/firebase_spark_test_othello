<template>
  <header class="header">
    <div v-if="user.uid" key="login">
      [{{ user.displayName }}]
      <button type="button" @click="doLogout">ログアウト</button>
    </div>
    <div v-else key="logout">
      <button type="button" @click="doLogin">ログイン</button>
    </div>
  </header>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import firebase from 'firebase'

@Component
export default class MyHeader extends Vue {
  public user: any = {}

  public created() {
    firebase.auth().onAuthStateChanged(user => {
      this.user = user ? user : {}
    })
  }

  public doLogin() {
    const provider = new firebase.auth.GoogleAuthProvider()
    firebase.auth().signInWithPopup(provider)
  }

  public doLogout() {
    firebase.auth().signOut()
  }
}
</script>

<style scoped>
.header {
  background: #3ab383;
  margin-bottom: 1em;
  padding: 0.4em 0.8em;
  color: #ffffff;
}
</style>
