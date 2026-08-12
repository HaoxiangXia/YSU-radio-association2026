/* 条目级滚动 reveal：元素进入视口时加 .is-visible（样式见 styles.css）。
   无 IntersectionObserver 或偏好减弱动效时直接显示，绝不隐藏内容。 */
(() => {
  'use strict';

  const SELECTOR = '.reveal';
  const show = (element) => element.classList.add('is-visible');

  const start = () => {
    const elements = [...document.querySelectorAll(SELECTOR)];
    if (!elements.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches || !('IntersectionObserver' in window)) {
      elements.forEach(show);
      return;
    }

    document.documentElement.classList.add('reveal-armed');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        show(entry.target);
        obs.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -6% 0px',
    });
    elements.forEach((element) => observer.observe(element));

    reducedMotion.addEventListener('change', (event) => {
      if (!event.matches) return;
      observer.disconnect();
      document.querySelectorAll(SELECTOR).forEach(show);
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
