<template>
  <nav class="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
    <div class="max-w-6xl mx-auto px-4">
      <div class="flex items-center justify-between h-14">
        <!-- Logo with emblem -->
        <RouterLink to="/" class="flex items-center gap-2.5 text-gray-800 hover:text-blue-600 transition-colors shrink-0">
          <img src="/images/emblem.png" alt="会徽" class="w-8 h-8" />
          <span class="font-semibold text-sm hidden sm:inline">无线电爱好者协会</span>
        </RouterLink>

        <!-- Desktop Nav -->
        <div class="hidden md:flex items-center gap-0.5">
          <RouterLink
            v-for="link in navLinks"
            :key="link.path"
            :to="link.path"
            class="px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600 rounded transition-colors"
            :class="{ 'text-blue-600 font-medium bg-blue-50': isActive(link.path) }"
          >
            {{ link.label }}
          </RouterLink>
        </div>

        <!-- Mobile Menu Button -->
        <button @click="mobileOpen = !mobileOpen" class="md:hidden p-2 text-gray-600 text-sm font-medium">
          {{ mobileOpen ? '关闭' : '菜单' }}
        </button>
      </div>

      <!-- Mobile Menu -->
      <div v-if="mobileOpen" class="md:hidden pb-3 border-t border-gray-100">
        <RouterLink
          v-for="link in navLinks"
          :key="link.path"
          :to="link.path"
          class="block px-3 py-2 text-sm text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          :class="{ 'text-blue-600 font-medium bg-blue-50': isActive(link.path) }"
          @click="mobileOpen = false"
        >
          {{ link.label }}
        </RouterLink>
      </div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const mobileOpen = ref(false)

const navLinks = [
  { label: '首页', path: '/' },
  { label: '部门介绍', path: '/departments' },
  { label: '协会活动', path: '/activities' },
  { label: '荣誉成就', path: '/honors' },
  { label: '培训教学', path: '/trainings' },
  { label: '招新报名', path: '/registration' },
  { label: '录取查询', path: '/admission' },
]

const isActive = (path: string) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
