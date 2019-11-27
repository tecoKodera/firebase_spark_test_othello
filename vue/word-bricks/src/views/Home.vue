<template>
  <div class="home">
    <MyHeader></MyHeader>
    <div class="main">
      <div class="game">
        <Game />
      </div>
      <div class="game-side"><Chat></Chat></div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import MyHeader from '@/components/MyHeader.vue'
import Chat from '@/components/Chat.vue'
import Game from '@/components/Game.vue'

@Component({
  components: {
    MyHeader,
    Chat,
    Game
  }
})
export default class Home extends Vue {
}
</script>

<style>
* {
  margin: 0;
  box-sizing: border-box;
}
.main {
  display: flex;
}
.game {
  flex-basis: 90%;
}
.game-side {
  flex-basis: 10%;
}
</style>
