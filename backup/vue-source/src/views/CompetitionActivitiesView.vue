<template>
  <div class="page-container">
    <RouterLink to="/activities" class="inline-block text-blue-600 hover:underline mb-4 text-sm">返回协会活动</RouterLink>
    <h1 class="section-title">竞赛活动</h1>

    <div v-for="(comp, index) in competitions" :key="index" class="card mb-6">
      <div class="flex items-center gap-3 mb-3">
        <h3 class="text-lg font-bold text-gray-800">{{ comp.name }}</h3>
        <span class="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs rounded">{{ comp.year }}</span>
      </div>
      <div class="flex flex-wrap gap-4 mb-3 text-sm text-gray-500">
        <span>{{ comp.date }}</span>
        <span>{{ comp.participants }}人参与</span>
      </div>
      <div class="bg-gray-50 p-4 rounded-lg mb-3">
        <strong class="text-sm text-blue-600 block mb-2">竞赛亮点</strong>
        <ul class="space-y-1">
          <li v-for="h in comp.highlights" :key="h" class="text-sm text-gray-600 flex items-start gap-2">
            <span class="text-blue-400">-</span>{{ h }}
          </li>
        </ul>
      </div>
      <p class="text-gray-600 text-sm leading-relaxed mb-3">{{ comp.description }}</p>
      <div class="flex flex-wrap gap-2">
        <span v-for="track in comp.tracks" :key="track" class="tag">{{ track }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { competitions } from '@/data/siteData'
</script>
