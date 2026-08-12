
    let currentPreviewId = null;
    let admissionQueryEnabled = false;

    function getToken() {
      return localStorage.getItem('recruitment_officer_token') || sessionStorage.getItem('recruitment_officer_token');
    }

    function authHeaders(extra = {}) {
      return { Authorization: `Bearer ${getToken()}`, ...extra };
    }

    function clearAuthAndRedirect() {
      localStorage.removeItem('recruitment_officer_token');
      sessionStorage.removeItem('recruitment_officer_token');
      window.location.href = '/html/admin-login.html';
    }

    async function checkedResponse(response) {
      if (response.status === 401 || response.status === 403) {
        clearAuthAndRedirect();
        throw new Error('登录已失效');
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const detail = Array.isArray(body.detail)
          ? body.detail.map((item) => item.msg).join('；')
          : body.detail;
        throw new Error(detail || body.message || '请求失败');
      }
      return response;
    }

    function setFeedback(id, message = '', isError = false) {
      const element = document.getElementById(id);
      element.textContent = message;
      element.classList.toggle('is-error', isError);
    }

    function toLocalInput(isoValue) {
      if (!isoValue) return '';
      const date = new Date(isoValue);
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
      return local.toISOString().slice(0, 16);
    }

    function toIsoValue(localValue) {
      return localValue ? new Date(localValue).toISOString() : null;
    }

    function lines(value) {
      return [...new Set(value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean))];
    }

    function fillConfig(config) {
      const form = document.getElementById('config-form');
      form.elements.cycle.value = config.cycle;
      form.elements.retentionUntil.value = config.application.retentionUntil || '';
      form.elements.applicationEnabled.checked = config.application.enabled === true;
      form.elements.startsAt.value = toLocalInput(config.application.startsAt);
      form.elements.endsAt.value = toLocalInput(config.application.endsAt);
      form.elements.privacyNotice.value = config.application.privacyNotice;
      form.elements.crossBorderNotice.value = config.application.crossBorderNotice;
      form.elements.admissionEnabled.checked = config.admissionQuery.enabled === true;
      form.elements.contactLabel.value = config.contact.label;
      form.elements.contactQq.value = config.contact.qq || '';
      form.elements.contactChannel.value = config.contact.channelText;
      form.elements.colleges.value = config.options.colleges.join('\n');
      form.elements.grades.value = config.options.grades.join('\n');
      form.elements.icpNumber.value = config.site.icpNumber || '';
      admissionQueryEnabled = config.admissionQuery.enabled === true;
    }

    async function loadConfig() {
      setFeedback('config-feedback', '正在读取设置。');
      try {
        const response = await checkedResponse(await fetch('/api/recruitment/manage/config', { headers: authHeaders() }));
        const body = await response.json();
        fillConfig(body.config);
        setFeedback('config-feedback', `已读取 ${body.config.cycle} 招新周期设置。`);
      } catch (error) {
        setFeedback('config-feedback', error.message, true);
      }
    }

    function configFromForm() {
      const form = document.getElementById('config-form');
      return {
        cycle: form.elements.cycle.value.trim(),
        application: {
          enabled: form.elements.applicationEnabled.checked,
          startsAt: toIsoValue(form.elements.startsAt.value),
          endsAt: toIsoValue(form.elements.endsAt.value),
          privacyNotice: form.elements.privacyNotice.value.trim(),
          crossBorderNotice: form.elements.crossBorderNotice.value.trim(),
          retentionUntil: form.elements.retentionUntil.value || null,
        },
        admissionQuery: {
          enabled: form.elements.admissionEnabled.checked,
        },
        contact: {
          label: form.elements.contactLabel.value.trim(),
          qq: form.elements.contactQq.value.trim(),
          channelText: form.elements.contactChannel.value.trim(),
        },
        options: {
          colleges: lines(form.elements.colleges.value),
          grades: lines(form.elements.grades.value),
        },
        site: { icpNumber: form.elements.icpNumber.value.trim() },
      };
    }

    async function saveConfig(event) {
      event.preventDefault();
      const config = configFromForm();
      const summary = [
        `招新周期：${config.cycle}`,
        `入会申请：${config.application.enabled ? '开启' : '关闭'}`,
        `录取查询：${config.admissionQuery.enabled ? '开启' : '关闭'}`,
        `学院/年级选项：${config.options.colleges.length}/${config.options.grades.length}`,
      ].join('\n');
      if (!window.confirm(`请确认保存以下设置：\n\n${summary}`)) return;

      const button = document.getElementById('save-config-button');
      button.disabled = true;
      setFeedback('config-feedback', '正在校验并保存。');
      try {
        const response = await checkedResponse(await fetch('/api/recruitment/manage/config', {
          method: 'PUT',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify(config),
        }));
        const body = await response.json();
        fillConfig(body.config);
        setFeedback('config-feedback', body.changedFields.length
          ? `保存成功，已更新 ${body.changedFields.length} 个字段。`
          : '配置内容没有变化。');
        await loadAdmissionsStatus();
      } catch (error) {
        setFeedback('config-feedback', error.message, true);
      } finally {
        button.disabled = false;
      }
    }

    async function loadAdmissionsStatus() {
      try {
        const response = await checkedResponse(await fetch('/api/admissions/manage/status', { headers: authHeaders() }));
        const status = await response.json();
        admissionQueryEnabled = status.queryEnabled === true;
        let message = status.published
          ? `已发布 ${status.count ?? '未知'} 条录取结果`
          : '尚未发布录取名单';
        if (!status.valid) message += '，但当前名单校验失败';
        message += `；录取查询当前${status.queryEnabled ? '已开放' : '已关闭'}。`;
        document.getElementById('admissions-status').textContent = message;
      } catch (error) {
        document.getElementById('admissions-status').textContent = `状态读取失败：${error.message}`;
      }
    }

    async function downloadTemplate() {
      setFeedback('admissions-feedback', '正在生成模板。');
      try {
        const response = await checkedResponse(await fetch('/api/admissions/manage/template.xlsx', { headers: authHeaders() }));
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = '录取名单模板.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setFeedback('admissions-feedback', '模板已下载。');
      } catch (error) {
        setFeedback('admissions-feedback', error.message, true);
      }
    }

    function renderPreview(body) {
      document.getElementById('preview-result').hidden = false;
      const summary = document.getElementById('preview-summary');
      summary.replaceChildren();
      const labels = [
        `总计 ${body.summary.total}`,
        `已录取 ${body.summary.accepted}`,
        `未录取 ${body.summary.rejected}`,
        `错误 ${body.summary.errors}`,
      ];
      labels.forEach((label) => {
        const item = document.createElement('span');
        item.textContent = label;
        summary.appendChild(item);
      });

      const errors = document.getElementById('preview-errors');
      errors.replaceChildren();
      body.errors.forEach((error) => {
        const item = document.createElement('li');
        item.textContent = `第 ${error.row} 行：${error.message}`;
        errors.appendChild(item);
      });

      const previewBody = document.getElementById('preview-body');
      previewBody.replaceChildren();
      body.preview.forEach((record) => {
        const row = document.createElement('tr');
        ['name', 'studentId', 'phone', 'department', 'status'].forEach((field) => {
          const cell = document.createElement('td');
          cell.textContent = record[field] || '-';
          row.appendChild(cell);
        });
        previewBody.appendChild(row);
      });

      currentPreviewId = body.valid ? body.previewId : null;
      const publishButton = document.getElementById('publish-button');
      publishButton.disabled = !currentPreviewId || admissionQueryEnabled;
      publishButton.title = admissionQueryEnabled ? '请先在上方关闭录取查询并保存' : '';
    }

    async function previewWorkbook() {
      const input = document.getElementById('admissions-file');
      const file = input.files[0];
      if (!file) {
        setFeedback('admissions-feedback', '请先选择 Excel 文件。', true);
        return;
      }
      if (!file.name.toLowerCase().endsWith('.xlsx') || file.size > 2 * 1024 * 1024) {
        setFeedback('admissions-feedback', '请选择 2 MiB 以内的 .xlsx 文件。', true);
        return;
      }
      const button = document.getElementById('preview-button');
      button.disabled = true;
      setFeedback('admissions-feedback', '正在校验录取名单。');
      try {
        const response = await checkedResponse(await fetch('/api/admissions/manage/preview', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          body: file,
        }));
        const body = await response.json();
        renderPreview(body);
        setFeedback('admissions-feedback', body.valid
          ? '校验通过。预览只显示脱敏内容，请确认后再发布。'
          : '校验未通过，请修正错误行后重新上传。', !body.valid);
      } catch (error) {
        currentPreviewId = null;
        document.getElementById('publish-button').disabled = true;
        setFeedback('admissions-feedback', error.message, true);
      } finally {
        button.disabled = false;
      }
    }

    async function publishAdmissions() {
      if (!currentPreviewId) return;
      if (admissionQueryEnabled) {
        setFeedback('admissions-feedback', '请先关闭录取查询再发布。', true);
        return;
      }
      if (!window.confirm('发布会替换当前录取名单并保留旧名单备份。确定继续吗？')) return;
      const button = document.getElementById('publish-button');
      button.disabled = true;
      setFeedback('admissions-feedback', '正在发布录取名单。');
      try {
        const response = await checkedResponse(await fetch('/api/admissions/manage/publish', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ previewId: currentPreviewId }),
        }));
        const body = await response.json();
        currentPreviewId = null;
        document.getElementById('preview-result').hidden = true;
        document.getElementById('admissions-file').value = '';
        setFeedback('admissions-feedback', `${body.message}，共 ${body.count} 条。`);
        await loadAdmissionsStatus();
      } catch (error) {
        button.disabled = false;
        setFeedback('admissions-feedback', error.message, true);
      }
    }

    document.addEventListener('DOMContentLoaded', async () => {
      if (!getToken()) {
        clearAuthAndRedirect();
        return;
      }
      document.getElementById('config-form').addEventListener('submit', saveConfig);
      document.getElementById('reload-config-button').addEventListener('click', loadConfig);
      document.getElementById('reload-admissions-button').addEventListener('click', loadAdmissionsStatus);
      document.getElementById('download-template-button').addEventListener('click', downloadTemplate);
      document.getElementById('preview-button').addEventListener('click', previewWorkbook);
      document.getElementById('publish-button').addEventListener('click', publishAdmissions);
      document.getElementById('logout-button').addEventListener('click', clearAuthAndRedirect);
      await loadConfig();
      await loadAdmissionsStatus();
    });
  