<template>
  <div class="page-container">
    <h1 class="section-title">协会活动</h1>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
      <RouterLink to="/activities/competition" class="card text-center group block p-8">
        <div class="text-4xl font-bold text-amber-600 mb-3 group-hover:scale-110 transition-transform">竞赛</div>
        <h2 class="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">竞赛活动</h2>
        <p class="text-gray-500 text-sm leading-relaxed mb-4">
          协会组织的各类科技竞赛，包括嵌入式大赛、DIY达人赛等，展示成员的创新能力和技术水平。
        </p>
        <span class="inline-block mt-4 text-sm text-blue-600 font-medium group-hover:underline">查看竞赛活动</span>
      </RouterLink>

      <RouterLink to="/activities/recreational" class="card text-center group block p-8">
        <div class="text-4xl font-bold text-green-600 mb-3 group-hover:scale-110 transition-transform">文娱</div>
        <h2 class="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">文娱活动</h2>
        <p class="text-gray-500 text-sm leading-relaxed mb-4">
          协会举办的各类文化娱乐活动，包括欢送晚会、科普宣传等，增强成员间交流与协会影响力。
        </p>
        <span class="inline-block mt-4 text-sm text-blue-600 font-medium group-hover:underline">查看文娱活动</span>
      </RouterLink>
    </div>
  </div>
</template>
