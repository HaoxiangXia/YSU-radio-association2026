
    function checkAuth() {
      const token = localStorage.getItem('recruitment_officer_token') || sessionStorage.getItem('recruitment_officer_token');
      if (!token) return;

      fetch('/api/recruitment-officers/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(response => {
        if (response.ok) {
          window.location.href = '/html/membership-applications.html';
        } else if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('recruitment_officer_token');
          sessionStorage.removeItem('recruitment_officer_token');
        }
      })
      .catch(() => {});
    }

    async function handleLogin(e) {
      e.preventDefault();
      
      const form = document.getElementById('login-form');
      const errorDiv = document.getElementById('error-message');
      const loginBtn = document.getElementById('login-btn');
      
      errorDiv.style.display = 'none';
      
      loginBtn.disabled = true;
      loginBtn.textContent = '登录中...';
      
      try {
        const username = form.elements.username.value.trim();
        const password = form.elements.password.value;
        const remember = form.elements.remember.checked;
        
        const response = await fetch('/api/recruitment-officers/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, remember }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.token) {
          if (remember) {
            localStorage.setItem('recruitment_officer_token', data.token);
            sessionStorage.removeItem('recruitment_officer_token');
          } else {
            sessionStorage.setItem('recruitment_officer_token', data.token);
            localStorage.removeItem('recruitment_officer_token');
          }
          window.location.href = '/html/membership-applications.html';
        } else {
          errorDiv.textContent = data.detail || data.message || '用户名或密码错误';
          errorDiv.style.display = 'block';
        }
      } catch (error) {
        errorDiv.textContent = '登录失败，请稍后再试';
        errorDiv.style.display = 'block';
      } finally {
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      checkAuth();
      
      const form = document.getElementById('login-form');
      if (form) {
        form.addEventListener('submit', handleLogin);
      }
    });
  