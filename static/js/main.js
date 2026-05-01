// Game Hub – main.js

// ── Highlight current nav link ─────────────────────
document.querySelectorAll('.nav-links a').forEach(a => {
  if (a.href === window.location.href) a.style.color = 'var(--accent)';
});

// ── Safe fade-in (never leaves page invisible) ─────
(function() {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity .3s';
  // Use requestAnimationFrame for reliable timing
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.body.style.opacity = '1';
    });
  });
  // Fallback: always show after 500ms no matter what
  setTimeout(() => { document.body.style.opacity = '1'; }, 500);
})();