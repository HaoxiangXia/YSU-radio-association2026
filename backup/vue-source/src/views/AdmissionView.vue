<template>
  <div class="page-container max-w-lg">
    <div class="card text-center">
      <div class="mb-6">
        <h2 class="text-xl font-bold text-gray-800 mb-2">录取结果查询</h2>
        <p class="text-gray-500 text-sm">本届录取名单已经发布。请输入报名时填写的学号进行查询。</p>
      </div>

      <div class="grid grid-cols-2 gap-3 mb-6">
        <div class="card p-3"><div class="text-xl font-bold text-blue-600">{{ totalAdmitted }}</div><div class="text-xs text-gray-500">本次录取人数</div></div>
        <div class="card p-3"><div class="text-xl font-bold text-blue-600">{{ lastUpdated }}</div><div class="text-xs text-gray-500">数据更新时间</div></div>
      </div>

      <form @submit.prevent="handleQuery" class="mb-4">
        <label class="block text-sm font-medium text-left mb-1 text-gray-700">学号</label>
        <div class="flex gap-2">
          <input v-model="studentId" type="text" maxlength="12" placeholder="请输入12位学号" class="form-input flex-1" required />
          <button type="submit" class="btn-solid whitespace-nowrap">查询</button>
        </div>
      </form>

      <div v-if="msg.show" class="p-3 rounded-lg text-left flex items-start gap-3 mb-4" :class="msgClass">
        <span class="text-lg shrink-0 mt-0.5 font-bold">{{ msg.icon }}</span>
        <div><strong class="block mb-0.5 text-sm">{{ msg.title }}</strong><p class="text-sm text-gray-600 whitespace-pre-line">{{ msg.text }}</p></div>
      </div>

      <div v-if="history.length" class="mt-6 pt-4 border-t border-gray-100">
        <h3 class="text-sm font-medium mb-2 text-left text-gray-600">历史查询</h3>
        <div class="space-y-1">
          <div v-for="(h, i) in history" :key="i" class="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
            <span class="font-medium text-gray-700">{{ h.name }}</span>
            <span class="text-gray-400 font-mono text-xs">{{ h.id }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showOverlay" class="fixed inset-0 bg-black z-[9999] flex items-center justify-center" @click="showOverlay = false">
      <div class="text-2xl font-extrabold tracking-wider text-center text-white">{{ overlayText }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const studentId = ref('')
const totalAdmitted = ref('--')
const lastUpdated = ref('--')
const admissionsMap = ref(new Map())
const history = ref<{ name: string; id: string }[]>([])
const msg = ref({ show: false, type: 'info' as 'success' | 'error' | 'info', icon: '', title: '', text: '' })
const showOverlay = ref(false)
const overlayText = ref('')

const msgClass = computed(() => ({
  'bg-green-50 border border-green-200': msg.value.type === 'success',
  'bg-red-50 border border-red-200': msg.value.type === 'error',
  'bg-blue-50 border border-blue-200': msg.value.type === 'info',
}))

const showMsg = (type: 'success' | 'error' | 'info', icon: string, title: string, text: string) => {
  msg.value = { show: true, type, icon, title, text }
}

const getYearPrefix = (id: string) => {
  if (!id || id.length < 2) return NaN
  if (id.startsWith('20') && id.length >= 4) return parseInt(id.slice(2, 4), 10)
  return parseInt(id.slice(0, 2), 10)
}

const handleQuery = () => {
  const id = studentId.value.replace(/\s+/g, '').replace(/[^0-9]/g, '')
  if (!id) { showMsg('error', '!', '学号不能为空', '请填写你的学号后再次尝试。'); return }
  if (!/^[0-9]{12}$/.test(id)) { showMsg('error', '!', '学号格式不正确', '请确认学号为12位数字。'); return }

  const yp = getYearPrefix(id)
  if (!isNaN(yp)) {
    if (yp <= 23) { overlayText.value = '老登干什么呢'; showOverlay.value = true; return }
    if (yp >= 26) { overlayText.value = '有点意思'; showOverlay.value = true; return }
  }

  if (admissionsMap.value.size === 0) { showMsg('error', '!', '名单尚未就绪', '录取名单尚未加载完成，请稍候再试。'); return }

  const admission = admissionsMap.value.get(id)
  if (admission) {
    const name = admission.name || '录取同学'
    showMsg('success', 'OK', `恭喜 ${name} 录取成功！`, `学号 ${id} 已确认录取。\n请关注协会通知安排后续事项。\n请添加Q群 1064208698，进群验证：1988`)
    history.value.unshift({ name, id })
    if (history.value.length > 5) history.value.pop()
  } else {
    showMsg('error', 'X', '未查询到', `学号 ${id} 暂未出现在录取名单中。\n如有疑问，请联系协会负责人核实。`)
  }
}

onMounted(async () => {
  try {
    const res = await fetch('data/admissions.json', { cache: 'no-store' })
    if (!res.ok) throw new Error()
    const data = await res.json()
    data.forEach((item: any) => {
      const id = String(item.studentId).trim()
      if (!admissionsMap.value.has(id)) admissionsMap.value.set(id, { name: item.name?.trim() || '', raw: item })
    })
    totalAdmitted.value = String(admissionsMap.value.size)
    lastUpdated.value = new Date().toISOString().slice(0, 10)
    showMsg('info', 'i', '名单已加载', '请输入学号查询录取结果。')
  } catch {
    showMsg('info', 'i', '提示', '请输入学号查询录取结果。')
  }
})
</script>
