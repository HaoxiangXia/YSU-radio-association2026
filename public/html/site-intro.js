(function () {
  'use strict';

  const INTRO_KEY = 'radio-intro-shown-v3';
  const FOCUS_COMPLETE_MS = 3700;
  const FORCE_EXIT_MS = 5000;
  const EXIT_DURATION_MS = 460;
  const REDUCED_HOLD_MS = 450;

  function removeIntro(intro) {
    if (intro && intro.isConnected) intro.remove();
  }

  function clamp(value, minimum, maximum) {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function mix(from, to, amount) {
    return from + (to - from) * amount;
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - clamp(value, 0, 1), 3);
  }

  function easeInOutCubic(value) {
    const normalized = clamp(value, 0, 1);
    return normalized < 0.5
      ? 4 * normalized * normalized * normalized
      : 1 - Math.pow(-2 * normalized + 2, 3) / 2;
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

    const canvas = document.getElementById('site-intro-canvas');
    const lens = document.getElementById('site-intro-lens');
    const skipButton = document.getElementById('site-intro-skip');
    const progressBar = document.getElementById('site-intro-progress');
    const progressValue = intro.querySelector('.site-intro__progress-value');
    const percent = document.getElementById('site-intro-percent');
    const status = intro.querySelector('.site-intro__status');
    const logos = Array.from(intro.querySelectorAll('.site-intro__emblem img'));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const mobileLayout = window.matchMedia('(max-width: 540px), (pointer: coarse)').matches;
    const pointerEnabled = !reducedMotion
      && !mobileLayout
      && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const context = !reducedMotion && canvas ? canvas.getContext('2d') : null;
    const particles = [];
    const particleCount = mobileLayout ? 18 : 40;
    const startedAt = performance.now();
    let loadComplete = document.readyState === 'complete';
    let progress = 0;
    let leaving = false;
    let removed = false;
    let exitStartedAt = 0;
    let frameRequest = 0;
    let resizeRequest = 0;
    let removalTimer = 0;
    let forceExitTimer = 0;
    let canvasWidth = 0;
    let canvasHeight = 0;
    let pixelRatio = 1;

    intro.dataset.canvas = String(Boolean(context));
    intro.dataset.pointerInteractive = String(pointerEnabled);

    for (let index = 0; index < particleCount; index += 1) {
      const order = index / Math.max(1, particleCount - 1);
      particles.push({
        angle: order * Math.PI * 2 + (Math.random() - 0.5) * 0.38,
        radial: 0.48 + Math.random() * 0.58,
        target: Math.random(),
        spin: (Math.random() > 0.5 ? 1 : -1) * (0.00008 + Math.random() * 0.00016),
        turn: (Math.random() - 0.5) * 1.9,
        size: 0.7 + Math.random() * 1.65,
        phase: Math.random() * Math.PI * 2,
        brightness: 0.38 + Math.random() * 0.62,
      });
    }

    function markShown() {
      try {
        sessionStorage.setItem(INTRO_KEY, '1');
      } catch (error) {
        // Storage may be unavailable in privacy-restricted contexts.
      }
    }

    function setProgress(value) {
      progress = clamp(Math.round(value), 0, 100);
      if (progressValue) progressValue.style.width = `${progress}%`;
      if (percent) percent.textContent = `${progress}%`;
      if (progressBar) progressBar.setAttribute('aria-valuenow', String(progress));
    }

    function resizeCanvas() {
      resizeRequest = 0;
      if (!context || !canvas) return;
      canvasWidth = Math.max(window.innerWidth, 1);
      canvasHeight = Math.max(window.innerHeight, 1);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvasWidth * pixelRatio);
      canvas.height = Math.round(canvasHeight * pixelRatio);
      canvas.style.width = `${canvasWidth}px`;
      canvas.style.height = `${canvasHeight}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    }

    function scheduleResize() {
      if (!resizeRequest) resizeRequest = window.requestAnimationFrame(resizeCanvas);
    }

    function drawArcField(centerX, centerY, lensRadius, focus, waitingPulse, exitProgress, elapsed) {
      const fieldAlpha = Math.min(1, elapsed / 320) * (1 - exitProgress);
      const rotation = elapsed * 0.00022;
      const ringCount = mobileLayout ? 2 : 4;

      context.save();
      context.lineCap = 'round';
      for (let index = 0; index < ringCount; index += 1) {
        const radius = lensRadius * (1.27 + index * 0.42)
          + (1 - focus) * (80 + index * 54)
          + waitingPulse * (index + 1) * 1.8
          + exitProgress * (140 + index * 75);
        const arcStart = rotation * (index % 2 ? -1 : 1) + index * 1.34;
        const arcLength = 0.48 + index * 0.2;
        context.beginPath();
        context.arc(centerX, centerY, radius, arcStart, arcStart + arcLength);
        context.strokeStyle = `rgba(${index % 2 ? '65, 139, 203' : '112, 199, 241'}, ${fieldAlpha * (0.14 + (ringCount - index) * 0.035)})`;
        context.lineWidth = index === 0 ? 1.25 : 0.8;
        context.stroke();

        context.beginPath();
        context.arc(centerX, centerY, radius, arcStart + Math.PI, arcStart + Math.PI + arcLength * 0.62);
        context.strokeStyle = `rgba(255, 255, 255, ${fieldAlpha * 0.43})`;
        context.stroke();
      }

      const convergenceRadius = lensRadius * mix(2.4, 1.12, focus) + exitProgress * 220;
      const gradient = context.createRadialGradient(centerX, centerY, Math.max(0, convergenceRadius - 12), centerX, centerY, convergenceRadius + 10);
      gradient.addColorStop(0, 'rgba(102, 192, 236, 0)');
      gradient.addColorStop(0.52, `rgba(102, 192, 236, ${0.11 * fieldAlpha})`);
      gradient.addColorStop(0.58, `rgba(255, 255, 255, ${0.48 * fieldAlpha})`);
      gradient.addColorStop(0.66, 'rgba(102, 192, 236, 0)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(centerX, centerY, convergenceRadius + 12, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }

    function drawParticles(centerX, centerY, lensRadius, focus, waitingPulse, exitProgress, elapsed) {
      const maximumDimension = Math.max(canvasWidth, canvasHeight);
      const entryAlpha = clamp((elapsed - 80) / 360, 0, 1);
      const exitEase = easeOutCubic(exitProgress);

      context.save();
      context.lineCap = 'round';
      for (const particle of particles) {
        const startRadius = lensRadius + maximumDimension * particle.radial;
        const targetRadius = lensRadius * (1.12 + particle.target * 1.35);
        const focusedRadius = mix(startRadius, targetRadius, focus);
        const radius = focusedRadius * (1 + waitingPulse * 0.012)
          + exitEase * (maximumDimension * (0.28 + particle.radial * 0.32));
        const angle = particle.angle
          + elapsed * particle.spin
          + (1 - focus) * particle.turn
          + exitEase * particle.turn * 0.7;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.72;
        const tailLength = mix(30, 11, focus) + particle.size * 4;
        const tailRadius = radius + tailLength;
        const tailAngle = angle - particle.spin * 120;
        const tailX = centerX + Math.cos(tailAngle) * tailRadius;
        const tailY = centerY + Math.sin(tailAngle) * tailRadius * 0.72;
        const flicker = 0.78 + Math.sin(elapsed * 0.004 + particle.phase) * 0.22;
        const alpha = entryAlpha * (1 - exitProgress) * particle.brightness * flicker;

        const trailGradient = context.createLinearGradient(tailX, tailY, x, y);
        trailGradient.addColorStop(0, 'rgba(78, 161, 218, 0)');
        trailGradient.addColorStop(1, `rgba(86, 174, 228, ${alpha * 0.62})`);
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(x, y);
        context.strokeStyle = trailGradient;
        context.lineWidth = Math.max(0.5, particle.size * 0.68);
        context.stroke();

        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(236, 250, 255, ${alpha})`;
        context.shadowColor = 'rgba(68, 158, 219, 0.74)';
        context.shadowBlur = 6 + particle.size * 3;
        context.fill();
        context.shadowBlur = 0;
      }
      context.restore();
    }

    function drawCanvas(elapsed, now) {
      if (!context || !canvas || !lens || !canvasWidth || !canvasHeight) return;
      context.clearRect(0, 0, canvasWidth, canvasHeight);

      const lensBounds = lens.getBoundingClientRect();
      const centerX = lensBounds.left + lensBounds.width / 2;
      const centerY = lensBounds.top + lensBounds.height / 2;
      const lensRadius = Math.max(54, lensBounds.width / 2);
      const focus = easeInOutCubic((elapsed - 250) / 1350);
      const waitingPulse = intro.classList.contains('is-waiting')
        ? Math.sin((now - FOCUS_COMPLETE_MS) * 0.0024)
        : 0;
      const exitProgress = leaving ? clamp((now - exitStartedAt) / EXIT_DURATION_MS, 0, 1) : 0;

      drawArcField(centerX, centerY, lensRadius, focus, waitingPulse, exitProgress, elapsed);
      drawParticles(centerX, centerY, lensRadius, focus, waitingPulse, exitProgress, elapsed);
    }

    function cleanup() {
      removed = true;
      window.cancelAnimationFrame(frameRequest);
      window.cancelAnimationFrame(resizeRequest);
      window.clearTimeout(removalTimer);
      window.clearTimeout(forceExitTimer);
      window.removeEventListener('resize', scheduleResize);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('keydown', handleKeydown);
      intro.removeEventListener('pointermove', handlePointerMove);
      intro.removeEventListener('pointerleave', resetPointerLight);
      if (skipButton) skipButton.removeEventListener('click', skip);
    }

    function completeRemoval() {
      cleanup();
      removeIntro(intro);
    }

    function beginExit(complete) {
      if (leaving || removed) return;
      leaving = true;
      exitStartedAt = performance.now();
      window.clearTimeout(forceExitTimer);
      markShown();
      intro.classList.remove('is-waiting');
      intro.classList.add('is-leaving');
      intro.setAttribute('aria-hidden', 'true');
      if (status) status.textContent = complete ? '连接完成' : '正在进入首页';
      if (complete) setProgress(100);
      removalTimer = window.setTimeout(completeRemoval, EXIT_DURATION_MS + 40);
      ensureFrame();
    }

    function updateTimeline(now) {
      const elapsed = now - startedAt;
      if (reducedMotion) {
        setProgress(Math.min(100, elapsed / REDUCED_HOLD_MS * 100));
        if (elapsed >= REDUCED_HOLD_MS) beginExit(true);
        return elapsed;
      }

      const simulated = Math.min(88, easeOutCubic(elapsed / 3400) * 88);
      if (!leaving) setProgress(Math.max(progress, simulated));

      if (elapsed >= FOCUS_COMPLETE_MS && !leaving) {
        if (loadComplete || elapsed >= FORCE_EXIT_MS) {
          beginExit(loadComplete);
        } else {
          intro.classList.add('is-waiting');
          if (status) status.textContent = '正在等待页面资源';
        }
      }
      return elapsed;
    }

    function renderFrame(now) {
      frameRequest = 0;
      if (removed) return;
      const elapsed = updateTimeline(now);
      if (context && !document.hidden) drawCanvas(elapsed, now);

      const exitElapsed = leaving ? now - exitStartedAt : 0;
      if (!leaving || exitElapsed < EXIT_DURATION_MS) ensureFrame();
    }

    function ensureFrame() {
      if (!frameRequest && !removed && !document.hidden) {
        frameRequest = window.requestAnimationFrame(renderFrame);
      }
    }

    function handleLoad() {
      loadComplete = true;
      if (status && intro.classList.contains('is-waiting')) status.textContent = '连接完成';
      ensureFrame();
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        window.cancelAnimationFrame(frameRequest);
        frameRequest = 0;
      } else {
        ensureFrame();
      }
    }

    function handlePointerMove(event) {
      if (!lens) return;
      const normalizedX = event.clientX / Math.max(window.innerWidth, 1) * 2 - 1;
      const normalizedY = event.clientY / Math.max(window.innerHeight, 1) * 2 - 1;
      lens.style.setProperty('--intro-shift-x', `${(clamp(normalizedX, -1, 1) * 6).toFixed(2)}px`);
      lens.style.setProperty('--intro-shift-y', `${(clamp(normalizedY, -1, 1) * 4.5).toFixed(2)}px`);
    }

    function resetPointerLight() {
      if (!lens) return;
      lens.style.setProperty('--intro-shift-x', '0px');
      lens.style.setProperty('--intro-shift-y', '0px');
    }

    function skip() {
      beginExit(false);
    }

    function handleKeydown(event) {
      if (event.key === 'Escape') skip();
    }

    intro.hidden = false;
    if (context) resizeCanvas();
    window.requestAnimationFrame(function () {
      intro.classList.add('is-visible');
      ensureFrame();
    });

    if (skipButton) skipButton.addEventListener('click', skip);
    document.addEventListener('keydown', handleKeydown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('resize', scheduleResize, { passive: true });
    window.addEventListener('load', handleLoad, { once: true });

    if (pointerEnabled) {
      intro.addEventListener('pointermove', handlePointerMove, { passive: true });
      intro.addEventListener('pointerleave', resetPointerLight);
    }

    for (const logo of logos) {
      logo.addEventListener('error', function () {
        intro.classList.add('is-logo-unavailable');
        if (status) status.textContent = '正在进入首页';
      }, { once: true });
    }

    setProgress(0);
    forceExitTimer = window.setTimeout(function () {
      beginExit(loadComplete);
    }, FORCE_EXIT_MS);
  } catch (error) {
    removeIntro(document.getElementById('site-intro'));
  }
})();
