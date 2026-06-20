<template>
  <div class="page-container">
    <h1 class="section-title">培训教学</h1>

    <div class="card mb-8">
      <h2 class="text-lg font-bold mb-4 text-blue-600">协会培养体系</h2>
      <p class="text-gray-600 leading-relaxed mb-6">
        无线电爱好者协会拥有一套完整的培养体系与成熟的教练团队，每年秋季学期公布培训安排与授课教师，提供广阔场地与专业设备。
      </p>
      <div class="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div v-for="s in trainingStats" :key="s.label" class="text-center p-3 bg-blue-50 rounded-lg">
          <div class="text-lg font-bold text-blue-600">{{ s.value }}</div>
          <div class="text-xs text-gray-500">{{ s.label }}</div>
        </div>
      </div>
      <div>
        <h3 class="font-semibold text-sm mb-3">学员可掌握技能</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="tag in skillTags" :key="tag" class="tag">{{ tag }}</span>
        </div>
      </div>
    </div>

    <div class="mb-8">
      <h2 class="section-title">培训时间线</h2>
      <div class="relative pl-6">
        <div class="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200" />
        <div v-for="(item, i) in trainingTimeline" :key="i" class="relative card mb-4">
          <div class="absolute -left-6 top-4 w-3 h-3 rounded-full bg-blue-600 border-2 border-white shadow" />
          <div class="font-mono text-sm text-blue-600 mb-1">{{ item.date }}</div>
          <h3 class="font-bold text-gray-800">{{ item.title }}</h3>
          <p class="text-gray-500 text-sm">{{ item.desc }}</p>
        </div>
      </div>
    </div>

    <div class="card mb-8 overflow-hidden p-0">
      <div class="p-4 border-b border-gray-100 bg-gray-50">
        <h2 class="font-bold text-gray-800">每周培训课程安排</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead><tr><th class="w-20">周次</th><th>教学内容</th></tr></thead>
          <tbody>
            <tr v-for="c in courseSchedule" :key="c.week" class="hover:bg-gray-50">
              <td class="font-mono text-sm text-blue-600">{{ c.week }}</td>
              <td class="text-sm text-gray-700">{{ c.content }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="mb-8">
      <h2 class="section-title">往期培训</h2>
      <div v-for="(t, i) in pastTrainings" :key="i" class="card mb-4">
        <h3 class="font-bold text-gray-800 mb-2">{{ t.title }}</h3>
        <div class="flex flex-wrap gap-3 text-sm text-gray-500 mb-2">
          <span>时间: {{ t.date }}</span>
          <span>地点: {{ t.location }}</span>
          <span>讲师: {{ t.instructor }}</span>
        </div>
        <p class="text-gray-600 text-sm mb-1">{{ t.description }}</p>
        <p class="text-blue-600 text-sm"><strong>适合人群:</strong> {{ t.target }}</p>
      </div>
    </div>

    <div class="card text-center bg-gradient-to-r from-blue-50 to-blue-100/50 border-blue-200">
      <h3 class="text-lg font-bold mb-2 text-gray-800">想参加我们的培训吗？</h3>
      <p class="text-gray-600 mb-4">立即报名加入无线电爱好者协会，获取更多学习资源和实践机会！</p>
      <RouterLink to="/registration" class="btn-solid">立即报名</RouterLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { trainingStats, skillTags, trainingTimeline, courseSchedule, pastTrainings } from '@/data/siteData'
</script>
