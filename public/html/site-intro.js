(function () {
  'use strict';

  const INTRO_KEY = 'radio-intro-shown-v2';
  const MAX_WAIT_MS = 4000;

  function removeIntro(intro) {
    if (intro && intro.isConnected) {
      intro.remove();
    }
  }

  try {
    const intro = document.getElementById('site-intro');
    if (!intro) return;

    const query = new URLSearchParams(window.location.search);
    const forcePlay = query.get('intro') === '1';
    const forceSkip = query.get('intro') === '0';

    if (forceSkip) {
      try {
        sessionStorage.setItem(INTRO_KEY, '1');
      } catch (error) {
        // Storage may be unavailable in privacy-restricted contexts.
      }
      removeIntro(intro);
      return;
    }

    try {
      if (!forcePlay && sessionStorage.getItem(INTRO_KEY) === '1') {
        removeIntro(intro);
        return;
      }
    } catch (error) {
      // Continue without session persistence when storage is unavailable.
    }

    const skipButton = document.getElementById('site-intro-skip');
    const progressBar = document.getElementById('site-intro-progress');
    const progressValue = intro.querySelector('.site-intro__progress-value');
    const percent = document.getElementById('site-intro-percent');
    const logo = intro.querySelector('.site-intro__emblem img');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const minimumDisplayMs = reducedMotion ? 450 : 1500;
    const completionPauseMs = reducedMotion ? 80 : 220;
    const exitFallbackMs = reducedMotion ? 80 : 700;
    const startedAt = performance.now();
    let loadComplete = document.readyState === 'complete';
    let progress = 0;
    let finished = false;
    let progressTimer = 0;
    let maxTimer = 0;

    function markShown() {
      try {
        sessionStorage.setItem(INTRO_KEY, '1');
      } catch (error) {
        // Storage may be unavailable in privacy-restricted contexts.
      }
    }

    function setProgress(value) {
      progress = Math.max(0, Math.min(100, Math.round(value)));
      if (progressValue) progressValue.style.width = `${progress}%`;
      if (percent) percent.textContent = `${progress}%`;
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(progress));
    }

    function cleanup() {
      window.clearInterval(progressTimer);
      window.clearTimeout(maxTimer);
      document.removeEventListener('keydown', handleKeydown);
      if (skipButton) skipButton.removeEventListener('click', skip);
    }

    function finish(options) {
      if (finished) return;
      finished = true;
      cleanup();
      markShown();

      if (options && options.complete) setProgress(100);
      intro.setAttribute('aria-hidden', 'true');
      intro.classList.add('is-leaving');

      window.setTimeout(function () {
        removeIntro(intro);
      }, exitFallbackMs);
    }

    function tick() {
      if (finished) return;
      const elapsed = performance.now() - startedAt;
      const simulated = Math.min(90, 90 * Math.min(1, elapsed / minimumDisplayMs));
      if (!loadComplete || elapsed < minimumDisplayMs) {
        setProgress(Math.max(progress, simulated));
        return;
      }

      setProgress(100);
      window.clearInterval(progressTimer);
      window.setTimeout(function () {
        finish({ complete: true });
      }, completionPauseMs);
    }

    function skip() {
      finish({ complete: false });
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') skip();
    }

    intro.hidden = false;
    window.requestAnimationFrame(function () {
      intro.classList.add('is-visible');
    });

    if (skipButton) skipButton.addEventListener('click', skip);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('load', function () {
      loadComplete = true;
      tick();
    }, { once: true });

    if (logo) {
      logo.addEventListener('error', function () {
        finish({ complete: false });
      }, { once: true });
    }

    setProgress(0);
    tick();
    progressTimer = window.setInterval(tick, 50);
    maxTimer = window.setTimeout(function () {
      finish({ complete: false });
    }, MAX_WAIT_MS);
  } catch (error) {
    removeIntro(document.getElementById('site-intro'));
  }
})();
