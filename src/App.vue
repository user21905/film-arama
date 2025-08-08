<template>
  <div id="app" class="dark-bg">
    <AppNavbar />
    <div class="main-content">
      <router-view />
    </div>
  </div>
</template>

<script>
import AppNavbar from './components/AppNavbar.vue'

export default {
  name: 'App',
  components: {
    AppNavbar
  }
}
</script>

<style>
body, #app, .dark-bg {
  background: #181828 !important;
  min-height: 100vh;
}
.main-content {
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
}
.header {
  display: flex;
  align-items: center;
  gap: 12px;
  position: absolute;
  top: 20px;
  left: 20px;
}
.logo {
  width: 48px;
  height: 48px;
}
.logo-title {
  font-size: 2rem;
  font-weight: bold;
  color: #1976d2;
  letter-spacing: 2px;
}
</style>
