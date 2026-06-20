<template>
  <div>
    <!-- Hero Header -->
    <AppHeader />

    <!-- Intro + Sidebar -->
    <section class="max-w-6xl mx-auto px-4 py-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="md:col-span-2">
          <div class="bg-white rounded-lg border border-gray-200 p-6">
            <p class="text-gray-600 leading-relaxed mb-4">
              燕山大学无线电爱好者协会，简称"无协"，是技术实践类社团，非常注重教学与实践，已经陪燕大走过<span class="font-semibold text-gray-800">37个春秋</span>。
            </p>
            <p class="text-gray-600 leading-relaxed mb-4">
              协会秉承"厚德、博学、求是"的燕大校训，发扬"艰苦奋斗、严谨治学、求实创新"的燕大精神，致力于培养和传播科学技术的热情。
            </p>
            <p class="text-gray-600 leading-relaxed">
              亲爱的同学们和爱好者们，欢迎加入无线电爱好者协会！我们是一个致力于探索和研究
              <span class="text-blue-600 font-medium">嵌入式技术</span>、
              <span class="text-blue-600 font-medium">编程</span>、
              <span class="text-blue-600 font-medium">机械建模</span>和
              <span class="text-blue-600 font-medium">智能控制</span>的团队。
            </p>
            <!-- Video placeholder -->
            <div class="mt-6 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 flex items-center justify-center aspect-video">
              <video controls class="w-full h-full object-cover" poster="/images/hero-bg.jpg" :src="videoSrc">
                <p class="text-gray-400 text-sm p-8 text-center">视频加载失败，请检查文件是否存在</p>
              </video>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="bg-white rounded-lg border border-gray-200 p-4">
            <h4 class="font-semibold text-sm mb-3 text-gray-700 border-b border-gray-100 pb-2">协会数据</h4>
            <div class="grid grid-cols-2 gap-3">
              <div v-for="(stat, i) in stats" :key="i" class="text-center p-2 bg-gray-50 rounded">
                <div class="text-xl font-bold text-blue-600">{{ stat.value }}</div>
                <div class="text-xs text-gray-500">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Recent Events -->
    <section class="max-w-6xl mx-auto px-4 pb-10">
      <div class="flex items-center justify-between mb-6">
        <h2 class="section-title mb-0 border-none">最新动态</h2>
        <RouterLink to="/activities" class="text-sm text-blue-600 hover:underline">查看更多</RouterLink>
      </div>
      <div class="space-y-4">
        <RouterLink
          v-for="(event, i) in recentEvents"
          :key="i"
          to="/activities"
          class="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md hover:border-gray-300 transition-all group"
        >
          <h3 class="text-lg font-semibold text-blue-600 group-hover:underline mb-2">{{ event.title }}</h3>
          <div class="text-sm text-gray-400 mb-2">{{ event.date }}</div>
          <p class="text-gray-600 text-sm leading-relaxed">{{ event.description }}</p>
        </RouterLink>
      </div>
    </section>

    <!-- Honors Preview -->
    <section class="max-w-6xl mx-auto px-4 pb-12">
      <div class="flex items-center justify-between mb-6">
        <h2 class="section-title mb-0 border-none">荣誉成就</h2>
        <RouterLink to="/honors" class="text-sm text-blue-600 hover:underline">查看更多</RouterLink>
      </div>
      <div class="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table class="w-full data-table">
          <thead>
            <tr>
              <th class="text-left">荣誉名称</th>
              <th class="text-left w-28">年份</th>
              <th class="text-left hidden md:table-cell">颁发机构</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(honor, i) in topHonors" :key="i">
              <td class="py-3">
                <span class="font-medium">{{ honor.title }}</span>
                <span v-if="honor.rank" class="ml-2 px-1.5 py-0.5 bg-red-50 text-red-600 text-xs rounded font-bold">TOP{{ honor.rank }}</span>
              </td>
              <td class="py-3 text-gray-500 text-sm">{{ honor.year }}</td>
              <td class="py-3 text-gray-500 text-sm hidden md:table-cell">{{ honor.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
import { stats, recentEvents, topHonors } from '@/data/siteData'
const videoSrc = '/public/image/招新视频.mp4'

</script>
