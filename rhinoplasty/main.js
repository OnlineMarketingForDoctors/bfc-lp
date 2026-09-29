(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Page-load moment */
  requestAnimationFrame(function () { document.body.classList.add('is-ready'); });

  /* ---------- Header state + mobile call bar */
  var header = $('.site-header');
  var callBar = $('[data-call-bar]');
  var bookSection = $('#book');
  function onScroll() {
    var y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 40);
    if (callBar) {
      var bookTop = bookSection.getBoundingClientRect().top;
      callBar.classList.toggle('is-visible', y > 600 && bookTop > window.innerHeight * 0.6);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu */
  var menu = $('#mobile-menu');
  var openBtn = $('[data-menu-open]');
  function setMenu(open) {
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    openBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) $('[data-menu-close]').focus(); else openBtn.focus({ preventScroll: true });
  }
  openBtn.addEventListener('click', function () { setMenu(true); });
  $('[data-menu-close]').addEventListener('click', function () { setMenu(false); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && menu.classList.contains('is-open')) setMenu(false); });

  /* ---------- Active nav link */
  var navLinks = $$('.main-nav a');
  if ('IntersectionObserver' in window) {
    var navObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        navLinks.forEach(function (a) { a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + en.target.id)); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    navLinks.forEach(function (a) { var s = $(a.getAttribute('href')); if (s) navObs.observe(s); });
    window.addEventListener('scroll', function () {
      if (window.scrollY < window.innerHeight * 0.5) navLinks.forEach(function (a) { a.setAttribute('aria-current', 'false'); });
    }, { passive: true });
  }

  /* ---------- Hero video: muted loop in the frame, full video with sound in a lightbox */
  var heroVideo = $('#hero-video');
  var lightbox = $('#video-lightbox');
  if (heroVideo) {
    var ytId = heroVideo.dataset.yt, ytStart = heroVideo.dataset.start || 0;
    var ytBase = 'https://www.youtube-nocookie.com/embed/' + ytId;

    if (!reduceMotion) {
      var startLoop = function () {
        var bg = document.createElement('iframe');
        bg.src = ytBase + '?autoplay=1&mute=1&loop=1&playlist=' + ytId + '&controls=0&cc_load_policy=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&start=' + ytStart;
        bg.title = 'Background preview of the video';
        bg.allow = 'autoplay; encrypted-media; picture-in-picture';
        bg.tabIndex = -1;
        bg.addEventListener('load', function () { setTimeout(function () { bg.classList.add('is-live'); }, 900); });
        $('.video-bg', heroVideo).appendChild(bg);
      };
      if (document.readyState === 'complete') startLoop(); else window.addEventListener('load', startLoop);
    }

    var lbFrame = $('.lb-frame', lightbox);
    var closeLightbox = function () { if (lightbox.open) lightbox.close(); };
    $$('[data-video-lightbox]', heroVideo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        lbFrame.innerHTML = '<iframe src="' + ytBase + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=' + ytStart + '" title="Rhinoplasty at British Face Clinic" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        if (typeof lightbox.showModal === 'function') lightbox.showModal(); else lightbox.setAttribute('open', '');
      });
    });
    $('[data-lightbox-close]', lightbox).addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    // Removing the iframe stops the audio when the lightbox closes (button, Esc or backdrop)
    lightbox.addEventListener('close', function () { lbFrame.innerHTML = ''; });
  }

  /* ---------- Patient video reviews */
  $$('.poster-btn[data-video]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      $$('.video-card video').forEach(function (v) { v.pause(); });
      var v = document.createElement('video');
      v.src = btn.dataset.video;
      v.controls = true;
      v.playsInline = true;
      v.preload = 'auto';
      v.poster = btn.querySelector('img').currentSrc;
      btn.replaceWith(v);
      v.play().catch(function () {});
    });
  });

  /* ---------- Reviews carousel */
  var carousel = $('[data-carousel]');
  if (carousel) {
    var track = $('.carousel-track', carousel);
    var cards = $$('.review-card', track);
    var bar = $('.progress span', carousel);
    var index = 0, timer = null, DELAY = 6500;

    cards.forEach(function (card) {
      var text = $('.rc-text', card), more = $('.rc-more', card);
      if (text.scrollHeight > text.clientHeight + 4) more.hidden = false;
      more.addEventListener('click', function () {
        var open = card.classList.toggle('is-expanded');
        more.textContent = open ? 'Read less' : 'Read more';
        more.setAttribute('aria-expanded', String(open));
        if (open) stop(); else start();
      });
    });

    function perView() {
      var w = cards[0].getBoundingClientRect().width;
      return Math.max(1, Math.round(track.parentElement.clientWidth / (w + 22)) - 0);
    }
    function maxIndex() { return Math.max(0, cards.length - perView()); }
    function go(i) {
      var max = maxIndex();
      index = i > max ? 0 : i < 0 ? max : i;
      var offset = cards[index].offsetLeft - cards[0].offsetLeft;
      track.style.transform = 'translateX(' + (-offset) + 'px)';
      cards.forEach(function (c, n) { c.setAttribute('aria-hidden', String(n < index || n >= index + perView())); });
      animateVisible();
      restartBar();
    }
    function animateVisible() {
      if (reduceMotion) return;
      var pv = perView();
      cards.forEach(function (c, n) {
        if (n < index || n >= index + pv) return;
        c.classList.remove('is-in');
        c.style.setProperty('--d', ((n - index) * 110) + 'ms');
        void c.offsetWidth;
        c.classList.add('is-in');
      });
    }
    function restartBar() {
      if (reduceMotion || !bar) return;
      bar.style.transition = 'none';
      bar.style.width = '0';
      void bar.offsetWidth;
      if (timer) { bar.style.transition = 'width ' + DELAY + 'ms linear'; bar.style.width = '100%'; }
    }
    function start() { if (reduceMotion) return; stop(); timer = setInterval(function () { go(index + 1); }, DELAY); restartBar(); }
    function stop() { clearInterval(timer); timer = null; if (bar) { bar.style.transition = 'none'; bar.style.width = '0'; } }

    $('[data-next]', carousel).addEventListener('click', function () { go(index + 1); start(); });
    $('[data-prev]', carousel).addEventListener('click', function () { go(index - 1); start(); });
    carousel.addEventListener('mouseenter', stop);
    carousel.addEventListener('mouseleave', function () { if (!$('.is-expanded', track)) start(); });
    carousel.addEventListener('focusin', stop);

    var sx = null;
    track.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; stop(); }, { passive: true });
    track.addEventListener('touchend', function (e) {
      if (sx === null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
      sx = null;
      start();
    });
    window.addEventListener('resize', function () { go(Math.min(index, maxIndex())); });

    if ('IntersectionObserver' in window) {
      var seen = false;
      new IntersectionObserver(function (en) {
        if (en[0].isIntersecting) { if (!seen) { seen = true; animateVisible(); } start(); } else stop();
      }, { threshold: 0.3 }).observe(carousel);
    }
    go(0);
  }

  /* ---------- Before and after */
  var CASES = [
    { p: '11', n: 6, title: 'Female, 30s', meta: 'Open septorhinoplasty, 3 months after', text: 'She wanted a smoother, straighter bridge and a tip that sat back in proportion. The hump was reduced, the tip refined and de-projected, the overhanging columella corrected and a leftward lean straightened.' },
    { p: '13', n: 6, title: 'Female, 20s', meta: 'Open septorhinoplasty, 9 days after', text: 'A long nose that drifted to the right. The tip was shortened and refined, and a spreader graft and tip support graft from her own septum brought everything back into line.' },
    { p: '01', n: 5, title: 'Female, 26', meta: 'Rhinoplasty, 6 weeks after', text: 'A prominent hump and difficulty breathing. The bridge was lowered, the tip refined and the septum straightened to open up her airway.' },
    { p: '02', n: 7, title: 'Female, 31', meta: 'Rhinoplasty, 10 weeks after', text: 'A dorsal hump, a tip that dipped when she smiled and a nose that looked large in profile. The result is a softer, better balanced side view.' },
    { p: '09', n: 4, title: 'Female, 30s', meta: 'Open rhinoplasty, 3 weeks after', text: 'A wide nose, a dorsal hump and a bulbous tip. The nasal bones were narrowed, the hump reduced and the tip reshaped with fine sutures.' },
    { p: '10', n: 3, title: 'Female, 70s', meta: 'Open septorhinoplasty, 3 months after', text: 'An old injury and a recent fall had left a pronounced hump and a lean to the left. The septum was straightened, a cartilage graft added and the tip stabilised.' },
    { p: '12', n: 7, title: 'Female, 50s', meta: 'Open septorhinoplasty, 3 months after', text: 'She wanted a gentler side profile and a straighter nose from the front. Both were achieved without losing her character.' },
    { p: '08', n: 3, title: 'Male, 30s', meta: 'Open septorhinoplasty, 1 month after', text: 'A crooked nose and a deviated septum blocking the right side. Straightened inside and out for a clearer airway.' },
    { p: '07', n: 5, title: 'Patient in their 20s', meta: 'Open septorhinoplasty, 2 months after', text: 'Hump removed, tip stabilised and overall size reduced, with a deviated septum corrected to improve breathing.' },
    { p: '04', n: 7, title: 'Female, 21', meta: 'Rhinoplasty, 4 weeks after', text: 'A crooked nose with too much projection and a high bridge, brought into quieter proportion.' },
    { p: '03', n: 5, title: 'Female, 35', meta: 'Rhinoplasty, 9 months after', text: 'Breathing difficulties and a nose out of balance with her face. Nine months on, shape and function work together.' },
    { p: '05', n: 1, title: 'Female, 27', meta: 'Rhinoplasty, 3 weeks after', text: 'She wanted the hump gone, the tip brought in and the droop when smiling stopped.' },
    { p: '06', n: 4, title: 'Rhinoplasty patient', meta: '6 weeks after', text: 'A straighter, more refined profile six weeks after surgery.' }
  ];
  var grid = $('[data-ba-grid]');
  var countEl = $('[data-ba-count]');
  var page = 0, pages = Math.ceil(CASES.length / 2);

  function caseHTML(c) {
    var slides = '', dots = '';
    for (var i = 1; i <= c.n; i++) {
      slides += '<img src="img/ba/p' + c.p + '-' + i + '.webp" width="800" height="639" loading="lazy" draggable="false" alt="' + c.title + ', ' + c.meta.toLowerCase() + ': before and after, view ' + i + ' of ' + c.n + '">';
      dots += '<button type="button" aria-label="View ' + i + '"' + (i === 1 ? ' aria-current="true"' : '') + '></button>';
    }
    var nav = c.n > 1;
    return '<article class="ba-case">' +
      '<div class="ba-slider" data-slider>' +
        '<div class="ba-slides">' + slides + '</div>' +
        (nav ? '<button class="ba-nav prev" type="button" aria-label="Previous view" hidden><svg><use href="#i-left"/></svg></button>' +
               '<button class="ba-nav next" type="button" aria-label="Next view"><svg><use href="#i-right"/></svg></button>' +
               '<div class="ba-dots">' + dots + '</div>' : '') +
      '</div>' +
      '<div class="ba-caption"><h3>' + c.title + '</h3><div class="meta">' + c.meta + '</div><p>' + c.text + '</p></div>' +
    '</article>';
  }

  function initSlider(el) {
    var slides = $('.ba-slides', el), imgs = $$('img', slides), dots = $$('.ba-dots button', el);
    var prev = $('.ba-nav.prev', el), next = $('.ba-nav.next', el);
    var i = 0, n = imgs.length;
    if (n < 2) return;
    function show(k) {
      i = Math.max(0, Math.min(n - 1, k));
      slides.style.transform = 'translateX(' + (-100 * i) + '%)';
      dots.forEach(function (d, j) { d.setAttribute('aria-current', String(j === i)); });
      prev.hidden = i === 0;
      next.hidden = i === n - 1;
    }
    prev.addEventListener('click', function () { show(i - 1); });
    next.addEventListener('click', function () { show(i + 1); });
    dots.forEach(function (d, j) { d.addEventListener('click', function () { show(j); }); });
    var sx = null;
    el.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') sx = e.clientX; });
    el.addEventListener('pointerup', function (e) {
      if (sx === null) return;
      var dx = e.clientX - sx;
      if (Math.abs(dx) > 35) show(i + (dx < 0 ? 1 : -1));
      sx = null;
    });
    el.addEventListener('pointercancel', function () { sx = null; });
  }

  function renderBA(p, animate) {
    function draw() {
      page = (p + pages) % pages;
      var pair = CASES.slice(page * 2, page * 2 + 2);
      grid.innerHTML = pair.map(caseHTML).join('');
      $$('[data-slider]', grid).forEach(initSlider);
      countEl.textContent = (page + 1) + ' / ' + pages;
      grid.classList.remove('is-leaving');
    }
    if (animate && !reduceMotion) { grid.classList.add('is-leaving'); setTimeout(draw, 300); } else draw();
  }
  if (grid) {
    renderBA(0, false);
    $('[data-ba-next]').addEventListener('click', function () { renderBA(page + 1, true); });
    $('[data-ba-prev]').addEventListener('click', function () { renderBA(page - 1, true); });
  }

  /* ---------- Procedure tabs */
  var tabs = $$('.type-tab');
  function selectTab(tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      panel.hidden = !on;
      panel.classList.toggle('is-active', on);
    });
    if (focus) tab.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selectTab(t); });
    t.addEventListener('keydown', function (e) {
      var k = e.key, j = null;
      if (k === 'ArrowDown' || k === 'ArrowRight') j = (i + 1) % tabs.length;
      if (k === 'ArrowUp' || k === 'ArrowLeft') j = (i - 1 + tabs.length) % tabs.length;
      if (k === 'Home') j = 0;
      if (k === 'End') j = tabs.length - 1;
      if (j !== null) { e.preventDefault(); selectTab(tabs[j], true); }
    });
  });

  /* ---------- Image reveals */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); rObs.unobserve(en.target); } });
    }, { threshold: 0.15 });
    reveals.forEach(function (r) { rObs.observe(r); });
  } else {
    reveals.forEach(function (r) { r.classList.add('in'); });
  }

  /* ---------- Gentle parallax on satellite images */
  var para = $$('[data-parallax]');
  if (para.length && !reduceMotion) {
    var ticking = false;
    function updateParallax() {
      var vh = window.innerHeight;
      para.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var speed = parseFloat(el.dataset.parallax) || 0;
        var centre = r.top + r.height / 2 - vh / 2;
        el.style.transform = 'translate3d(0,' + (centre * speed).toFixed(1) + 'px,0)';
      });
      ticking = false;
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(updateParallax); } }, { passive: true });
    window.addEventListener('resize', updateParallax);
    updateParallax();
  }

  /* ---------- Booking form: load when near the viewport */
  var formFrame = $('#inline-DGtZDKfx99GubvJJl4XP');
  function loadForm() {
    if (!formFrame || formFrame.src) return;
    formFrame.src = formFrame.dataset.src;
    var s = document.createElement('script');
    s.src = 'https://link.msgsndr.com/js/form_embed.js';
    s.async = true;
    document.body.appendChild(s);
  }
  if (formFrame) {
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en, o) { if (en[0].isIntersecting) { loadForm(); o.disconnect(); } }, { rootMargin: '1200px 0px' }).observe(formFrame);
    } else loadForm();
    $$('a[href="#book"]').forEach(function (a) { a.addEventListener('click', loadForm); });
  }

  var yr = $('[data-year]');
  if (yr) yr.textContent = new Date().getFullYear();
})();
