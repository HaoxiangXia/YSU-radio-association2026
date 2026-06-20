<template>
  <div class="min-h-screen bg-white text-gray-800">
    <AppNav />
    <main>
      <RouterView />
    </main>
    <AppFooter />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNav from '@/components/AppNav.vue'
import AppFooter from '@/components/AppFooter.vue'
</script>
