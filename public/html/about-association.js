(() => {
  function renderOverviewStats() {
    const container = document.getElementById('overview-stats');
    if (!container || typeof stats === 'undefined' || !Array.isArray(stats)) return;

    container.innerHTML = stats.map((stat) => `
      <div class="overview-stat-card">
        <strong>${stat.value}${stat.suffix || ''}</strong>
        <span>${stat.label}</span>
      </div>
    `).join('');
  }

  function renderDepartmentCard(department, index, prefix) {
    const images = Array.isArray(department.images) && department.images.length
      ? department.images
      : [{ src: '/image/activities/farewell/photo-03.jpg', alt: `${department.name}活动照片` }];
    const firstImage = images[0];
    const galleryData = JSON.stringify(images).replace(/"/g, '&quot;');
    const statOne = department.stats.activities || department.stats.projects || department.stats.models || department.stats.softwares || department.stats.events || '-';
    const statTwo = department.stats.years || department.stats.awards || department.stats.printers || department.stats.websites || department.stats.honors || '-';

    return `
      <article class="department-card" data-department-index="${prefix}-${index}">
        <div class="department-card__media" data-images="${galleryData}">
          <div class="department-card__gallery">
            <button type="button" class="department-card__preview" data-image="${firstImage.src}" data-image-alt="${firstImage.alt}" aria-label="查看${firstImage.alt}完整图片">
              <img class="department-card__photo" src="${firstImage.src}" alt="${firstImage.alt}" loading="lazy">
            </button>
            ${images.length > 1 ? `
              <button type="button" class="department-card__media-control department-card__media-control--previous" data-gallery-direction="-1" aria-label="查看上一张图片">‹</button>
              <button type="button" class="department-card__media-control department-card__media-control--next" data-gallery-direction="1" aria-label="查看下一张图片">›</button>
              <span class="department-card__media-count" aria-live="polite">1 / ${images.length}</span>
            ` : ''}
          </div>
          <div class="department-card__meta">
            <div class="department-card__identity">
              <h3 class="department-card__name">${department.name}</h3>
              <div class="department-card__tags">${department.tags.slice(0, 3).map((tag) => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
            <div class="department-card__metrics">
              <div><strong>${department.stats.members}</strong><span>部门成员</span></div>
              <div><strong>${statOne}</strong><span>${department.statLabel1}</span></div>
              <div><strong>${statTwo}</strong><span>${department.statLabel2}</span></div>
            </div>
          </div>
        </div>
        <div class="department-card__content">
          <p class="department-card__desc">${department.description}</p>
          <button type="button" class="department-card__toggle" aria-expanded="false" aria-controls="dept-detail-${prefix}-${index}">
            <span>了解详情</span><span class="department-card__toggle-icon" aria-hidden="true">↓</span>
          </button>
          <div class="department-card__detail" id="dept-detail-${prefix}-${index}" aria-hidden="false">
            <div class="department-card__lists">
              <div class="department-card__list"><h4>主要职责</h4><ul>${department.responsibilities.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}</ul></div>
              <div class="department-card__list"><h4>部门特色</h4><ul>${department.features.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}</ul></div>
              <div class="department-card__list"><h4>学习内容</h4><ul>${department.learn.slice(0, 4).map((item) => `<li>${item}</li>`).join('')}</ul></div>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function setupDepartmentGalleries() {
    document.querySelectorAll('.department-card__media').forEach((gallery) => {
      const images = JSON.parse(gallery.dataset.images || '[]');
      if (images.length < 2) return;

      const image = gallery.querySelector('.department-card__photo');
      const preview = gallery.querySelector('.department-card__preview');
      const counter = gallery.querySelector('.department-card__media-count');
      let currentIndex = 0;

      gallery.addEventListener('click', (event) => {
        const control = event.target.closest('[data-gallery-direction]');
        if (!control) return;
        event.preventDefault();
        event.stopPropagation();
        currentIndex = (currentIndex + Number(control.dataset.galleryDirection) + images.length) % images.length;
        const current = images[currentIndex];
        image.src = current.src;
        image.alt = current.alt;
        preview.dataset.image = current.src;
        preview.dataset.imageAlt = current.alt;
        preview.setAttribute('aria-label', `查看${current.alt}完整图片`);
        counter.textContent = `${currentIndex + 1} / ${images.length}`;
      });
    });
  }

  function renderDepartments() {
    if (typeof departments === 'undefined' || !Array.isArray(departments)) return;
    const technical = document.getElementById('department-grid-technical');
    const nonTechnical = document.getElementById('department-grid-non-technical');
    if (!technical || !nonTechnical) return;

    technical.innerHTML = departments
      .filter((department) => department.category === 'technical')
      .map((department, index) => renderDepartmentCard(department, index, 'tech'))
      .join('');
    nonTechnical.innerHTML = departments
      .filter((department) => department.category === 'non-technical')
      .map((department, index) => renderDepartmentCard(department, index, 'non-tech'))
      .join('');

    const compactLayout = window.matchMedia('(max-width: 959px)');
    const cards = [...document.querySelectorAll('.department-card')];
    const setExpanded = (card, expanded) => {
      const button = card.querySelector('.department-card__toggle');
      const detail = card.querySelector('.department-card__detail');
      card.classList.toggle('is-expanded', expanded);
      button.setAttribute('aria-expanded', String(expanded));
      detail.setAttribute('aria-hidden', String(!expanded));
    };
    const syncLayout = () => cards.forEach((card) => setExpanded(card, !compactLayout.matches));

    const toggleCard = (card) => {
      if (!compactLayout.matches) return;
      const shouldExpand = !card.classList.contains('is-expanded');
      cards.forEach((other) => { if (other !== card) setExpanded(other, false); });
      setExpanded(card, shouldExpand);
    };

    cards.forEach((card) => {
      const toggle = card.querySelector('.department-card__toggle');
      toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleCard(card);
      });
      card.addEventListener('click', (event) => {
        if (event.target.closest('.department-card__media, .tag, .department-card__toggle')) return;
        toggleCard(card);
      });
    });
    compactLayout.addEventListener('change', syncLayout);
    syncLayout();
    setupDepartmentGalleries();
  }

  function renderRecentEvents() {
    const container = document.getElementById('recent-events');
    if (!container || typeof recentEvents === 'undefined' || !Array.isArray(recentEvents)) return;
    container.innerHTML = recentEvents.map((event) => `
      <a href="/html/activities.html" class="news-card">
        <div class="news-card__meta">${event.date}</div>
        <h3>${event.title}</h3>
        <p>${event.description}</p>
      </a>
    `).join('');
  }

  function renderHonors() {
    const container = document.getElementById('honors-grid');
    if (!container || typeof topHonors === 'undefined' || !Array.isArray(topHonors)) return;
    container.innerHTML = topHonors.map((honor) => `
      <article class="honor-card">
        <h3>${honor.title}</h3>
        <p>${honor.description}</p>
        ${honor.year ? `<span class="honor-card__year">${honor.year}</span>` : ''}
      </article>
    `).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderOverviewStats();
    renderDepartments();
    renderRecentEvents();
    renderHonors();
  });
})();
