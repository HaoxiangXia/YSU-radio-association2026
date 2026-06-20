<template>
  <div class="page-container">
    <RouterLink to="/activities" class="inline-block text-blue-600 hover:underline mb-4 text-sm">返回协会活动</RouterLink>
    <h1 class="section-title">文娱活动</h1>

    <div v-for="(activity, index) in recreationalActivities" :key="index" class="card mb-6">
      <h3 class="text-lg font-bold text-gray-800 mb-3">{{ activity.name }}</h3>
      <div class="flex flex-wrap gap-4 mb-3 text-sm text-gray-500">
        <span>{{ activity.date }}</span>
        <span>{{ activity.participants }}</span>
      </div>
      <p class="text-gray-600 text-sm leading-relaxed mb-3">{{ activity.description }}</p>
      <div class="pt-3 border-t border-dashed border-gray-200">
        <strong class="text-sm text-blue-600">活动成果：</strong>
        <span class="text-gray-600 text-sm">{{ activity.achievements }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { recreationalActivities } from '@/data/siteData'
</script>
