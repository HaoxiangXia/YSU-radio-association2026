(() => {
  'use strict';

  function initHomeEffects() {
    const page = document.body;
    const hero = document.querySelector('.home-page .hero');
    const canvas = document.getElementById('home-hero-canvas');

    if (!page.classList.contains('home-page') || !hero || !canvas) return;

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealSelector = '.home-reveal, .home-reveal-item';
    let revealObserver = null;
    let animationFrame = 0;
    let resizeFrame = 0;
    let running = false;

    const revealImmediately = () => {
      document.querySelectorAll(revealSelector).forEach((element) => {
        element.classList.add('is-visible');
      });
    };

    const disableReveals = () => {
      revealObserver?.disconnect();
      revealObserver = null;
      page.classList.remove('home-effects-ready');
      revealImmediately();
    };

    const enableReveals = () => {
      const elements = Array.from(document.querySelectorAll(revealSelector));

      if (!elements.length || !('IntersectionObserver' in window)) {
        revealImmediately();
        return;
      }

      revealObserver?.disconnect();
      revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, {
        threshold: 0.14,
        rootMargin: '0px 0px -6% 0px',
      });

      elements.forEach((element) => revealObserver.observe(element));
      page.classList.add('home-effects-ready');
    };

    if (motionQuery.matches) {
      canvas.hidden = true;
      revealImmediately();
      return;
    }

    const context = canvas.getContext('2d', { alpha: true });

    if (!context) {
      canvas.hidden = true;
      enableReveals();
      return;
    }

    canvas.dataset.running = 'false';

    let width = 1;
    let height = 1;
    let pixelRatio = 1;
    let particles = [];
    let drawConnections = true;
    let connectionDistance = 120;

    const pointer = {
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0,
    };

    const particleCount = (viewportWidth) => {
      if (viewportWidth <= 480) return 12;
      if (viewportWidth <= 640) return 16;
      if (viewportWidth <= 800) return 18;
      if (viewportWidth <= 1100) return 30;
      return Math.min(42, Math.round(viewportWidth / 34));
    };

    const createParticle = () => {
      const desktopStart = width * 0.38;

      return {
        x: width > 800
          ? desktopStart + Math.random() * (width - desktopStart)
          : Math.random() * width,
        y: Math.random() * height,
        velocityX: (Math.random() - 0.5) * 0.1,
        velocityY: (Math.random() - 0.5) * 0.075,
        radius: 0.7 + Math.random() * 0.7,
        opacity: 0.28 + Math.random() * 0.2,
        depth: 0.35 + Math.random() * 0.9,
        accent: Math.random() > 0.78,
        anchor: Math.random() > 0.88,
      };
    };

    const resizeCanvas = () => {
      const bounds = hero.getBoundingClientRect();
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      drawConnections = width > 800;
      connectionDistance = width >= 1200 ? 128 : 110;
      particles = Array.from({ length: particleCount(width) }, createParticle);
      canvas.dataset.particleCount = String(particles.length);
      canvas.dataset.connections = drawConnections ? 'enabled' : 'disabled';
    };

    const queueResize = () => {
      if (resizeFrame) return;
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0;
        resizeCanvas();
      });
    };

    const updatePointer = (event) => {
      if (event.pointerType && event.pointerType !== 'mouse') return;
      const bounds = hero.getBoundingClientRect();
      pointer.targetX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
      pointer.targetY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    };

    const resetPointer = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };

    const drawFrame = () => {
      context.clearRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';

      pointer.currentX += (pointer.targetX - pointer.currentX) * 0.035;
      pointer.currentY += (pointer.targetY - pointer.currentY) * 0.035;

      particles.forEach((particle) => {
        particle.x += particle.velocityX;
        particle.y += particle.velocityY;

        if (particle.x < -8) particle.x = width + 8;
        if (particle.x > width + 8) particle.x = -8;
        if (particle.y < -8) particle.y = height + 8;
        if (particle.y > height + 8) particle.y = -8;

        particle.drawX = particle.x + pointer.currentX * 5 * particle.depth;
        particle.drawY = particle.y + pointer.currentY * 4 * particle.depth;

        context.beginPath();
        context.arc(particle.drawX, particle.drawY, particle.radius, 0, Math.PI * 2);
        context.fillStyle = particle.accent
          ? `rgba(8, 145, 178, ${particle.opacity})`
          : `rgba(30, 78, 121, ${particle.opacity})`;
        context.fill();

        if (particle.anchor) {
          context.beginPath();
          context.arc(particle.drawX, particle.drawY, particle.radius + 2.2, 0, Math.PI * 2);
          context.strokeStyle = 'rgba(14, 116, 144, 0.34)';
          context.lineWidth = 0.8;
          context.stroke();
        }
      });

      if (drawConnections) {
        for (let index = 0; index < particles.length; index += 1) {
          const particle = particles[index];

          for (let nextIndex = index + 1; nextIndex < particles.length; nextIndex += 1) {
            const nextParticle = particles[nextIndex];
            const deltaX = particle.drawX - nextParticle.drawX;
            const deltaY = particle.drawY - nextParticle.drawY;
            const distance = Math.hypot(deltaX, deltaY);

            if (distance >= connectionDistance) continue;

            const opacity = (1 - distance / connectionDistance) * 0.14;
            context.beginPath();
            context.moveTo(particle.drawX, particle.drawY);
            context.lineTo(nextParticle.drawX, nextParticle.drawY);
            context.strokeStyle = `rgba(37, 99, 235, ${opacity})`;
            context.lineWidth = 0.8;
            context.stroke();
          }
        }
      }
    };

    const tick = () => {
      if (!running) return;
      drawFrame();
      animationFrame = window.requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (running || document.hidden || motionQuery.matches) return;
      running = true;
      canvas.dataset.running = 'true';
      animationFrame = window.requestAnimationFrame(tick);
    };

    const stopAnimation = () => {
      running = false;
      canvas.dataset.running = 'false';
      if (animationFrame) {
        window.cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else {
        startAnimation();
      }
    };

    const handleMotionChange = (event) => {
      if (event.matches) {
        stopAnimation();
        canvas.hidden = true;
        disableReveals();
        return;
      }

      canvas.hidden = false;
      resizeCanvas();
      enableReveals();
      startAnimation();
    };

    resizeCanvas();
    enableReveals();
    startAnimation();

    hero.addEventListener('pointermove', updatePointer, { passive: true });
    hero.addEventListener('pointerleave', resetPointer, { passive: true });
    window.addEventListener('resize', queueResize, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (typeof motionQuery.addEventListener === 'function') {
      motionQuery.addEventListener('change', handleMotionChange);
    } else {
      motionQuery.addListener(handleMotionChange);
    }
  }

  const start = () => {
    try {
      initHomeEffects();
    } catch {
      document.body.classList.remove('home-effects-ready');
      document.querySelectorAll('.home-reveal, .home-reveal-item').forEach((element) => {
        element.classList.add('is-visible');
      });

      const canvas = document.getElementById('home-hero-canvas');
      if (canvas) canvas.hidden = true;
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
