
    let admissionQueryEnabled = false;

    function clearResult() {
      const resultDiv = document.getElementById('query-result');
      resultDiv.replaceChildren();
      resultDiv.style.display = 'none';
      resultDiv.classList.add('hidden');
    }

    function showResult({ title, message = '', status = '', kind = 'neutral' }) {
      const resultDiv = document.getElementById('query-result');
      const panel = document.createElement('div');
      panel.className = 'query-result-panel';

      const heading = document.createElement('h3');
      heading.className = 'query-result-title';
      heading.textContent = title;
      panel.appendChild(heading);

      if (status) {
        const statusElement = document.createElement('div');
        statusElement.className = `query-result-badge ${kind === 'accepted' ? 'is-accepted' : 'is-pending'}`;
        statusElement.textContent = status;
        panel.appendChild(statusElement);
      }
      if (status === '已录取') {
        const groupNotice = document.createElement('p');
        groupNotice.className = 'query-result-group';
        const label = document.createElement('span');
        label.textContent = '请加入无协QQ群';
        const number = document.createElement('strong');
        number.textContent = '737330969';
        groupNotice.append(label, number);
        panel.appendChild(groupNotice);
      }
      if (message) {
        const messageElement = document.createElement('p');
        messageElement.className = kind === 'error'
          ? 'query-result-msg is-error'
          : 'query-result-msg';
        messageElement.textContent = message;
        panel.appendChild(messageElement);
      }

      resultDiv.replaceChildren(panel);
      resultDiv.style.display = 'block';
      resultDiv.classList.remove('hidden');
    }

    async function loadRecruitmentConfig() {
      const queryButton = document.getElementById('query-button');
      try {
        const response = await fetch('/api/recruitment/config', {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('配置请求失败');
        const config = await response.json();
        if (!config.admissionQuery || !config.contact) throw new Error('配置内容不完整');

        renderRecruitmentContact(document.getElementById('admission-contact'), config.contact);
        admissionQueryEnabled = config.admissionQuery.enabled === true;
        queryButton.disabled = !admissionQueryEnabled;
        queryButton.textContent = admissionQueryEnabled ? '查询' : '录取查询当前未开放';
        if (!admissionQueryEnabled) {
          showResult({
            title: '录取查询尚未开放',
            message: '录取查询尚未开放，请留意协会后续通知。',
          });
        } else {
          clearResult();
        }
      } catch (error) {
        admissionQueryEnabled = false;
        queryButton.disabled = true;
        queryButton.textContent = '录取查询暂不可用';
        showResult({
          title: '暂时无法查询',
          message: '录取查询安排暂时无法读取，请稍后重试或联系协会负责人。',
          kind: 'error',
        });
      }
    }

    async function checkAdmission() {
      const studentIdInput = document.getElementById('student-id-input');
      const queryButton = document.getElementById('query-button');
      const studentId = studentIdInput.value.trim();

      if (!admissionQueryEnabled) {
        showResult({
          title: '录取查询当前不可用',
          message: '请留意页面上的查询安排。',
        });
        return;
      }

      if (!/^\d{12}$/.test(studentId)) {
        showResult({ title: '输入有误', message: '请输入正确的12位学号', kind: 'error' });
        studentIdInput.focus();
        return;
      }

      queryButton.disabled = true;
      queryButton.textContent = '查询中…';
      try {
        const response = await fetch('/api/admissions/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = typeof result.detail === 'string'
            ? result.detail
            : '查询失败，请稍后重试。';
          showResult({
            title: response.status === 404 ? '未找到录取结果' : '查询未完成',
            message,
            kind: response.status >= 500 ? 'error' : 'neutral',
          });
          return;
        }

        const accepted = result.status === '已录取';
        showResult({
          title: `${result.name}同学`,
          status: result.status,
          kind: accepted ? 'accepted' : 'rejected',
        });
      } catch (error) {
        showResult({
          title: '查询未完成',
          message: '网络连接异常，请稍后重试。',
          kind: 'error',
        });
      } finally {
        queryButton.disabled = !admissionQueryEnabled;
        queryButton.textContent = admissionQueryEnabled ? '查询' : '录取查询当前未开放';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      const studentIdInput = document.getElementById('student-id-input');
      document.getElementById('query-button').addEventListener('click', checkAdmission);
      const triggerQuery = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          checkAdmission();
        }
      };
      studentIdInput.addEventListener('keydown', triggerQuery);
      loadRecruitmentConfig();
    });
