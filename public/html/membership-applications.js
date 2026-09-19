
    const pageSize = 20;
    let currentPage = 1;
    let currentItems = [];
    let pagination = { current: 1, total: 0, count: 0 };
    let operationRecordItems = [];
    let operationRecordPagination = { current: 1, total: 0, count: 0 };
    let searchTimer;
    let latestLoadRequest = 0;

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
        row.appendChild(createCell(pagination.count - (currentPage - 1) * pageSize - index, '编号', 'text-sm text-gray-400'));
        row.appendChild(createCell(item.name, '姓名', 'font-medium text-sm'));
        row.appendChild(createCell(item.studentId, '学号', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.college, '学院', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.grade, '年级', 'text-sm text-gray-600'));

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
        cell.colSpan = 5;
        cell.className = 'p-8 text-center text-gray-400';
        cell.textContent = '暂无操作记录';
        row.appendChild(cell);
        body.appendChild(row);
        renderOperationRecordPagination();
        return;
      }

      operationRecordItems.forEach((item) => {
        const row = document.createElement('tr');
        row.appendChild(createCell(item.operation === 'delete' ? '删除入会申请' : item.operation, '操作类型', 'text-sm'));
        row.appendChild(createCell(item.membershipApplicationId, '申请 ID', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.applicationName, '姓名', 'font-medium text-sm'));
        row.appendChild(createCell(item.studentId, '学号', 'text-sm text-gray-600'));
        row.appendChild(createCell(item.createdAt, '操作时间', 'text-sm text-gray-600'));
        body.appendChild(row);
      });
      renderOperationRecordPagination();
    }

    function renderPaginationInto(container, pageInfo, onPage) {
      container.replaceChildren();
      if (pageInfo.total <= 1) return;

      const currentPage = pageInfo.current;
      const isMobile = window.matchMedia('(max-width: 700px)').matches;

      const addButton = (label, page, disabled, active = false) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = label;
        button.disabled = disabled;
        button.classList.toggle('active', active);
        button.addEventListener('click', () => onPage(page));
        container.appendChild(button);
      };

      const addBreak = () => {
        if (!isMobile) return;
        const br = document.createElement('span');
        br.className = 'pagination-break';
        container.appendChild(br);
      };

      if (isMobile) {
        addButton('上一页', currentPage - 1, currentPage <= 1);
        const start = Math.max(1, currentPage - 1);
        const end = Math.min(pageInfo.total, currentPage + 1);
        for (let page = start; page <= end; page += 1) {
          addButton(String(page), page, false, page === currentPage);
        }
        addButton('下一页', currentPage + 1, currentPage >= pageInfo.total);

        addBreak();

        addButton('首页', 1, currentPage <= 1);
        addButton('尾页', pageInfo.total, currentPage >= pageInfo.total);
      } else {
        addButton('首页', 1, currentPage <= 1);
        addButton('上一页', currentPage - 1, currentPage <= 1);
        const start = Math.max(1, currentPage - 1);
        const end = Math.min(pageInfo.total, currentPage + 1);
        for (let page = start; page <= end; page += 1) {
          addButton(String(page), page, false, page === currentPage);
        }
        addButton('下一页', currentPage + 1, currentPage >= pageInfo.total);
        addButton('尾页', pageInfo.total, currentPage >= pageInfo.total);
      }

      const jumper = document.createElement('span');
      jumper.className = 'pagination-jumper';
      const input = document.createElement('input');
      input.type = 'number';
      input.min = 1;
      input.max = pageInfo.total;
      input.placeholder = '页码';
      input.setAttribute('aria-label', '跳转到页码');
      const goButton = document.createElement('button');
      goButton.type = 'button';
      goButton.textContent = '跳转';
      const jump = () => {
        const page = parseInt(input.value, 10);
        if (page >= 1 && page <= pageInfo.total && page !== currentPage) {
          onPage(page);
        }
        input.value = '';
      };
      goButton.addEventListener('click', jump);
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') jump();
      });
      jumper.appendChild(input);
      jumper.appendChild(goButton);
      container.appendChild(jumper);
    }

    function renderPagination() {
      renderPaginationInto(document.getElementById('pagination'), pagination, loadData);
    }

    function renderOperationRecordPagination() {
      renderPaginationInto(document.getElementById('operation-records-pagination'), operationRecordPagination, loadOperationRecords);
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
        tooltip: { trigger: 'axis', confine: true },
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

      const isMobile = window.matchMedia('(max-width: 700px)').matches;
      const tooltip = { trigger: 'item', formatter: '{b}<br/>申请 {c} 份（{d}%）', confine: true };
      const data = rows.map((row) => ({ name: row._id, value: row.count }));

      const option = isMobile
        ? {
            tooltip,
            series: [{
              name: '学院分布',
              type: 'pie',
              radius: ['28%', '44%'],
              center: ['50%', '50%'],
              minAngle: 12,
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
              label: {
                show: true,
                formatter: '{b}',
                color: '#374151',
                fontSize: 10,
                overflow: 'breakAll',
                width: 100,
                alignTo: 'edge',
                edgeDistance: 4,
                bleedMargin: 0,
              },
              labelLine: { show: true, length: 8, length2: 4, minTurnAngle: 90 },
              data,
            }],
          }
        : {
            tooltip,
            legend: { orient: 'vertical', right: 0, top: 'middle', textStyle: { color: '#6b7280' } },
            series: [{
              name: '学院分布',
              type: 'pie',
              radius: ['44%', '70%'],
              center: ['38%', '50%'],
              avoidLabelOverlap: true,
              itemStyle: { borderRadius: 4, borderColor: '#ffffff', borderWidth: 2 },
              label: { show: false },
              data,
            }],
          };

      chartState.college.chart.setOption(option, true);
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
    function switchTable(name) {
      document.querySelectorAll('.table-tab').forEach((tab) => {
        const isActive = tab.dataset.table === name;
        tab.classList.toggle('is-active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        tab.tabIndex = isActive ? 0 : -1;
      });
      document.querySelectorAll('.table-view').forEach((view) => {
        const isActive = view.id === `table-${name}`;
        view.classList.toggle('is-active', isActive);
        if (window.matchMedia('(max-width: 700px)').matches) {
          view.hidden = !isActive;
        } else {
          view.hidden = false;
        }
      });
    }


    async function loadData(page = 1) {
      const requestId = ++latestLoadRequest;
      currentPage = page;
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
        return true;
      } catch (error) {
        if (requestId !== latestLoadRequest) return false;
        currentItems = [];
        pagination = { current: 1, total: 0, count: 0 };
        renderTable();
        return false;
      }
    }


    async function loadSupportData() {
      try {
        const filters = readFilters();
        const params = new URLSearchParams({
          college: filters.college,
          grade: filters.grade,
          search: filters.search,
        });
        const [statsResponse, trendResponse] = await Promise.all([
          handleResponse(await fetch(`/api/membership-applications/stats?${params}`)),
          handleResponse(await fetch(`/api/membership-applications?limit=1000&${params}`)),
        ]);
        const stats = await statsResponse.json();
        const trendData = await trendResponse.json();
        const days = buildTrendSeries(trendData.membership_applications || []);
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

    function createSpecRow(label, value, isMono = false, linkHref = null) {
      const row = document.createElement('div');
      row.className = 'drawer-spec-row';
      const labelEl = document.createElement('span');
      labelEl.className = 'drawer-spec-label';
      labelEl.textContent = label;
      row.appendChild(labelEl);

      if (linkHref && value) {
        const link = document.createElement('a');
        link.className = 'drawer-link';
        link.href = linkHref;
        link.textContent = value;
        row.appendChild(link);
      } else {
        const valEl = document.createElement('span');
        valEl.className = `drawer-spec-val${isMono ? ' drawer-spec-val--mono' : ''}`;
        valEl.textContent = value || '-';
        row.appendChild(valEl);
      }
      return row;
    }

    function viewDetail(item) {
      const content = document.getElementById('detail-content');
      content.replaceChildren();

      const dossier = document.createElement('div');
      dossier.className = 'drawer-dossier';

      // 1. 姓名与年级身份
      const identityRow = document.createElement('div');
      identityRow.className = 'drawer-identity';
      const nameEl = document.createElement('span');
      nameEl.className = 'drawer-applicant-name';
      nameEl.textContent = item.name || '-';
      identityRow.appendChild(nameEl);

      if (item.grade) {
        const gradeBadge = document.createElement('span');
        gradeBadge.className = 'drawer-badge-grade';
        gradeBadge.textContent = item.grade;
        identityRow.appendChild(gradeBadge);
      }
      dossier.appendChild(identityRow);

      // 分割线
      const divider1 = document.createElement('div');
      divider1.className = 'drawer-divider';
      dossier.appendChild(divider1);

      // 2. 档案规格信息列表
      const specList = document.createElement('div');
      specList.className = 'drawer-spec-list';
      specList.appendChild(createSpecRow('学号', item.studentId, true));
      specList.appendChild(createSpecRow('录取学院', item.college));

      // 手机号 3-4-4 格式化展示
      let formattedPhone = item.phone || '';
      if (/^\d{11}$/.test(formattedPhone)) {
        formattedPhone = `${formattedPhone.slice(0, 3)} ${formattedPhone.slice(3, 7)} ${formattedPhone.slice(7)}`;
      }
      specList.appendChild(createSpecRow('手机号码', formattedPhone, false, item.phone ? `tel:${item.phone}` : null));
      specList.appendChild(createSpecRow('电子邮箱', item.email, false, item.email ? `mailto:${item.email}` : null));
      dossier.appendChild(specList);

      // 分割线
      const divider2 = document.createElement('div');
      divider2.className = 'drawer-divider';
      dossier.appendChild(divider2);

      // 3. 自我介绍
      const introSection = document.createElement('div');
      introSection.className = 'drawer-section';
      const introLabel = document.createElement('div');
      introLabel.className = 'drawer-section-label';
      introLabel.textContent = '自我介绍';
      const introBody = document.createElement('p');
      introBody.className = 'drawer-prose-body';
      introBody.textContent = item.self_introduction || '暂无自我介绍。';
      introSection.append(introLabel, introBody);
      dossier.appendChild(introSection);

      // 4. 加入期望
      const expectSection = document.createElement('div');
      expectSection.className = 'drawer-section';
      const expectLabel = document.createElement('div');
      expectLabel.className = 'drawer-section-label';
      expectLabel.textContent = '加入期望';
      const expectBody = document.createElement('p');
      expectBody.className = 'drawer-prose-body';
      expectBody.textContent = item.expectation || '暂无加入期望。';
      expectSection.append(expectLabel, expectBody);
      dossier.appendChild(expectSection);

      // 5. 提交时间
      if (item.createdAt) {
        const metaBar = document.createElement('div');
        metaBar.className = 'drawer-meta-bar';
        metaBar.textContent = `申请提交于 ${item.createdAt}`;
        dossier.appendChild(metaBar);
      }

      content.appendChild(dossier);
      document.getElementById('detail-modal').classList.add('open');
    }

    function closeDetail() {
      document.getElementById('detail-modal').classList.remove('open');
    }

    async function deleteItem(item) {
      if (!confirm(`确定删除 ${item.name} 的入会申请？此操作不能撤销。`)) return;
      try {
        const response = await handleResponse(await fetch(`/api/membership-applications/${item.id}`, { method: 'DELETE' }));
        const result = await response.json();
        await Promise.all([loadData(currentPage), loadSupportData(), loadOperationRecords()]);
      } catch (error) {
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
      document.querySelectorAll('.table-tab').forEach((tab) => {
        tab.addEventListener('click', () => switchTable(tab.dataset.table));
        tab.addEventListener('keydown', (event) => {
          const tables = ['applications', 'operations'];
          const index = tables.indexOf(tab.dataset.table);
          if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
            event.preventDefault();
            const next = tables[(index + (event.key === 'ArrowRight' ? 1 : tables.length - 1)) % tables.length];
            switchTable(next);
            document.getElementById(`table-tab-${next}`).focus();
          }
        });
      });

      const viewportMode = window.matchMedia('(max-width: 700px)');
      const applyViewportMode = () => { switchChart(activeChart); switchTable('applications'); };
      if (viewportMode.addEventListener) {
        viewportMode.addEventListener('change', applyViewportMode);
      }
      applyViewportMode();
      // 全端抽屉模式下不通过点击背景空白收起，仅允许显式点击关闭按钮或按 Esc 键收起
      document.getElementById('logout-button').addEventListener('click', async () => {
        // 服务端吊销会话后跳转；请求失败也照常跳回登录页
        try {
          await fetch('/api/recruitment-officers/logout', { method: 'POST' });
        } catch (error) {}
        window.location.href = '/html/admin-login.html';
      });
      document.getElementById('search-input').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => Promise.all([loadData(1), loadSupportData()]), 250);
      });
      ['college-filter', 'grade-filter'].forEach((id) => document.getElementById(id).addEventListener('change', () => Promise.all([loadData(1), loadSupportData()])));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDetail(); });
      await Promise.all([loadData(), loadSupportData(), loadOperationRecords()]);
    });
  