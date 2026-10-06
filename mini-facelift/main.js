(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Page-load moment */
  requestAnimationFrame(function () { document.body.classList.add('is-ready'); });

  /* ---------- Header state */
  var header = $('.site-header');
  var toTop = $('[data-to-top]');
  toTop.addEventListener('click', function (e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    $('.brand').focus({ preventScroll: true });
  });
  function onScroll() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
    toTop.classList.toggle('is-visible', window.scrollY > window.innerHeight);
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

    var poster = $('.video-poster', heroVideo);
    if (reduceMotion) poster.classList.add('is-shown');
    if (!reduceMotion) {
      // Start straight away (no waiting for the rest of the page) and keep the
      // frame dark until YouTube reports the video is actually playing, so its
      // thumbnail never flashes up
      var bg = document.createElement('iframe');
      bg.src = ytBase + '?autoplay=1&mute=1&loop=1&playlist=' + ytId + '&controls=0&cc_load_policy=0&disablekb=1&fs=0&iv_load_policy=3&modestbranding=1&playsinline=1&rel=0&enablejsapi=1&origin=' + encodeURIComponent(location.origin) + '&start=' + ytStart;
      bg.title = 'Background preview of the video';
      bg.allow = 'autoplay; encrypted-media; picture-in-picture';
      bg.tabIndex = -1;
      var live = false;
      function goLive() { if (live) return; live = true; bg.classList.add('is-live'); }
      window.addEventListener('message', function (ev) {
        if (ev.source !== bg.contentWindow) return;
        var d; try { d = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data; } catch (err) { return; }
        if (!d) return;
        if (d.event === 'onStateChange' && d.info === 1) goLive();
        if (d.event === 'infoDelivery' && d.info && d.info.playerState === 1) goLive();
      });
      bg.addEventListener('load', function () {
        bg.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'hero-loop' }), '*');
      });
      // Autoplay blocked (e.g. low power mode): bring the thumbnail back
      setTimeout(function () { if (!live) poster.classList.add('is-shown'); }, 6000);
      $('.video-bg', heroVideo).appendChild(bg);
    }

    var lbFrame = $('.lb-frame', lightbox);
    var closeLightbox = function () { if (lightbox.open) lightbox.close(); };
    $$('[data-video-lightbox]', heroVideo).forEach(function (btn) {
      btn.addEventListener('click', function () {
        lbFrame.innerHTML = '<iframe src="' + ytBase + '?autoplay=1&rel=0&modestbranding=1&playsinline=1&start=' + ytStart + '" title="Mini facelift at British Face Clinic" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>';
        if (typeof lightbox.showModal === 'function') lightbox.showModal(); else lightbox.setAttribute('open', '');
      });
    });
    $('[data-lightbox-close]', lightbox).addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', function (e) { if (e.target === lightbox) closeLightbox(); });
    // Self-hosted videos open in the same lightbox
    $$('[data-mp4-lightbox]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        lbFrame.innerHTML = '<video src="' + btn.dataset.mp4Lightbox + '" controls autoplay playsinline></video>';
        if (typeof lightbox.showModal === 'function') lightbox.showModal(); else lightbox.setAttribute('open', '');
      });
    });
    // Removing the iframe stops the audio when the lightbox closes (button, Esc or backdrop)
    lightbox.addEventListener('close', function () { lbFrame.innerHTML = ''; });
  }

  /* ---------- Hero results card: cross-fade through a few before and afters */
  var mini = $('.ba-mini');
  if (mini && !reduceMotion) {
    var miniImgs = $$('.ba-mini-track img', mini), miniDots = $$('.ba-mini-dots i', mini), mi = 0;
    setInterval(function () {
      if (document.hidden) return;
      miniImgs[mi].classList.remove('is-on'); miniDots[mi].classList.remove('is-on');
      mi = (mi + 1) % miniImgs.length;
      miniImgs[mi].classList.add('is-on'); miniDots[mi].classList.add('is-on');
    }, 3200);
  }
  if (mini) mini.addEventListener('click', function () {
    var imgs = $$('.ba-mini-track img', mini), start = 0;
    imgs.forEach(function (im, k) { if (im.classList.contains('is-on')) start = k; });
    openBA(imgs.map(function (im) { return { src: im.src, alt: im.alt }; }), start, 'Facelift, before and after');
  });

  /* ---------- Silent background loops: play only when visible, never with reduced motion */
  $$('video[data-bg-loop]').forEach(function (v) {
    if (reduceMotion || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (en) {
      if (en[0].isIntersecting) v.play().catch(function () {}); else v.pause();
    }, { threshold: 0.2 }).observe(v);
  });

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

  /* ---------- Reviews ticker: moves continuously, pauses on hover, focus, touch or an open review */
  var carousel = $('[data-carousel]');
  if (carousel) {
    var viewport = $('.carousel-viewport', carousel);
    var track = $('.carousel-track', carousel);
    var originals = $$('.review-card', track);
    var SPEED = 38;            // px per second
    var offset = 0, loopWidth = 0, last = null, nudge = 0;
    var hovering = false, focused = false, touching = false, visible = true;

    originals.forEach(function (card) {
      var text = $('.rc-text', card), more = $('.rc-more', card);
      if (text.scrollHeight > text.clientHeight + 4) more.hidden = false;
    });

    // Cloned sets after the originals make the loop seamless (two, as there are only a few reviews); clones are hidden from assistive tech
    [1, 2].forEach(function () { originals.forEach(function (card) {
      var clone = card.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.classList.add('is-clone');
      $$('button, a', clone).forEach(function (el) { el.tabIndex = -1; });
      track.appendChild(clone);
    }); });
    var allCards = $$('.review-card', track);

    function measure() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      loopWidth = originals.reduce(function (w, c) { return w + c.getBoundingClientRect().width + gap; }, 0);
    }
    function wrap() {
      if (!loopWidth) return;
      offset = ((offset % loopWidth) + loopWidth) % loopWidth;
    }
    function paused() { return hovering || focused || touching || !visible || !!$('.is-expanded', track); }

    function frame(t) {
      if (last === null) last = t;
      var dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      if (nudge) {
        var step = nudge * Math.min(1, dt * 7);
        offset += step; nudge -= step;
        if (Math.abs(nudge) < 0.5) { offset += nudge; nudge = 0; }
      } else if (!paused() && !reduceMotion) {
        offset += SPEED * dt;
      }
      wrap();
      track.style.transform = 'translate3d(' + (-offset).toFixed(2) + 'px,0,0)';
      requestAnimationFrame(frame);
    }

    allCards.forEach(function (card) {
      var more = $('.rc-more', card);
      more.addEventListener('click', function () {
        var open = card.classList.toggle('is-expanded');
        more.textContent = open ? 'Read less' : 'Read more';
        more.setAttribute('aria-expanded', String(open));
      });
    });

    function cardStep() { return originals[0].getBoundingClientRect().width + (parseFloat(getComputedStyle(track).columnGap) || 0); }
    $('[data-next]', carousel).addEventListener('click', function () { nudge += cardStep(); });
    $('[data-prev]', carousel).addEventListener('click', function () { nudge -= cardStep(); });

    viewport.addEventListener('mouseenter', function () { hovering = true; });
    viewport.addEventListener('mouseleave', function () { hovering = false; });
    track.addEventListener('focusin', function () { focused = true; });
    track.addEventListener('focusout', function () { focused = false; });

    // Touch: hold to pause, drag to scrub
    var dragX = null, resumeTimer = null;
    viewport.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      touching = true; dragX = e.clientX; clearTimeout(resumeTimer);
    });
    viewport.addEventListener('pointermove', function (e) {
      if (dragX === null) return;
      offset -= e.clientX - dragX; dragX = e.clientX; wrap();
    });
    function endTouch() {
      if (dragX === null) return;
      dragX = null;
      resumeTimer = setTimeout(function () { touching = false; }, 1500);
    }
    viewport.addEventListener('pointerup', endTouch);
    viewport.addEventListener('pointercancel', endTouch);

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(carousel);
    }
    window.addEventListener('resize', measure);
    measure();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    requestAnimationFrame(frame);
  }

  /* ---------- Before and after */
  var CASES = [
    { p: '1', n: 4, title: 'Facelift patient', meta: 'Front, profile and three-quarter views', text: 'Jowls softened and the jawline redefined, with a smoother neck and a brighter, more rested look from every angle.' },
    { p: '3', n: 5, title: 'Facelift patient', meta: 'Front, profile and three-quarter views', text: 'A crisper jawline and a smoother neck, with the cheeks lifted back into a more youthful position.' },
    { p: '2', n: 4, title: 'Facelift patient', meta: 'Front and profile views', text: 'The lower face and jawline lifted and tightened, for a fresher result that still looks entirely natural.' },
    { p: '4', n: 1, title: 'Facelift patient', meta: 'Three-quarter view', text: 'A cleaner jawline and lifted mid-face, keeping her character and expression.' }
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
      '<div class="ba-slider" data-slider data-caption="' + c.title + ', ' + c.meta.toLowerCase() + '">' +
        '<button class="ba-zoom" type="button" aria-label="View full size"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></button>' +
        '<div class="ba-slides">' + slides + '</div>' +
      '</div>' +
      // Controls sit below the photo so they never cover a face
      (nav ? '<div class="ba-controls">' +
               '<button class="ba-nav prev" type="button" aria-label="Previous view" disabled><svg><use href="#i-left"/></svg></button>' +
               '<div class="ba-dots">' + dots + '</div>' +
               '<button class="ba-nav next" type="button" aria-label="Next view"><svg><use href="#i-right"/></svg></button>' +
             '</div>' : '') +
      '<div class="ba-caption"><h3>' + c.title + '</h3><div class="meta">' + c.meta + '</div><p>' + c.text + '</p></div>' +
    '</article>';
  }

  function initSlider(el) {
    var box = el.closest('.ba-case');
    var slides = $('.ba-slides', el), imgs = $$('img', slides), dots = $$('.ba-dots button', box);
    var prev = $('.ba-nav.prev', box), next = $('.ba-nav.next', box);
    var i = 0, n = imgs.length, swiped = false;
    // Tap or click a photo (or the expand button) to see every view full size
    function zoom() { openBA(imgs.map(function (im) { return { src: im.src, alt: im.alt }; }), i, el.dataset.caption); }
    slides.addEventListener('click', function () { if (swiped) { swiped = false; return; } zoom(); });
    $('.ba-zoom', el).addEventListener('click', zoom);
    if (n < 2) return;
    function show(k) {
      i = Math.max(0, Math.min(n - 1, k));
      slides.style.transform = 'translateX(' + (-100 * i) + '%)';
      dots.forEach(function (d, j) { d.setAttribute('aria-current', String(j === i)); });
      prev.disabled = i === 0;
      next.disabled = i === n - 1;
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
      swiped = Math.abs(dx) > 10;
      sx = null;
    });
    el.addEventListener('pointercancel', function () { sx = null; });
  }

  /* Before and after lightbox */
  var baBox = $('#ba-lightbox'), baImg = $('.bal-img', baBox), baCount = $('.bal-count', baBox), baCap = $('.bal-caption', baBox);
  var baSet = [], baI = 0;
  function baShow(k) {
    baI = (k + baSet.length) % baSet.length;
    baImg.src = baSet[baI].src; baImg.alt = baSet[baI].alt;
    baCount.textContent = (baI + 1) + ' / ' + baSet.length;
    var multi = baSet.length > 1;
    $('.bal-prev', baBox).hidden = !multi; $('.bal-next', baBox).hidden = !multi; baCount.hidden = !multi;
  }
  function openBA(set, k, caption) {
    baSet = set; baCap.textContent = caption || ''; baShow(k);
    if (typeof baBox.showModal === 'function') baBox.showModal(); else baBox.setAttribute('open', '');
  }
  $('.bal-prev', baBox).addEventListener('click', function () { baShow(baI - 1); });
  $('.bal-next', baBox).addEventListener('click', function () { baShow(baI + 1); });
  $('.bal-close', baBox).addEventListener('click', function () { baBox.close(); });
  baBox.addEventListener('click', function (e) { if (e.target === baBox) baBox.close(); });
  baBox.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') baShow(baI + 1);
    if (e.key === 'ArrowLeft') baShow(baI - 1);
  });
  var bx = null;
  baBox.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') bx = e.clientX; });
  baBox.addEventListener('pointerup', function (e) {
    if (bx === null) return;
    var dx = e.clientX - bx; bx = null;
    if (Math.abs(dx) > 40 && baSet.length > 1) baShow(baI + (dx < 0 ? 1 : -1));
  });

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
    t.addEventListener('click', function () {
      selectTab(t);
      // On stacked layouts the detail panel sits below the tiles
      if (window.innerWidth <= 1020) $('.type-detail').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
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
