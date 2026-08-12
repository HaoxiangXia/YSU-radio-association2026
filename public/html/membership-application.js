
    let applicationIsOpen = false;

    function populateOptions(config) {
      const collegeSelect = document.querySelector('select[name="college"]');
      const gradeSelect = document.querySelector('select[name="grade"]');

      collegeSelect.replaceChildren(new Option('请选择学院', ''));
      config.options.colleges.forEach((college) => {
          const option = document.createElement('option');
          option.value = college;
          option.textContent = college;
          collegeSelect.appendChild(option);
      });

      gradeSelect.replaceChildren(new Option('请选择年级', ''));
      config.options.grades.forEach((grade) => {
          const option = document.createElement('option');
          option.value = grade;
          option.textContent = grade;
          gradeSelect.appendChild(option);
      });
    }

    async function loadRecruitmentConfig() {
      const submitBtn = document.getElementById('submit-btn');
      try {
        const response = await fetch('/api/recruitment/config', {
          headers: { Accept: 'application/json' },
        });
        if (!response.ok) throw new Error('配置请求失败');
        const config = await response.json();
        if (!config.options?.colleges || !config.options?.grades || !config.application) {
          throw new Error('配置内容不完整');
        }

        populateOptions(config);
        renderRecruitmentContact(document.getElementById('contact-info'), config.contact);
        document.getElementById('privacy-notice').textContent = `隐私说明：${config.application.privacyNotice}`;

        applicationIsOpen = config.application.status === 'open';
        submitBtn.disabled = !applicationIsOpen;
        submitBtn.textContent = applicationIsOpen ? '提交入会申请' : '入会申请当前不可提交';
        setFormStatus('', false);
      } catch (error) {
        applicationIsOpen = false;
        submitBtn.disabled = true;
        submitBtn.textContent = '入会申请暂不可用';
        setFormStatus('招新安排暂时无法读取，为保护你的资料，当前不能提交。');
      }
    }

    // 每个字段返回错误文案；为空字符串表示通过
    const fieldValidators = {
      name: (form) => {
        const value = form.elements.name.value.trim();
        return (value.length < 2 || value.length > 30) ? '姓名应为 2 到 30 个字符' : '';
      },
      studentId: (form) => /^202\d{9}$/.test(form.elements.studentId.value.trim()) ? '' : '请输入 12 位数字学号',
      college: (form) => form.elements.college.value ? '' : '请选择学院',
      grade: (form) => form.elements.grade.value ? '' : '请选择年级',
      phone: (form) => /^1[3-9]\d{9}$/.test(form.elements.phone.value.trim()) ? '' : '请输入有效的手机号码',
      email: (form) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.elements.email.value.trim()) ? '' : '请输入有效的电子邮箱',
      self_introduction: (form) => {
        const value = form.elements.self_introduction.value.trim();
        return (value.length < 10 || value.length > 1000) ? '自我介绍应为 10 到 1000 个字符' : '';
      },
      expectation: (form) => form.elements.expectation.value.trim().length > 500 ? '加入期望不能超过 500 个字符' : '',
      privacyAccepted: (form) => form.elements.privacyAccepted.checked ? '' : '请先阅读并同意隐私说明',
    };

    function showFieldError(key, message) {
      const errorEl = document.getElementById(`error-${key}`);
      if (errorEl) errorEl.textContent = message;
    }

    function validateField(key) {
      const validator = fieldValidators[key];
      if (!validator) return true;
      const form = document.getElementById('membership-application-form');
      const message = validator(form);
      showFieldError(key, message);
      return !message;
    }

    function validateForm() {
      let valid = true;
      Object.keys(fieldValidators).forEach(key => {
        if (!validateField(key)) valid = false;
      });
      return valid;
    }

    // 离开输入框即校验；已显示错误的字段在输入过程中实时复检
    function attachFieldValidation(form) {
      ['name', 'studentId', 'phone', 'email', 'self_introduction', 'expectation'].forEach(key => {
        const el = form.elements[key];
        if (!el) return;
        el.addEventListener('blur', () => validateField(key));
        el.addEventListener('input', () => {
          const errorEl = document.getElementById(`error-${key}`);
          if (errorEl && errorEl.textContent) validateField(key);
        });
      });
      ['college', 'grade', 'privacyAccepted'].forEach(key => {
        const el = form.elements[key];
        if (!el) return;
        el.addEventListener('change', () => validateField(key));
      });
    }

    function setFormStatus(message, isError = true) {
      const statusElement = document.getElementById('form-status');
      statusElement.textContent = message;
      statusElement.className = `text-sm mt-3 ${isError ? 'text-red-600' : 'text-green-600'}`;
    }

    // 提交表单
    async function handleSubmit(e) {
      e.preventDefault();
      if (!applicationIsOpen) {
        setFormStatus('入会申请当前未开放，不能提交。');
        return;
      }
      if (!validateForm()) return;
      
      const form = document.getElementById('membership-application-form');
      const submitBtn = document.getElementById('submit-btn');
      
      submitBtn.disabled = true;
      submitBtn.textContent = '提交中...';
      
      try {
        const formData = {
          name: form.elements.name.value.trim(),
          studentId: form.elements.studentId.value.trim(),
          college: form.elements.college.value,
          grade: form.elements.grade.value,
          phone: form.elements.phone.value.trim(),
          email: form.elements.email.value.trim(),
          self_introduction: form.elements.self_introduction.value.trim(),
          expectation: form.elements.expectation.value.trim(),
          privacyAccepted: form.elements.privacyAccepted.checked,
        };
        
        const response = await fetch('/api/membership-applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        
        const result = await response.json().catch(() => ({}));
        if (response.ok) {
          document.getElementById('success-modal').classList.add('open');
          form.reset();
          setFormStatus('', false);
        } else {
          const detail = result.detail;
          const message = typeof detail === 'string'
            ? detail
            : Array.isArray(detail)
              ? detail.map((item) => item.msg).join('；')
              : '提交失败，请稍后再试。';
          setFormStatus(message);
        }
      } catch (error) {
        setFormStatus('提交失败，请检查网络后重试。');
      } finally {
        submitBtn.disabled = !applicationIsOpen;
        submitBtn.textContent = applicationIsOpen ? '提交入会申请' : '入会申请当前不可提交';
      }
    }

    function closeSuccessModal() {
      document.getElementById('success-modal').classList.remove('open');
    }

    document.addEventListener('DOMContentLoaded', () => {
      const form = document.getElementById('membership-application-form');
      if (form) {
        form.addEventListener('submit', handleSubmit);
        attachFieldValidation(form);
      }
      document.getElementById('success-close-button').addEventListener('click', closeSuccessModal);
      loadRecruitmentConfig();
    });
  