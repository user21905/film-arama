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
  margin: 0;
  padding: 0;
}

.main-content {
  padding-top: 20px;
  min-height: calc(100vh - 80px);
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #f4f4f4;
  line-height: 1.6;
}

/* Global scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #2c2c3a;
}

::-webkit-scrollbar-thumb {
  background: #4cc9f0;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #64b5f6;
}

/* Global focus styles */
*:focus {
  outline: 2px solid #4cc9f0;
  outline-offset: 2px;
}

/* Global selection styles */
::selection {
  background: #4cc9f0;
  color: #ffffff;
}
</style>
