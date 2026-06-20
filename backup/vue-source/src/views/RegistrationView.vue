<template>
  <div class="page-container max-w-2xl">
    <h1 class="section-title">报名信息</h1>

    <div class="card mb-6 border-t-4 border-blue-600">
      <h3 class="font-bold mb-2 text-gray-800">报名须知</h3>
      <p class="text-gray-500 text-sm">请填写以下信息完成报名，我们会尽快与您联系确认相关事宜</p>
      <p class="text-gray-500 text-sm">标有 <span class="text-red-500">*</span> 的为必填项</p>
    </div>

    <form @submit.prevent="handleSubmit" class="card space-y-4">
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">姓名 <span class="text-red-500">*</span></label>
        <input v-model="form.name" type="text" required class="form-input" placeholder="请输入姓名" />
        <p v-if="errors.name" class="text-red-500 text-xs mt-1">{{ errors.name }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">学号 <span class="text-red-500">*</span></label>
        <input v-model="form.studentId" type="text" required class="form-input" placeholder="请输入学号" />
        <p v-if="errors.studentId" class="text-red-500 text-xs mt-1">{{ errors.studentId }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">学院 <span class="text-red-500">*</span></label>
        <select v-model="form.college" required class="form-input"><option value="">请选择学院</option><option v-for="c in colleges" :key="c" :value="c">{{ c }}</option></select>
        <p v-if="errors.college" class="text-red-500 text-xs mt-1">{{ errors.college }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">年级 <span class="text-red-500">*</span></label>
        <select v-model="form.grade" required class="form-input"><option value="">请选择年级</option><option v-for="g in grades" :key="g" :value="g">{{ g }}</option></select>
        <p v-if="errors.grade" class="text-red-500 text-xs mt-1">{{ errors.grade }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">联系电话 <span class="text-red-500">*</span></label>
        <input v-model="form.phone" type="tel" required class="form-input" placeholder="请输入手机号码" />
        <p v-if="errors.phone" class="text-red-500 text-xs mt-1">{{ errors.phone }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">电子邮箱 <span class="text-red-500">*</span></label>
        <input v-model="form.email" type="email" required class="form-input" placeholder="请输入电子邮箱" />
        <p v-if="errors.email" class="text-red-500 text-xs mt-1">{{ errors.email }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">自我介绍 <span class="text-red-500">*</span></label>
        <textarea v-model="form.experience" required rows="4" class="form-input resize-y" placeholder="简单做一下自我介绍"></textarea>
        <p v-if="errors.experience" class="text-red-500 text-xs mt-1">{{ errors.experience }}</p>
      </div>
      <div>
        <label class="block text-sm font-medium mb-1 text-gray-700">加入期望</label>
        <textarea v-model="form.expectation" rows="3" class="form-input resize-y" placeholder="请简要描述您加入协会的期望（可选）"></textarea>
      </div>
      <button type="submit" :disabled="submitting" class="btn-solid w-full">
        <span v-if="submitting" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
        {{ submitting ? '提交中...' : '提交报名' }}
      </button>
    </form>

    <div v-if="showSuccess" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click="showSuccess = false">
      <div class="bg-white rounded-lg p-8 max-w-sm mx-4 text-center shadow-xl" @click.stop>
        <div class="w-14 h-14 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center text-2xl font-bold text-green-600">+</div>
        <h3 class="text-lg font-bold mb-2 text-gray-800">报名成功</h3>
        <p class="text-gray-500 text-sm">报名信息已提交，我们会尽快与您联系</p>
        <button @click="showSuccess = false" class="btn-solid mt-4">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { colleges, grades } from '@/data/siteData'

const form = reactive({ name: '', studentId: '', college: '', grade: '', phone: '', email: '', experience: '', expectation: '' })
const errors = reactive<Record<string, string>>({})
const submitting = ref(false)
const showSuccess = ref(false)

const validate = () => {
  const e: Record<string, string> = {}
  if (!form.name.trim()) e.name = '请输入姓名'
  if (!form.studentId.trim()) e.studentId = '请输入学号'
  if (!form.college) e.college = '请选择学院'
  if (!form.grade) e.grade = '请选择年级'
  if (!/^1[3-9]\d{9}$/.test(form.phone)) e.phone = '请输入有效的手机号码'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = '请输入有效的电子邮箱'
  if (!form.experience.trim() || form.experience.length < 10) e.experience = '自我介绍至少10个字符'
  Object.assign(errors, e)
  return Object.keys(e).length === 0
}

const handleSubmit = async () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!validate()) return
  submitting.value = true
  try {
    await fetch('/api/registration', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    showSuccess.value = true
    Object.assign(form, { name: '', studentId: '', college: '', grade: '', phone: '', email: '', experience: '', expectation: '' })
  } catch { alert('提交失败，请稍后再试') }
  finally { submitting.value = false }
}
</script>
