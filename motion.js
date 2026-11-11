'use strict';

let motionEnabled = true;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let motionObserver;

function observeMotion() {
  motionObserver?.disconnect();
  if (!motionEnabled || reducedMotion.matches || !('IntersectionObserver' in window)) return;

  motionObserver = new IntersectionObserver((entries, observer) => {
    for (const entry of entries) {
      const element = entry.target;
      const dial = element.classList.contains('signal-dial');
      if (dial) element.classList.toggle('dial-visible', entry.isIntersecting);
      if (!entry.isIntersecting) continue;

      element.classList.add('motion-enter');
      if (!dial) observer.unobserve(element);
    }
  }, { threshold: 0.12 });

  const targets = document.querySelectorAll([
    '.signal-dial', '.metrics', '.dash-panel', '.dash-distribution li', '.dash-plot',
    '.summarygrid .panel', '.barrow', '.myitem', '.about-card', '.activity',
  ].join(', '));
  for (const target of targets) {
    if (target.classList.contains('signal-dial') || !target.classList.contains('motion-enter')) {
      motionObserver.observe(target);
    }
  }
}

function initMotion() {
  const toggle = document.querySelector('#motion-toggle');
  const hint = document.querySelector('#motion-hint');
  motionEnabled = savedSession.motionEnabled !== false;

  const sync = () => {
    const active = motionEnabled && !reducedMotion.matches;
    document.documentElement.dataset.motion = active ? 'on' : 'off';
    toggle.checked = active;
    toggle.disabled = reducedMotion.matches;
    hint.hidden = !reducedMotion.matches;
    if (!active) {
      document.querySelectorAll('.motion-enter, .dial-visible').forEach(element => {
        element.classList.remove('motion-enter', 'dial-visible');
      });
    }
    observeMotion();
  };

  toggle.addEventListener('change', () => {
    motionEnabled = toggle.checked;
    sync();
    saveSession();
  });
  reducedMotion.addEventListener('change', sync);
  sync();
}
