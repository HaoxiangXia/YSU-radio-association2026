
    // 渲染竞赛列表
    function renderCompetitions() {
      const container = document.getElementById('competitions-list');
      if (!container) return;
      
      container.innerHTML = competitions.map((comp, index) => `
        <article id="${comp.id}" class="card card-section activity-record activity-record--competition" tabindex="-1">
          <div class="activity-record__rail">
            <span class="activity-record__index">${String(index + 1).padStart(2, '0')}</span>
            <span class="activity-record__date">${comp.date}</span>
          </div>

          <div class="activity-record__content">
            <h2 class="card-title">${comp.name}</h2>
            <p class="activity-record__summary">${comp.description}</p>

            <div class="flex flex-wrap gap-2 activity-record__tags">
              ${comp.tracks.map(track => `<span class="tag">${track}</span>`).join('')}
            </div>

            <div class="activity-record__details">
              ${comp.participants ? `
                <div class="info-panel activity-record__metric">
                  <span>参赛人数</span>
                  <strong>${comp.participants} 人</strong>
                </div>
              ` : ''}

              <div class="info-panel activity-record__highlights">
                <h3>活动亮点</h3>
                <ul class="space-y-2">
                  ${comp.highlights.map(item => `
                    <li><span aria-hidden="true"></span>${item}</li>
                  `).join('')}
                </ul>
              </div>
            </div>

            ${comp.images?.length ? `
              <section class="activity-gallery" aria-label="${comp.name}活动图片">
                ${comp.images.map((image, imageIndex) => `
                  <button type="button" class="activity-gallery__item" data-image="${image}" data-image-alt="${comp.name}活动现场照片 ${imageIndex + 1}" aria-label="查看${comp.name}活动照片 ${imageIndex + 1}">
                    <img ${getResponsiveImageAttributes(image, '(max-width: 640px) calc(50vw - 2.5rem), (max-width: 1024px) calc(33vw - 2rem), 13rem')} alt="${comp.name}活动现场照片 ${imageIndex + 1}" loading="lazy" decoding="async">
                  </button>
                `).join('')}
              </section>
            ` : ''}
          </div>
        </article>
      `).join('');
    }

    function focusCompetitionFromHash() {
      if (!window.location.hash) return;

      const resetInvalidHash = () => {
        if (document.activeElement?.matches('.activity-record')) {
          document.activeElement.blur();
        }
        window.scrollTo({ top: 0, behavior: 'auto' });
      };

      let targetId = '';
      try {
        targetId = decodeURIComponent(window.location.hash.slice(1));
      } catch (error) {
        resetInvalidHash();
        return;
      }

      const target = document.getElementById(targetId);
      if (!target) {
        resetInvalidHash();
        return;
      }

      window.requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'start', behavior: 'auto' });
        target.focus({ preventScroll: true });
      });
    }

    // 页面加载后渲染
    document.addEventListener('DOMContentLoaded', () => {
      renderCompetitions();
      focusCompetitionFromHash();
      window.addEventListener('hashchange', focusCompetitionFromHash);
      window.addEventListener('load', focusCompetitionFromHash, { once: true });
    });
  