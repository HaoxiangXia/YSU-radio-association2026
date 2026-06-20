<template>
  <header class="relative h-[280px] md:h-[360px] overflow-hidden">
    <div class="absolute inset-0">
      <img src="/images/hero-bg.jpg" alt="燕山大学校园" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-black/30" />
    </div>
    <div class="relative z-10 flex flex-col items-center justify-center h-full text-white px-4">
      <h1 class="text-3xl md:text-5xl font-bold mb-3 tracking-wide" style="text-shadow: 0 2px 8px rgba(0,0,0,0.4);">
        无线电爱好者协会
      </h1>
      <p class="text-base md:text-lg opacity-90 mb-6" style="text-shadow: 0 1px 4px rgba(0,0,0,0.4);">
        燕山大学技术实践类社团 · 陪伴燕大37载
      </p>
      <div class="flex gap-3">
        <RouterLink to="/departments" class="btn-primary">了解更多</RouterLink>
        <RouterLink to="/registration" class="btn-primary">立即报名</RouterLink>
      </div>
    </div>
  </header>
</template>
