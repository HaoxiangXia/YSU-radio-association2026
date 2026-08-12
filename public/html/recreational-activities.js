
    // 渲染文娱活动列表
    function renderRecreationalActivities() {
      const container = document.getElementById('recreational-list');
      if (!container) return;
      
      container.innerHTML = recreationalActivities.map((activity, index) => `
        <article class="card card-section activity-record activity-record--community">
          <div class="activity-record__rail">
            <span class="activity-record__index">${String(index + 1).padStart(2, '0')}</span>
            <span class="activity-record__date">${activity.date}</span>
          </div>

          <div class="activity-record__content">
            <h2 class="card-title">${activity.name}</h2>
            <p class="activity-record__summary">${activity.description}</p>

            <div class="activity-record__details activity-record__details--equal">
              <div class="info-panel activity-record__note">
                <h3>参与人员</h3>
                <p>${activity.participants}</p>
              </div>

              <div class="info-panel activity-record__note">
                <h3>活动成果</h3>
                <p>${activity.achievements}</p>
              </div>
            </div>

            ${activity.images?.length ? `
              <section class="activity-gallery" aria-label="${activity.name}活动图片">
                ${activity.images.map((image, imageIndex) => `
                  <button type="button" class="activity-gallery__item" data-image="${image}" data-image-alt="${activity.name}活动现场照片 ${imageIndex + 1}" aria-label="查看${activity.name}活动照片 ${imageIndex + 1}">
                    <img ${getResponsiveImageAttributes(image, '(max-width: 640px) calc(50vw - 2.5rem), (max-width: 1024px) calc(33vw - 2rem), 13rem')} alt="${activity.name}活动现场照片 ${imageIndex + 1}" loading="lazy" decoding="async">
                  </button>
                `).join('')}
              </section>
            ` : ''}
          </div>
        </article>
      `).join('');
    }

    // 页面加载后渲染
    document.addEventListener('DOMContentLoaded', renderRecreationalActivities);
  