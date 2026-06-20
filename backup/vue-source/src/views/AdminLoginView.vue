<template>
  <div class="min-h-[60vh] flex items-center justify-center px-4 py-12">
    <div class="card w-full max-w-md overflow-hidden p-0">
      <div class="text-center py-6 bg-gradient-to-r from-blue-600 to-blue-500">
        <h2 class="text-lg font-bold text-white">管理员登录</h2>
        <p class="text-white/70 text-sm">无线电爱好者协会</p>
      </div>

      <form @submit.prevent="handleLogin" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">用户名 <span class="text-red-500">*</span></label>
          <input v-model="form.username" type="text" required autocomplete="username" class="form-input" placeholder="请输入用户名" />
          <p v-if="errors.username" class="text-red-500 text-xs mt-1">{{ errors.username }}</p>
        </div>
        <div>
          <label class="block text-sm font-medium mb-1 text-gray-700">密码 <span class="text-red-500">*</span></label>
          <input v-model="form.password" type="password" required autocomplete="current-password" class="form-input" placeholder="请输入密码" />
          <p v-if="errors.password" class="text-red-500 text-xs mt-1">{{ errors.password }}</p>
        </div>
        <div class="flex items-center gap-2">
          <input v-model="form.remember" type="checkbox" id="remember" class="w-4 h-4 accent-blue-600" />
          <label for="remember" class="text-sm text-gray-600 cursor-pointer">记住我</label>
        </div>
        <button type="submit" :disabled="loading" class="btn-solid w-full">
          <span v-if="loading" class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <p v-if="errors.login" class="text-red-500 text-sm text-center">{{ errors.login }}</p>
        <p v-if="success" class="text-green-600 text-sm text-center">{{ success }}</p>
        <div class="text-center pt-2">
          <RouterLink to="/" class="text-sm text-blue-600 hover:underline">返回首页</RouterLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const form = reactive({ username: '', password: '', remember: false })
const errors = reactive<Record<string, string>>({})
const loading = ref(false)
const success = ref('')

const handleLogin = async () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.username.trim()) { errors.username = '请输入用户名'; return }
  if (!form.password.trim()) { errors.password = '请输入密码'; return }
  loading.value = true
  try {
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.username, password: form.password, remember: form.remember }),
    })
    const data = await res.json()
    if (res.ok) {
      success.value = '登录成功，正在跳转...'
      if (form.remember) localStorage.setItem('adminToken', data.token)
      else sessionStorage.setItem('adminToken', data.token)
      setTimeout(() => router.push('/registration-info'), 1500)
    } else {
      errors.login = data.message || '登录失败'
    }
  } catch { errors.login = '网络错误' }
  finally { loading.value = false }
}

onMounted(() => {
  const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
  if (token) {
    fetch('/api/admin/verify', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.ok) router.push('/registration-info') })
      .catch(() => {})
  }
})
</script>
