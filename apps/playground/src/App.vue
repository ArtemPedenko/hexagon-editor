<script setup lang="ts">
import {RouterLink, RouterView} from 'vue-router';
</script>

<template>
  <div class="app-shell">
    <nav class="app-nav" aria-label="Playground sections">
      <RouterLink class="app-nav__brand" to="/editor">Hexagon editor</RouterLink>
      <div class="app-nav__tabs">
        <RouterLink class="app-nav__tab" to="/editor">Editor</RouterLink>
        <RouterLink class="app-nav__tab" to="/docs/getting-started">Documentation</RouterLink>
      </div>
    </nav>
    <RouterView />
  </div>
</template>
