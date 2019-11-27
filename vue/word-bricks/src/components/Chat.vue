<template>
  <div class="chat">
    <transition-group name="chat-log" class="list content">
      <section v-for="{ key, name, message } in chat" :key="key" class="item">
        <div class="item-detail">
          <div class="item-name">{{ name }}</div>
          <div class="item-message">
            <span class="wrap" v-text="message" />
          </div>
        </div>
      </section>
    </transition-group>
    <form action="" @submit.prevent="doSend" class="form">
      <textarea
        v-model="input"
        :disabled="!user.uid"
        @keydown.enter.exact.prevent="doSend"
      ></textarea>
      <button type="submit" :disabled="!user.uid" class="send-button">
        発言
      </button>
    </form>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import firebase from 'firebase'

@Component
export default class Chat extends Vue {
  public user: any = {}
  public chat: Array<{ key: number; name: string; message: string }> = []
  public input: string = ''

  public created() {
    firebase.auth().onAuthStateChanged(user => {
      this.user = user ? user : {}
      if (!user) {
        return
      }
      firebase
        .firestore()
        .collection('chat')
        .onSnapshot(querySnapshot => {
          const chats: Array<{
            key: number
            name: string
            message: string
          }> = []
          querySnapshot.forEach(doc => {
            const data = doc.data()
            chats.push({
              key: data.key,
              name: data.name,
              message: data.message
            })
          })
          this.chat = chats.sort((a, b) => b.key - a.key)
        })
      setInterval(() => {
        if (Math.random() < 0.1) {
          this.triggerNoise()
        }
      }, 5 * 1000)
    })
  }

  public doSend() {
    if (!this.user.uid || !this.input.length) {
      return
    }
    firebase
      .firestore()
      .collection('chat')
      .add({
        message: this.input,
        name: this.user.displayName
      })
      .then(() => {
        this.input = ''
      })
  }

  public triggerNoise() {
    if (!this.user.uid) {
      return
    }
    firebase
      .firestore()
      .collection('noise')
      .doc('trigger')
      .set({
        created: Date.now()
      })
  }
}
</script>

<style scoped>
.content {
  margin: 0 auto;
  padding: 0 10px;
  max-width: 600px;
}
.form {
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  bottom: 0;
  height: 80px;
  width: 100%;
  background: #f5f5f5;
}
.form textarea {
  border: 1px solid #ccc;
  border-radius: 2px;
  height: 4em;
  width: calc(100%-6em);
  resize: none;
}
.list {
  margin-bottom: 100px;
}
.item {
  position: relative;
  display: flex;
  align-items: flex-end;
  margin-bottom: 0.8em;
}
.item-detail {
  margin: 0 0 0 1.4em;
}
.item-name {
  font-size: 75%;
}
.item-message {
  position: relative;
  display: inline-block;
  padding: 0.8em;
  background: #deefe8;
  border-radius: 4px;
  line-height: 1.2em;
}
.item-message::before {
  position: absolute;
  content: ' ';
  display: block;
  left: -16px;
  bottom: 12px;
  border: 4px solid transparent;
  border-right: 12px solid #deefe8;
}
.send-button {
  height: 4em;
}
.wrap {
  white-space: pre;
}
.chat-log-enter-active {
  transition: all 1s;
}
.chat-log-enter {
  opacity: 0;
  transform: translateX(-1em);
}
</style>
