<template>
  <div class="page-container">
    <h1 class="section-title">荣誉成就</h1>

    <div v-for="(honor, i) in topHonors" :key="i" class="card mb-5 border-l-4 border-amber-400">
      <div class="flex items-center gap-3 mb-2 flex-wrap">
        <h2 class="text-lg font-bold text-gray-800">{{ honor.title }}</h2>
        <span v-if="honor.rank" class="px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded-full font-bold">TOP {{ honor.rank }}</span>
      </div>
      <div class="text-sm text-gray-500 mb-1">年份: {{ honor.year }}</div>
      <p class="text-gray-600 text-sm">{{ honor.description }}</p>
    </div>

    <div class="mt-10">
      <h2 class="section-title">2022年河北省高校活力团支部TOP10</h2>
      <p class="text-gray-600 mb-4">
        无线电爱好者协会团支部成功入选<span class="font-semibold text-red-600">2022年河北省高校活力团支部TOP10 - 改革味榜单</span>，位列第6名。
      </p>
      <div class="card overflow-hidden p-0">
        <div class="overflow-x-auto">
          <table class="w-full data-table">
            <thead><tr><th>序号</th><th>学校名称</th><th>支部名称</th></tr></thead>
            <tbody>
              <tr v-for="item in leagueTop10" :key="item.rank" :class="item.highlight ? 'bg-blue-50' : ''">
                <td class="font-mono text-sm" :class="item.highlight ? 'text-blue-600 font-bold' : 'text-gray-600'">{{ item.rank }}</td>
                <td class="text-sm" :class="item.highlight ? 'text-blue-600 font-medium' : 'text-gray-600'">{{ item.school }}</td>
                <td class="text-sm" :class="item.highlight ? 'text-blue-600 font-medium' : 'text-gray-600'">{{ item.name }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="mt-10">
      <h2 class="section-title">竞赛获奖情况</h2>
      <p class="text-gray-600 mb-4">社团内成员积极参加各类各项创新创业竞赛，如：</p>
      <div class="flex flex-wrap gap-2 mb-6">
        <span v-for="c in competitionList" :key="c" class="tag">{{ c }}</span>
      </div>
      <div class="card">
        <h3 class="font-bold mb-4">近三年竞赛成果</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
          <div><div class="text-2xl font-bold text-blue-600">13+</div><div class="text-xs text-gray-500">国家级奖项</div></div>
          <div><div class="text-2xl font-bold text-blue-600">30+</div><div class="text-xs text-gray-500">省级奖项</div></div>
          <div><div class="text-2xl font-bold text-blue-600">50+</div><div class="text-xs text-gray-500">二类竞赛奖项</div></div>
        </div>
      </div>
    </div>

    <div class="mt-10">
      <h2 class="section-title">协会成员个人荣誉</h2>
      <div class="card">
        <h3 class="font-bold mb-4">2023-2024学年协会负责人成就</h3>
        <div class="grid grid-cols-3 gap-4 text-center mb-4">
          <div><div class="text-2xl font-bold text-blue-600">7</div><div class="text-xs text-gray-500">国家级奖项</div></div>
          <div><div class="text-2xl font-bold text-blue-600">18</div><div class="text-xs text-gray-500">省级奖项</div></div>
          <div><div class="text-2xl font-bold text-blue-600">30+</div><div class="text-xs text-gray-500">校级竞赛奖项</div></div>
        </div>
        <p class="text-gray-600">
          协会成员中1人获得<span class="font-semibold text-red-600">本科生国家奖学金</span>，近<span class="font-semibold text-red-600">53%</span>协会成员获得校级奖学金。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { topHonors, leagueTop10, competitionList } from '@/data/siteData'
</script>
