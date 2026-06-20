<template>
  <footer class="bg-gray-50 border-t border-gray-200 mt-12">
    <div class="max-w-6xl mx-auto px-4 py-10">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <h4 class="font-semibold text-sm mb-3 text-gray-700">无线电爱好者协会</h4>
          <p class="text-sm text-gray-500 leading-relaxed">
            燕山大学技术实践类社团，致力于培养和传播科学技术的热情。
          </p>
          <RouterLink to="/admin-login" class="inline-block mt-3 text-xs text-gray-400 hover:text-blue-600 transition-colors">
            管理员入口
          </RouterLink>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-3 text-gray-700">快速链接</h4>
          <div class="space-y-1.5">
            <RouterLink v-for="link in quickLinks" :key="link.path" :to="link.path" class="block text-sm text-gray-500 hover:text-blue-600 transition-colors">
              {{ link.label }}
            </RouterLink>
          </div>
        </div>
        <div>
          <h4 class="font-semibold text-sm mb-3 text-gray-700">联系我们</h4>
          <p class="text-sm text-gray-500">联系人：郭思源</p>
          <p class="text-sm text-gray-500">电话：15371530788</p>
          <p class="text-sm text-gray-500 mt-2">燕山大学 · 无线电爱好者协会</p>
        </div>
      </div>
      <div class="mt-8 pt-6 border-t border-gray-200 text-center">
        <p class="text-xs text-gray-400">
          &copy; 2025 燕山大学无线电爱好者协会 | 挖掘潜质，就在无协
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const quickLinks = [
  { label: '部门介绍', path: '/departments' },
  { label: '协会活动', path: '/activities' },
  { label: '荣誉成就', path: '/honors' },
  { label: '培训教学', path: '/trainings' },
  { label: '招新报名', path: '/registration' },
]
</script>
