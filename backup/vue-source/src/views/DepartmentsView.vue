<template>
  <div class="page-container">
    <h1 class="section-title">部门介绍</h1>

    <div v-for="(dept, index) in departments" :key="index" class="card mb-6">
      <h2 class="text-xl font-bold text-gray-800 mb-4 pb-3 border-b-2 border-blue-100">{{ dept.name }}</h2>

      <div class="grid grid-cols-3 gap-4 mb-5 p-3 bg-blue-50/50 rounded-lg">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ dept.stats.members }}</div>
          <div class="text-xs text-gray-500">部门成员</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ dept.stats.activities || dept.stats.projects || dept.stats.models || dept.stats.softwares || dept.stats.events }}</div>
          <div class="text-xs text-gray-500">{{ dept.statLabel1 }}</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{{ dept.stats.years || dept.stats.awards || dept.stats.printers || dept.stats.websites || dept.stats.honors }}</div>
          <div class="text-xs text-gray-500">{{ dept.statLabel2 }}</div>
        </div>
      </div>

      <div class="flex flex-wrap gap-2 mb-5">
        <span v-for="tag in dept.tags" :key="tag" class="tag">{{ tag }}</span>
      </div>

      <div class="bg-gray-50 p-4 rounded-lg mb-5 border-l-4 border-blue-400">
        <h3 class="font-semibold mb-2 text-sm text-gray-700">部门简介</h3>
        <p class="text-gray-600 text-sm leading-relaxed">{{ dept.description }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h3 class="font-semibold mb-3 text-sm text-blue-600">主要职责</h3>
          <ul class="space-y-2">
            <li v-for="item in dept.responsibilities" :key="item" class="text-sm text-gray-600 flex items-start gap-2">
              <span class="text-blue-400 mt-1">-</span>{{ item }}
            </li>
          </ul>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h3 class="font-semibold mb-3 text-sm text-blue-600">部门特色</h3>
          <ul class="space-y-2">
            <li v-for="item in dept.features" :key="item" class="text-sm text-gray-600 flex items-start gap-2">
              <span class="text-blue-400 mt-1">-</span>{{ item }}
            </li>
          </ul>
        </div>
        <div class="bg-gray-50 p-4 rounded-lg border-l-4 border-blue-400">
          <h3 class="font-semibold mb-3 text-sm text-blue-600">学习内容</h3>
          <ul class="space-y-2">
            <li v-for="item in dept.learn" :key="item" class="text-sm text-gray-600 flex items-start gap-2">
              <span class="text-blue-400 mt-1">-</span>{{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { departments } from '@/data/siteData'
</script>
