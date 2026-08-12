
    const pageSize = 20;
    let currentPage = 1;
    let currentItems = [];
    let pagination = { current: 1, total: 0, count: 0 };
    let searchTimer;
    let latestLoadRequest = 0;

    function getToken() {
      return localStorage.getItem('recruitment_officer_token') || sessionStorage.getItem('recruitment_officer_token');
    }

    function getAuthHeaders() {
      return { Authorization: `Bearer ${getToken()}` };
    }

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
        localStorage.removeItem('recruitment_officer_token');
        sessionStorage.removeItem('recruitment_officer_token');
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

    async function loadSupportData() {
      try {
        const response = await handleResponse(await fetch('/api/membership-applications/stats', { headers: getAuthHeaders() }));
        const stats = await response.json();
        document.getElementById('stat-total').textContent = stats.total;
        document.getElementById('stat-today').textContent = stats.todayCount;
        document.getElementById('stat-colleges').textContent = stats.collegeCount;
        document.getElementById('stat-grades').textContent = stats.gradeCount;
        updateFilterOptions('college-filter', '所有学院', (stats.collegeStats || []).map((row) => row._id));
        updateFilterOptions('grade-filter', '所有年级', (stats.gradeStats || []).map((row) => row._id));
      } catch (error) {
        ['stat-total', 'stat-today', 'stat-colleges', 'stat-grades'].forEach((id) => {
          document.getElementById(id).textContent = '-';
        });
        document.getElementById('college-filter').title = '筛选项暂时无法更新';
        document.getElementById('grade-filter').title = '筛选项暂时无法更新';
      }
    }

    async function loadData(page = 1) {
      if (!getToken()) {
        window.location.href = '/html/admin-login.html';
        return;
      }
      const requestId = ++latestLoadRequest;
      currentPage = page;
      setFeedback('正在加载入会申请…');
      const params = new URLSearchParams({ ...readFilters(), page: String(page), limit: String(pageSize) });
      try {
        const response = await handleResponse(await fetch(`/api/membership-applications?${params}`, { headers: getAuthHeaders() }));
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
        const response = await handleResponse(await fetch(`/api/membership-applications/${item.id}`, { method: 'DELETE', headers: getAuthHeaders() }));
        const result = await response.json();
        await loadData(currentPage);
        await loadSupportData();
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
          { headers: getAuthHeaders() },
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
      if (!getToken()) {
        window.location.href = '/html/admin-login.html';
        return;
      }
      document.getElementById('refresh-button').addEventListener('click', () => Promise.all([loadData(1), loadSupportData()]));
      document.getElementById('export-button').addEventListener('click', exportCsv);
      document.getElementById('detail-close-button').addEventListener('click', closeDetail);
      document.getElementById('detail-modal').addEventListener('click', (event) => {
        if (event.target === event.currentTarget) closeDetail();
      });
      document.getElementById('logout-button').addEventListener('click', () => {
        localStorage.removeItem('recruitment_officer_token');
        sessionStorage.removeItem('recruitment_officer_token');
        window.location.href = '/html/admin-login.html';
      });
      document.getElementById('search-input').addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadData(1), 250);
      });
      ['college-filter', 'grade-filter'].forEach((id) => document.getElementById(id).addEventListener('change', () => loadData(1)));
      document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeDetail(); });
      await Promise.all([loadData(), loadSupportData()]);
    });
  