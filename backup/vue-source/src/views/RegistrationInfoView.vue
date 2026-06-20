<template>
  <div class="page-container max-w-6xl">
    <h1 class="section-title">报名信息管理</h1>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <div v-for="(stat, i) in statsCards" :key="i" class="card text-center p-4 border-t-4 border-blue-600">
        <div class="text-xl font-bold text-blue-600">{{ stat.value }}</div>
        <div class="text-xs text-gray-500">{{ stat.label }}</div>
      </div>
    </div>

    <div class="card mb-6 flex flex-wrap gap-3 items-center p-4">
      <input v-model="searchQuery" type="text" placeholder="搜索姓名、学号、学院..." class="form-input flex-1 min-w-[200px]" />
      <select v-model="collegeFilter" class="form-input min-w-[140px]">
        <option value="">所有学院</option>
        <option v-for="c in filterOptions.colleges" :key="c" :value="c">{{ c }}</option>
      </select>
      <select v-model="gradeFilter" class="form-input min-w-[140px]">
        <option value="">所有年级</option>
        <option v-for="g in filterOptions.grades" :key="g" :value="g">{{ g }}</option>
      </select>
      <button @click="loadData" class="btn-solid text-sm py-2 px-3">刷新</button>
      <button @click="exportExcel" class="btn-solid text-sm py-2 px-3">导出</button>
    </div>

    <div class="card overflow-hidden p-0">
      <div class="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <span class="font-semibold text-sm text-gray-700">报名信息列表</span>
        <span class="text-sm text-gray-400">共 {{ filteredData.length }} 条</span>
      </div>
      <div class="overflow-x-auto">
        <table class="w-full data-table">
          <thead><tr><th>#</th><th>姓名</th><th>学号</th><th>学院</th><th>年级</th><th>联系电话</th><th>电子邮箱</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="(item, i) in paginatedData" :key="item.studentId" class="hover:bg-gray-50">
              <td class="text-sm text-gray-400 font-mono">{{ (currentPage - 1) * pageSize + i + 1 }}</td>
              <td class="font-medium text-sm">{{ item.name }}</td>
              <td class="text-sm font-mono text-gray-600">{{ item.studentId }}</td>
              <td class="text-sm text-gray-600">{{ item.college }}</td>
              <td class="text-sm text-gray-600">{{ item.grade }}</td>
              <td class="text-sm font-mono text-gray-600">{{ item.phone }}</td>
              <td class="text-sm text-gray-600">{{ item.email }}</td>
              <td>
                <div class="flex gap-1">
                  <button @click="viewDetail(item)" class="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100">详情</button>
                  <button @click="deleteItem(item)" class="px-2 py-1 bg-red-50 text-red-500 rounded text-xs hover:bg-red-100">删除</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredData.length === 0"><td colspan="8" class="p-8 text-center text-gray-400">暂无数据</td></tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="p-4 border-t border-gray-100 flex justify-center gap-1">
        <button @click="currentPage--" :disabled="currentPage === 1" class="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50">上一页</button>
        <button v-for="p in visiblePages" :key="p" @click="currentPage = p" class="px-3 py-1 border rounded text-sm transition-colors" :class="p === currentPage ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 hover:bg-gray-50'">{{ p }}</button>
        <button @click="currentPage++" :disabled="currentPage === totalPages" class="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-30 hover:bg-gray-50">下一页</button>
      </div>
    </div>

    <div v-if="showDetail" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" @click="showDetail = false">
      <div class="bg-white rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-xl" @click.stop>
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-semibold text-blue-600">报名详情</h3>
          <button @click="showDetail = false" class="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        <div class="p-4 space-y-3" v-if="detailItem">
          <div v-for="(label, key) in detailLabels" :key="key">
            <div class="text-xs text-gray-400 mb-0.5">{{ label }}</div>
            <div class="p-2 bg-gray-50 rounded text-sm text-gray-700">{{ (detailItem as any)[key] || '-' }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

interface Registration {
  name: string; studentId: string; college: string; grade: string;
  phone: string; email: string; experience?: string; expectation?: string; createdAt?: string;
}

const router = useRouter()
const allData = ref<Registration[]>([])
const searchQuery = ref('')
const collegeFilter = ref('')
const gradeFilter = ref('')
const currentPage = ref(1)
const pageSize = 10
const showDetail = ref(false)
const detailItem = ref<Registration | null>(null)
const statsCards = ref([{ label: '总报名', value: '-' }, { label: '今日新增', value: '-' }, { label: '涉及学院', value: '-' }, { label: '涉及年级', value: '-' }])
const filterOptions = ref({ colleges: [] as string[], grades: [] as string[] })

const detailLabels: Record<string, string> = {
  name: '姓名', studentId: '学号', college: '学院', grade: '年级',
  phone: '联系电话', email: '电子邮箱', experience: '自我介绍', expectation: '加入期望',
}

const getAuthHeaders = () => {
  const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

const loadData = async () => {
  try {
    const res = await fetch('/api/registration?limit=1000', { headers: getAuthHeaders() })
    if (res.status === 401) { router.push('/admin-login'); return }
    const data = await res.json()
    allData.value = data.registrations || data
    currentPage.value = 1
    updateFilters()
    updateStats()
  } catch {
    allData.value = []
  }
}

const updateFilters = () => {
  filterOptions.value = {
    colleges: [...new Set(allData.value.map(d => d.college))].sort(),
    grades: [...new Set(allData.value.map(d => d.grade))].sort(),
  }
}

const updateStats = () => {
  const today = new Date().toISOString().slice(0, 10)
  statsCards.value = [
    { label: '总报名', value: String(allData.value.length) },
    { label: '今日新增', value: String(allData.value.filter(d => d.createdAt?.startsWith(today)).length) },
    { label: '涉及学院', value: String(new Set(allData.value.map(d => d.college)).size) },
    { label: '涉及年级', value: String(new Set(allData.value.map(d => d.grade)).size) },
  ]
}

const filteredData = computed(() => {
  const q = searchQuery.value.toLowerCase()
  return allData.value.filter(d => {
    const ms = !q || d.name.toLowerCase().includes(q) || d.studentId.includes(q) || d.college.toLowerCase().includes(q)
    return ms && (!collegeFilter.value || d.college === collegeFilter.value) && (!gradeFilter.value || d.grade === gradeFilter.value)
  })
})

const totalPages = computed(() => Math.ceil(filteredData.value.length / pageSize) || 1)
const paginatedData = computed(() => filteredData.value.slice((currentPage.value - 1) * pageSize, currentPage.value * pageSize))

const visiblePages = computed(() => {
  const pages: number[] = []
  const s = Math.max(1, currentPage.value - 2)
  const e = Math.min(totalPages.value, currentPage.value + 2)
  for (let i = s; i <= e; i++) pages.push(i)
  return pages
})

const viewDetail = (item: Registration) => { detailItem.value = item; showDetail.value = true }

const deleteItem = async (item: Registration) => {
  if (!confirm(`确定删除 ${item.name} 的报名信息？`)) return
  try { await fetch(`/api/registration/${item.studentId}`, { method: 'DELETE', headers: getAuthHeaders() }); loadData() }
  catch { alert('删除失败') }
}

const exportExcel = () => {
  const headers = ['姓名', '学号', '学院', '年级', '联系电话', '电子邮箱']
  const rows = filteredData.value.map(d => [d.name, d.studentId, d.college, d.grade, d.phone, d.email])
  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = '报名信息.csv'
  link.click()
}

watch([searchQuery, collegeFilter, gradeFilter], () => { currentPage.value = 1 })

onMounted(() => {
  const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken')
  if (!token) { router.push('/admin-login'); return }
  loadData()
})
</script>
