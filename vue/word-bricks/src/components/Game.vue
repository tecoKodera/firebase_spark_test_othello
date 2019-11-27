<template>
  <div class="grid">
    <div
      class="cell"
      v-for="(cell, idx) in map"
      :key="idx"
      v-on:click="put(idx)"
    >
      <label
        v-bind:class="{ none: cell == 0, white: cell == 1, black: cell == 2 }"
      ></label>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import firebase from 'firebase'

@Component
export default class Chat extends Vue {
  public user: any = {}
  public map: number[] = new Array(8 * 8).fill(0)

  public created() {
    firebase.auth().onAuthStateChanged(user => {
      this.user = user ? user : {}
      if (!user) {
        return
      }
      firebase
        .firestore()
        .collection('game')
        .onSnapshot(querySnapshot => {
          const map: number[] = new Array(8 * 8).fill(0)
          querySnapshot.forEach(doc => {
            const data = doc.data()
            map[
              parseInt(doc.id.split('_')[0], 10) * 8 +
                parseInt(doc.id.split('_')[1], 10)
            ] = data.value
          })
          this.map = map
        })
    })
  }

  public put(idx: number) {
    if (!this.user.uid) {
      return
    }
    const pos = `${Math.floor(idx / 8)}_${idx % 8}`
    firebase
      .firestore()
      .collection('game')
      .doc('next_put')
      .set({ pos })
  }
}
</script>

<style scoped>
.grid {
  margin: auto;
  padding: 10px;
  display: grid;
  width: 400px;
  height: 400px;
  background-color: #008000;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
}
.cell {
  border: 1px solid #000000;
  padding: 3px;
  display: flex;
  justify-content: center;
  align-items: center;
}
label {
  cursor: pointer;
  line-height: 0;
  width: 90%;
  height: 90%;
  border-radius: 50%;
}
label.none {
  background-color: transparent;
}
label.black {
  background-color: #000000;
}
label.white {
  background-color: #ffffff;
}
</style>
