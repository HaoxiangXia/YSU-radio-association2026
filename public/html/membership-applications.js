
    const pageSize = 20;
    let currentPage = 1;
    let currentItems = [];
    let pagination = { current: 1, total: 0, count: 0 };
    let operationRecordItems = [];
    let operationRecordPagination = { current: 1, total: 0, count: 0 };
    let searchTimer;
    let latestLoadRequest = 0;

    function setFeedback(message = '', isError = false) {
      const feedback = document.getElementById('admin-feedback');
      feedback.textContent = message;
      feedback.classList.toggle('is-error', isError);
    }

    function createCell(value, label, className = '') {
      const cell = document.createElement('td');
      cell.dataset.label = label;
      cell.className = className;
      cell.textContent = value || '-';
      return cell;
    }

    function renderTable() {
      const body = document.getElementById('data-body');
      body.replaceChildren();
      document.getElementById('total-count').textContent = `共 ${pagination.count} 条`;
      if (!currentItems.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 8;
        cell.className = 'p-8 text-center text-gray-400';
        cell.textContent = '暂无符合条件的数据';
        row.appendChild(cell);
        body.appendChild(row);
        renderPagination();
        return;
      }

      currentItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.appendChild(createCell((currentPage - 1) * pageSize + index + 1, '编号', 'text-sm text-gray-400'));
        row.appendChild(createCell(item.name, '姓名', 'font-medium text-sm'));
        row.appendChild(createCell(item.studentId, '学号', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.college, '学院', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.grade, '年级', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.phone, '联系电话', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.email, '电子邮箱', 'text-sm text-gray-600'));

        const actionCell = document.createElement('td');
        actionCell.dataset.label = '操作';
        const actions = document.createElement('div');
        actions.className = 'action-group';
        const viewButton = document.createElement('button');
        viewButton.type = 'button';
        viewButton.className = 'action-btn view';
        viewButton.textContent = '详情';
        viewButton.addEventListener('click', () => viewDetail(item));
        const deleteButton = document.createElement('button');
        deleteButton.type = 'button';
        deleteButton.className = 'action-btn delete';
        deleteButton.textContent = '删除';
        deleteButton.addEventListener('click', () => deleteItem(item));
        actions.append(viewButton, deleteButton);
        actionCell.appendChild(actions);
        row.appendChild(actionCell);
        body.appendChild(row);
      });
      renderPagination();
    }

    function renderOperationRecords() {
      const body = document.getElementById('operation-records-body');
      body.replaceChildren();
      document.getElementById('operation-records-count').textContent = `共 ${operationRecordPagination.count} 条`;
      if (!operationRecordItems.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.className = 'p-8 text-center text-gray-400';
        cell.textContent = '暂无操作记录';
        row.appendChild(cell);
        body.appendChild(row);
        renderOperationRecordPagination();
        return;
      }

      operationRecordItems.forEach((item) => {
        const row = document.createElement('tr');
        row.appendChild(createCell(item.operation === 'delete' ? '删除入会申请' : item.operation, '操作', 'text-sm'));
        row.appendChild(createCell(item.membershipApplicationId, '申请 ID', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.applicationName, '姓名', 'font-medium text-sm'));
        row.appendChild(createCell(item.studentId, '学号', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.recruitmentOfficerId, '负责人', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.createdAt, '操作时间', 'text-sm text-gray-600'));
        body.appendChild(row);
      });
      renderOperationRecordPagination();
    }

    function renderOperationRecordPagination() {
      const container = document.getElementById('operation-records-pagination');
      container.replaceChildren();
      if (operationRecordPagination.total <= 1) return;
      const addButton = (label, page, disabled, active = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.classList.toggle('active', active);
        button.addEventListener('click', () => loadOperationRecords(page));
        container.appendChild(button);
      };
      const currentPage = operationRecordPagination.current;
      addButton('上一页', currentPage - 1, currentPage <= 1);
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(operationRecordPagination.total, currentPage + 2);
      for (let page = start; page <= end; page += 1) {
        addButton(String(page), page, false, page === currentPage);
      }
      addButton('下一页', currentPage + 1, currentPage >= operationRecordPagination.total);
    }

    function renderPagination() {
      const container = document.getElementById('pagination');
      container.replaceChildren();
      if (pagination.total <= 1) return;
      const addButton = (label, page, disabled, active = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.classList.toggle('active', active);
        button.addEventListener('click', () => loadData(page));
        container.appendChild(button);
      };
      addButton('上一页', currentPage - 1, currentPage <= 1);
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(pagination.total, currentPage + 2);
      for (let page = start; page <= end; page += 1) addButton(String(page), page, false, page === currentPage);
      addButton('下一页', currentPage + 1, currentPage >= pagination.total);
    }

    function readFilters() {
      return {
        search: document.getElementById('search-input').value.trim(),
        college: document.getElementById('college-filter').value,
        grade: document.getElementById('grade-filter').value,
      };
    }

    async function handleResponse(response) {
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/html/admin-login.html';
        throw new Error('登录已失效');
      }
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.detail || result.message || '请求失败');
      }
      return response;
    }

    function updateFilterOptions(id, label, values) {
      const select = document.getElementById(id);
      const selected = select.value;
      select.replaceChildren(new Option(label, ''));
      values.filter(Boolean).sort().forEach((value) => select.add(new Option(value, value)));
      select.value = selected;
    }

    const chartState = {
      trend: { chart: null, loaded: false },
      college: { chart: null, loaded: false },
    };
    let activeChart = 'trend';

    function formatDateKey(date) {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    function buildTrendSeries(items) {
      const counts = new Map();
      items.forEach((item) => {
        const created = new Date(item.createdAt);
        if (Number.isNaN(created.getTime())) return;
        const key = formatDateKey(created);
        counts.set(key, (counts.get(key) || 0) + 1);
      });
      const days = [];
      const today = new Date();
      for (let offset = 6; offset >= 0; offset -= 1) {
        const day = new Date(today);
        day.setUTCDate(day.getUTCDate() - offset);
        const key = formatDateKey(day);
        days.push({ key, count: counts.get(key) || 0 });
      }
      return days;
    }

    function setChartMeta(id, text) {
      const element = document.getElementById(id);
      if (element) element.textContent = text;
    }

    function renderTrendChart(days) {
      const canvas = document.getElementById('trend-chart');
      if (!canvas || typeof echarts === 'undefined') return;
      if (!chartState.trend.chart) chartState.trend.chart = echarts.init(canvas);
      chartState.trend.chart.setOption({
        grid: { left: 40, right: 24, top: 32, bottom: 32 },
        tooltip: { trigger: 'axis' },
        xAxis: {
          type: 'category',
          data: days.map((day) => day.key.slice(5)),
          axisLine: { lineStyle: { color: '#e5e7eb' } },
          axisLabel: { color: '#6b7280' },
        },
        yAxis: {
          type: 'value',
          minInterval: 1,
          axisLabel: { color: '#6b7280' },
          splitLine: { lineStyle: { color: '#f3f4f6' } },
        },
        series: [{
          name: '申请数量',
          type: 'line',
          data: days.map((day) => day.count),
          smooth: false,
          symbolSize: 6,
          lineStyle: { color: '#2563eb', width: 2 },
          itemStyle: { color: '#2563eb' },
          areaStyle: { color: 'rgba(37, 99, 235, 0.08)' },
        }],
      });
      chartState.trend.loaded = true;
    }

    function renderCollegeChart(stats) {
      const canvas = document.getElementById('college-chart');
      if (!canvas || typeof echarts === 'undefined') return;
      const rows = stats.collegeStats || [];
      const total = rows.reduce((sum, row) => sum + row.count, 0);
      setChartMeta('chart-college-meta', `共 ${stats.collegeCount} 个学院 · ${total} 份申请`);
      if (!chartState.college.chart) chartState.college.chart = echarts.init(canvas);
      chartState.college.chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}<br/>申请 {c} 份（{d}%）' },
        legend: { bottom: 0, textStyle: { color: '#6b7280' }, type: 'scroll' },
        series: [{
          name: '学院分布',
          type: 'pie',
          radius: ['44%', '70%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
          label: { color: '#374151' },
          data: rows.map((row) => ({ name: row._id, value: row.count })),
        }],
      });
      chartState.college.loaded = true;
    }

    function resizeCharts() {
      Object.values(chartState).forEach((entry) => {
        if (entry.chart) entry.chart.resize();
      });
    }

    function switchChart(name) {
      activeChart = name;
      document.querySelectorAll('.chart-tab').forEach((tab) => {
        const isActive = tab.dataset.chart === name;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.tabIndex = isActive ? 0 : -1;
      });
      document.querySelectorAll('.chart-view').forEach((view) => {
        const isActive = view.id === `chart-${name}`;
        view.classList.toggle('is-active', isActive);
        if (window.matchMedia('(max-width: 700px)').matches) {
          view.hidden = !isActive;
        } else {
          view.hidden = false;
        }
      });
      if (name === 'trend' && chartState.trend.chart) chartState.trend.chart.resize();
      if (name === 'college' && chartState.college.chart) chartState.college.chart.resize();
    }



    async function loadData(page = 1) {
      const requestId = ++latestLoadRequest;
      currentPage = page;
      setFeedback('正在加载入会申请…');
      const params = new URLSearchParams({ ...readFilters(), page: String(page), limit: String(pageSize) });
      try {
        const response = await handleResponse(await fetch(`/api/membership-applications?${params}`));
        const data = await response.json();
        if (requestId !== latestLoadRequest) return false;
        currentItems = data.membership_applications || [];
        pagination = data.pagination || { current: 1, total: 0, count: 0 };
        currentPage = pagination.current || page;
        if (pagination.total > 0 && currentPage > pagination.total) {
          return loadData(pagination.total);
        }
        renderTable();
        setFeedback(currentItems.length ? '' : '当前没有符合条件的入会申请。');
        return true;
      } catch (error) {
        if (requestId !== latestLoadRequest) return false;
        currentItems = [];
        pagination = { current: 1, total: 0, count: 0 };
        renderTable();
        setFeedback(error.message || '加载失败，请稍后重试。', true);
        return false;
      }
    }


    async function loadSupportData() {
      try {
        const response = await handleResponse(await fetch('/api/membership-applications/stats'));
        const stats = await response.json();
        const days = buildTrendSeries(await loadAllApplicationsForTrend());
        renderTrendChart(days);
        renderCollegeChart(stats);
        const trendTotal = days.reduce((sum, day) => sum + day.count, 0);
        setChartMeta('chart-trend-meta', `近七日共 ${trendTotal} 份`);
        updateFilterOptions('college-filter', '所有学院', (stats.collegeStats || []).map((row) => row._id));
        updateFilterOptions('grade-filter', '所有年级', (stats.gradeStats || []).map((row) => row._id));
      } catch (error) {
        setChartMeta('chart-trend-meta', '统计加载失败');
        setChartMeta('chart-college-meta', '统计加载失败');
        document.getElementById('college-filter').title = '筛选项暂时无法更新';
        document.getElementById('grade-filter').title = '筛选项暂时无法更新';
      }
    }

    async function loadAllApplicationsForTrend() {
      try {
        const response = await handleResponse(await fetch('/api/membership-applications?limit=1000'));
        const data = await response.json();
        return data.membership_applications || [];
      } catch (error) {
        return [];
      }
    }

    async function loadOperationRecords(page = 1) {
      const feedback = document.getElementById('operation-records-feedback');
      feedback.textContent = '正在加载操作记录…';
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
        const response = await handleResponse(await fetch(`/api/membership-applications/operation-records?${params}`));
        const data = await response.json();
        operationRecordItems = data.operation_records || [];
        operationRecordPagination = data.pagination || { current: 1, total: 0, count: 0 };
        renderOperationRecords();
        feedback.classList.remove('is-error');
        feedback.textContent = operationRecordItems.length ? '' : '暂无操作记录。';
        return true;
      } catch (error) {
        operationRecordItems = [];
        operationRecordPagination = { current: 1, total: 0, count: 0 };
        renderOperationRecords();
        feedback.textContent = error.message || '操作记录加载失败，请稍后重试。';
        feedback.classList.add('is-error');
        return false;
      }
    }

    function viewDetail(item) {
      const labels = { name: '姓名', studentId: '学号', college: '学院', grade: '年级', phone: '联系电话', email: '电子邮箱', self_introduction: '自我介绍', expectation: '加入期望', createdAt: '提交时间' };
      const content = document.getElementById('detail-content');
      content.replaceChildren();
      Object.entries(labels).forEach(([key, label]) => {
        const labelElement = document.createElement('div');
        labelElement.className = 'detail-label';
        labelElement.textContent = label;
        const valueElement = document.createElement('div');
        valueElement.className = 'detail-value';
        valueElement.textContent = item[key] || '-';
        content.append(labelElement, valueElement);
      });
      document.getElementById('detail-modal').classList.add('open');
    }

    function closeDetail() {
      document.getElementById('detail-modal').classList.remove('open');
    }

    async function deleteItem(item) {
      if (!confirm(`确定删除 ${item.name} 的入会申请？此操作不能撤销。`)) return;
      setFeedback('正在删除…');
      try {
        const response = await handleResponse(await fetch(`/api/membership-applications/${item.id}`, { method: 'DELETE' }));
        const result = await response.json();
        await Promise.all([loadData(currentPage), loadSupportData(), loadOperationRecords()]);
        setFeedback(result.message || '已删除。');
      } catch (error) {
        setFeedback(error.message || '删除失败，请稍后重试。', true);
      }
    }

    async function exportCsv() {
      const exportButton = document.getElementById('export-button');
      setFeedback('正在生成 CSV…');
      exportButton.disabled = true;
      try {
        const params = new URLSearchParams(readFilters());
        const response = await handleResponse(await fetch(
          `/api/membership-applications/export.csv?${params}`,
        ));
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const disposition = response.headers.get('Content-Disposition') || '';
        const filenameMatch = disposition.match(/filename="([^"]+)"/);
        link.download = filenameMatch?.[1] || 'membership-applications.csv';
        link.click();
        URL.revokeObjectURL(link.href);
        const count = response.headers.get('X-Export-Count');
        setFeedback(count === null ? 'CSV 已生成。' : `CSV 已生成，共 ${count} 条。`);
      } catch (error) {
        setFeedback(error.message || '导出失败，请稍后重试。', true);
      } finally {
        exportButton.disabled = false;
      }
    }

    document.addEventListener('DOMContentLoaded', async () => {
      try {
        const session = await fetch('/api/recruitment-officers/verify');
        if (!session.ok) {
          window.location.href = '/html/admin-login.html';
          return;
        }
      } catch (error) {
        window.location.href = '/html/admin-login.html';
        return;
      }
      document.getElementById('refresh-button').addEventListener('click', () => Promise.all([loadData(1), loadSupportData(), loadOperationRecords(1)]));
      document.getElementById('export-button').addEventListener('click', exportCsv);
      document.getElementById('detail-close-button').addEventListener('click', closeDetail);

      document.querySelectorAll('.chart-tab').forEach((tab) => {
        tab.addEventListener('click', () => switchChart(tab.dataset.chart));
        tab.addEventListener('keydown', (event) => {
          const tabs = ['trend', 'college'];
          const index = tabs.indexOf(tab.dataset.chart);
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
            switchChart(next);
            document.getElementById(`chart-tab-${next}`).focus();
          }
        });
      });
      const viewportMode = window.matchMedia('(max-width: 700px)');
      const applyViewportMode = () => switchChart(activeChart);
      if (viewportMode.addEventListener) {
        viewportMode.addEventListener('change', applyViewportMode);
      }
      applyViewportMode();


      document.getElementById('detail-modal').addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeDetail();
      });
      document.getElementById('logout-button').addEventListener('click', async () => {
        // 服务端吊销会话后跳转；请求失败也照常跳回登录页
        try {
          await fetch('/api/recruitment-officers/logout', { method: 'POST' });
        } catch (error) {}
        window.location.href = '/html/admin-login.html';
      });
      document.getElementById('search-input').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadData(1), 250);
      });
      ['college-filter', 'grade-filter'].forEach((id) => document.getElementById(id).addEventListener('change', () => loadData(1)));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDetail(); });
      await Promise.all([loadData(), loadSupportData(), loadOperationRecords()]);
    });
  