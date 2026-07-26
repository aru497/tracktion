/* Tracktion — UI kit: inline icons + DOM helpers + micro-interactions */
window.UI = (function () {
  // ---- Icons (24x24, stroke = currentColor, Phosphor-ish weight) --------
  const S = (p, o = {}) =>
    `<svg viewBox="0 0 24 24" fill="${o.fill || 'none'}" stroke="${o.fill ? 'none' : 'currentColor'}" stroke-width="${o.w || 1.9}" stroke-linecap="round" stroke-linejoin="round" width="24" height="24" aria-hidden="true">${p}</svg>`;
  const ICON = {
    compass: S('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    parts:   S('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.1-.4-.4-2.1z"/>'),
    map:     S('<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4z"/><path d="M9 4v13M15 6.5v13"/>'),
    garage:  S('<path d="M4 10 12 4l8 6"/><path d="M5 10v9h14v-9"/><path d="M8 19v-5h8v5"/>'),
    pin:     S('<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
    search:  S('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/>'),
    star:    S('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9z"/>', { fill: 'currentColor' }),
    starO:   S('<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L4.5 9.7l5.9-.9z"/>'),
    chev:    S('<path d="M9 6l6 6-6 6"/>'),
    chevD:   S('<path d="M6 9l6 6 6-6"/>'),
    plus:    S('<path d="M12 5v14M5 12h14"/>'),
    minus:   S('<path d="M5 12h14"/>'),
    bell:    S('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    heart:   S('<path d="M12 20s-7-4.4-9.2-8.4C1.2 8.7 3 5.5 6.2 5.5c1.9 0 3 1 3.8 2.1C10.8 6.5 11.9 5.5 13.8 5.5c3.2 0 5 3.2 3.4 6.1C19 15.6 12 20 12 20z"/>'),
    heartF:  S('<path d="M12 20s-7-4.4-9.2-8.4C1.2 8.7 3 5.5 6.2 5.5c1.9 0 3 1 3.8 2.1C10.8 6.5 11.9 5.5 13.8 5.5c3.2 0 5 3.2 3.4 6.1C19 15.6 12 20 12 20z"/>', { fill: 'currentColor' }),
    check:   S('<path d="M5 12.5l4.2 4.2L19 7"/>'),
    checkC:  S('<circle cx="12" cy="12" r="9"/><path d="M8.3 12.3l2.4 2.4L16 9.5"/>'),
    x:       S('<path d="M6 6l12 12M18 6 6 18"/>'),
    arrow:   S('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back:    S('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    user:    S('<circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-6 8-6s8 2 8 6"/>'),
    mail:    S('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>'),
    shield:  S('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>'),
    filter:  S('<path d="M4 5h16M7 12h10M10 19h4"/>'),
    route:   S('<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.5 6H15a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h6.5"/>'),
    fuel:    S('<path d="M5 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M4 21h12M5 11h10"/><path d="M15 8l3 3v7a2 2 0 0 0 2-2v-6l-3-3"/>'),
    clock:   S('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    ruler:   S('<path d="M3 8l5-5 13 13-5 5z"/><path d="M8 8l1.5 1.5M11 5l1.5 1.5M14 8l1.5 1.5"/>'),
    google:  '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="#4285F4" d="M22.5 12.2c0-.7-.06-1.4-.18-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z"/><path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.7l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M6 14.3a6.6 6.6 0 0 1 0-4.2V7.3H2.3a11 11 0 0 0 0 9.8z"/><path fill="#EA4335" d="M12 5.5c1.6 0 3 .55 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.3L6 10.1c.9-2.6 3.2-4.6 6-4.6z"/></svg>',
    apple:   '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M16.4 12.8c0-2.3 1.9-3.4 2-3.5-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.15-2.8.85-3.5.85s-1.8-.83-3-.8c-1.5.02-2.9.9-3.7 2.3-1.6 2.7-.4 6.8 1.1 9 .7 1.1 1.6 2.3 2.8 2.25 1.1-.05 1.5-.72 2.9-.72s1.7.72 2.9.7c1.2-.02 2-1.1 2.7-2.2.85-1.25 1.2-2.5 1.2-2.55-.03-.02-2.3-.9-2.3-3.5zM14.2 6c.63-.77 1.05-1.83.94-2.9-.9.04-2 .6-2.65 1.36-.58.67-1.1 1.75-.96 2.78 1 .08 2.03-.5 2.67-1.24z"/></svg>',
    // category glyphs
    recovery: S('<rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 9V7M17 9V7M7 16v2M17 16v2M4 12.5h16"/>'),
    suspension: S('<path d="M8 3v3M16 3v3M8 21v-3M16 21v-3"/><path d="M8 6c0 2 8 2 8 4s-8 2-8 4 8 2 8 4"/>'),
    bar: S('<path d="M3 14h18M6 14v-3a6 6 0 0 1 12 0v3"/><path d="M4 14v4M20 14v4"/>'),
    snorkel: S('<path d="M8 21V8a3 3 0 0 1 6 0"/><path d="M14 8h3a2 2 0 0 1 2 2v2M5 21h6"/>'),
    light: S('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M6 6l1.5 1.5M16.5 16.5 18 18M18 6l-1.5 1.5M7.5 16.5 6 18"/>'),
    tyre: S('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v4.5M12 16.5V21M3 12h4.5M16.5 12H21"/>'),
    roof: S('<path d="M3 8h18M3 8l3-3h12l3 3M5 8v3h14V8M5 15h14"/>'),
    battery: S('<rect x="3" y="8" width="16" height="9" rx="2"/><path d="M19 11h2v3h-2M8 6V8M14 6V8M8 12.5h4M10 10.5v4"/>'),
    beach: S('<path d="M3 18h18"/><circle cx="8" cy="8" r="3"/><path d="M8 11v7M8 8l7-2M8 8l6 3"/>'),
    mountain: S('<path d="M3 19l6-11 4 6 2-3 6 8z"/><path d="M9 8l1.5 2.5"/>'),
    desert: S('<circle cx="16" cy="7" r="2.5"/><path d="M3 17c3-3 6-3 9 0M3 20c4-3 10-3 18 0"/>'),
    forest: S('<path d="M12 3l4 6h-3l3 5H8l3-5H8z"/><path d="M12 14v6"/>'),
    river: S('<path d="M3 8c3-2 6 2 9 0s6-2 9 0M3 13c3-2 6 2 9 0s6-2 9 0M3 18c3-2 6 2 9 0s6-2 9 0"/>')
  };
  const icon = (name, cls = '') => `<span class="ic ${cls}">${ICON[name] || ''}</span>`;

  const typeIcon = { beach: 'beach', mountain: 'mountain', desert: 'desert', forest: 'forest', river: 'river' };

  // ---- helpers ----------------------------------------------------------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const money = (n) => '$' + n.toLocaleString('en-AU', { minimumFractionDigits: (n % 1 ? 2 : 0), maximumFractionDigits: 2 });
  const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function stars(n) {
    let h = '<span class="stars">';
    for (let i = 1; i <= 5; i++) h += (i <= Math.round(n)) ? ICON.star : ICON.starO;
    return h + '</span>';
  }

  // ---- toast ------------------------------------------------------------
  let toastEl, toastT;
  function toast(msg, withCheck = true) {
    if (!toastEl) { toastEl = el('<div class="toast"></div>'); document.body.appendChild(toastEl); }
    toastEl.innerHTML = (withCheck ? ICON.checkC : '') + `<span>${esc(msg)}</span>`;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  // ---- bottom sheet -----------------------------------------------------
  function sheet(innerHTML) {
    const scrim = el('<div class="scrim"></div>');
    const sh = el(`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${innerHTML}</div>`);
    document.body.append(scrim, sh);
    requestAnimationFrame(() => { scrim.classList.add('show'); sh.classList.add('show'); });
    const close = () => { scrim.classList.remove('show'); sh.classList.remove('show'); setTimeout(() => { scrim.remove(); sh.remove(); }, 320); };
    scrim.addEventListener('click', close);
    return { el: sh, close };
  }

  // ---- scroll reveal ----------------------------------------------------
  const io = new IntersectionObserver((ents) => {
    ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08 });
  function reveal(root = document) { $$('.reveal:not(.in)', root).forEach((n, i) => { n.style.transitionDelay = (i % 8 * 45) + 'ms'; io.observe(n); }); }

  return { icon, ICON, typeIcon, $, $$, el, money, esc, stars, toast, sheet, reveal };
})();
