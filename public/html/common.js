// 无线电爱好者协会 - 公共 JavaScript

// 导航栏功能
function initNav() {
  const menuBtn = document.querySelector('.menu-btn');
  const mobileMenu = document.querySelector('.mobile-menu');
  
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('open');
      const isOpen = mobileMenu.classList.contains('open');
      menuBtn.setAttribute('aria-expanded', String(isOpen));
      menuBtn.setAttribute('aria-label', isOpen ? '关闭菜单' : '打开菜单');
    });
  }
  
  // 高亮当前页面
  const currentPath = window.location.pathname;
  const parentPageMap = {
    '/html/competition-activities.html': '/html/activities.html',
    '/html/recreational-activities.html': '/html/activities.html',
  };
  const activePath = parentPageMap[currentPath] || currentPath;
  const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === activePath || (href === '/html/index.html' && (currentPath === '/' || currentPath === '/html/'))) {
      link.classList.add('active');
    }
  });
}

// 回到顶部
function initScrollTop() {
  const scrollTopBtn = document.querySelector('.scrollTopBtn');
  if (!scrollTopBtn) return;
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  });
  
  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// 图片查看器
function initImageViewer() {
  const viewer = document.querySelector('.image-viewer');
  if (!viewer) return;
  
  const viewerImg = viewer.querySelector('img');

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-image]');
    if (!trigger) return;

    event.preventDefault();
    viewerImg.src = trigger.dataset.image;
    viewerImg.alt = trigger.dataset.imageAlt || '活动图片预览';
    viewer.classList.add('open');
  });
  
  viewer.addEventListener('click', () => {
    viewer.classList.remove('open');
  });
}

// 生成导航栏 HTML
function getNavHTML() {
  return `
    <nav class="nav">
      <div class="container">
        <a href="/html/index.html" class="nav-logo">
          <img src="/image/白底会徽.png" alt="会徽">
          <span>无线电爱好者协会</span>
        </a>
        <div class="nav-links">
          <a href="/html/index.html">首页</a>
          <a href="/html/about-association.html">关于协会</a>
          <a href="/html/activities.html">协会活动</a>
          <a href="/html/honors.html">荣誉成就</a>
          <a href="/html/trainings.html">培训教学</a>
          <a href="/html/registration.html">招新报名</a>
          <a href="/html/admission.html">录取查询</a>
        </div>
        <button type="button" class="menu-btn" aria-expanded="false" aria-controls="mobile-navigation" aria-label="打开菜单">
          <span class="menu-btn__icon" aria-hidden="true">
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>
      <div class="mobile-menu" id="mobile-navigation">
        <a href="/html/index.html">首页</a>
        <a href="/html/about-association.html">关于协会</a>
        <a href="/html/activities.html">协会活动</a>
        <a href="/html/honors.html">荣誉成就</a>
        <a href="/html/trainings.html">培训教学</a>
        <a href="/html/registration.html">招新报名</a>
        <a href="/html/admission.html">录取查询</a>
      </div>
    </nav>
  `;
}

// 生成页脚 HTML
function getFooterHTML() {
  return `
    <footer class="footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <h4>无线电爱好者协会</h4>
            <p>燕山大学技术实践类社团，致力于培养和传播科学技术的热情。</p>
            <a href="/html/admin-login.html" class="footer-admin-link">管理员入口</a>
          </div>
          <div>
            <h4>联系我们</h4>
            <p class="footer-contact-line">
              现任会长：赵易贵
              <span class="qq-contact">
                <span class="qq-icon">QQ</span>
                3140848313
              </span>
            </p>
            <p class="footer-contact-meta">燕山大学 · 无线电爱好者协会</p>
          </div>
        </div>
        <div class="footer-bottom">
          <p>&copy; 2025 燕山大学无线电爱好者协会 | 挖掘潜质，就在无协</p>
        </div>
      </div>
    </footer>
  `;
}

// 初始化页面
function initPage() {
  // 插入导航栏
  const navPlaceholder = document.getElementById('nav-placeholder');
  if (navPlaceholder) {
    navPlaceholder.innerHTML = getNavHTML();
  }
  
  // 插入页脚
  const footerPlaceholder = document.getElementById('footer-placeholder');
  if (footerPlaceholder) {
    footerPlaceholder.innerHTML = getFooterHTML();
  }
  
  // 初始化功能
  initNav();
  initScrollTop();
  initImageViewer();
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', initPage);
