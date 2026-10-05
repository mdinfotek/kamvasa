/* ============================================================
   KAMVASA — interaction layer (vanilla JS)
   ============================================================ */
(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Lenis smooth scrolling ---------- */
  let lenis = null;
  if (!prefersReduced && typeof window.Lenis === 'function') {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    const raf = (time) => { lenis.raf(time); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }

  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { offset: -72, duration: 1.3 });
    else el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  /* ---------- Anchor navigation ---------- */
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) { e.preventDefault(); return; }
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      closeMenu();
      scrollToEl(target);
    });
  });

  /* ---------- Nav state, progress bar, parallax ---------- */
  const nav = $('#site-nav');
  const progress = $('.progress-bar');
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, speed: parseFloat(el.dataset.parallax) || 0.06 }));
  let ticking = false;

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      nav.classList.toggle('is-scrolled', y > 30);
      if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      if (!prefersReduced) {
        const vh = window.innerHeight;
        parallaxEls.forEach(({ el, speed }) => {
          const r = el.getBoundingClientRect();
          if (r.bottom < 0 || r.top > vh) return;
          const mid = r.top + r.height / 2 - vh / 2;
          const img = el.querySelector('img');
          if (img) img.style.transform = `translate3d(0, ${(-mid * speed).toFixed(1)}px, 0) scale(1.18)`;
        });
      }
      ticking = false;
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Active nav link ---------- */
  const sections = ['home', 'story', 'products', 'ingredients', 'wellness', 'journal', 'contact']
    .map((id) => ({ id, el: document.getElementById(id) }))
    .filter((s) => s.el);
  const navLinks = new Map($$('.nav-link').map((l) => [l.getAttribute('href').slice(1), l]));
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const id = entry.target.id;
      navLinks.forEach((link, key) => link.classList.toggle('is-active', key === id || (id === 'why' && key === 'home')));
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach((s) => sectionObserver.observe(s.el));

  /* ---------- Scroll reveals ---------- */
  const revealEls = $$('[data-reveal]');
  if (revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  }

  /* ---------- Mobile menu ---------- */
  const hamburger = $('#hamburger');
  const mobileMenu = $('#mobile-menu');
  const setMenu = (open) => {
    mobileMenu.classList.toggle('is-open', open);
    hamburger.classList.toggle('is-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  function closeMenu() { setMenu(false); }
  hamburger.addEventListener('click', () => setMenu(!mobileMenu.classList.contains('is-open')));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Product spotlight ---------- */
  const productsGrid = $('#products-grid');
  if (productsGrid && window.matchMedia('(pointer: fine)').matches) {
    productsGrid.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.product-card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    });
  }

  /* ---------- Dosha tabs ---------- */
  const tabs = $$('.tablist [role="tab"]');
  const activateTab = (tab) => {
    tabs.forEach((t) => {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => activateTab(tab));
    tab.addEventListener('keydown', (e) => {
      let next = null;
      if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
      if (next) { e.preventDefault(); next.focus(); activateTab(next); }
    });
  });

  /* ---------- Testimonial slider ---------- */
  const slider = $('[data-testid="testimonial-slider"]');
  if (slider) {
    const slides = $$('.slide', slider);
    const dotsWrap = $('#slider-dots');
    const count = $('#slider-count');
    let index = 0;
    let timer = null;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.setAttribute('aria-label', `Go to testimonial ${i + 1}`);
      dot.setAttribute('role', 'tab');
      dot.dataset.testid = `slider-dot-${i + 1}`;
      dot.addEventListener('click', () => { go(i); restart(); });
      dotsWrap.appendChild(dot);
    });
    const dots = $$('button', dotsWrap);

    const go = (i) => {
      index = (i + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === index));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === index));
      slides.forEach((s, k) => s.setAttribute('aria-hidden', String(k !== index)));
      count.textContent = `${String(index + 1).padStart(2, '0')} / ${String(slides.length).padStart(2, '0')}`;
    };
    const restart = () => {
      if (prefersReduced) return;
      clearInterval(timer);
      timer = setInterval(() => go(index + 1), 7000);
    };
    $('#slider-prev').addEventListener('click', () => { go(index - 1); restart(); });
    $('#slider-next').addEventListener('click', () => { go(index + 1); restart(); });
    slider.addEventListener('mouseenter', () => clearInterval(timer));
    slider.addEventListener('mouseleave', restart);
    go(0); restart();
  }

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer = null;
  const showToast = (html) => {
    toast.innerHTML = html;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4200);
  };

  /* ---------- Contact form (client-side demo) ---------- */
  const form = $('#contact-form');
  const success = $('#contact-success');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const name = $('#cf-name').value.trim().split(' ')[0] || 'friend';
      form.hidden = true;
      success.hidden = false;
      showToast(`<span class="deva">धन्यवाद</span> Thank you, ${name} — your message has been noted. (Preview site: nothing is sent yet.)`);
    });
    $('#contact-reset').addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      success.hidden = true;
      $('#cf-name').focus();
    });
  }

  /* ---------- Newsletter ---------- */
  const nl = $('#newsletter-form');
  if (nl) {
    nl.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!nl.checkValidity()) { nl.reportValidity(); return; }
      showToast('<span class="deva">नमस्ते</span> You’re on the list — slow letters are coming. (Preview site: nothing is sent yet.)');
      nl.reset();
    });
  }

  /* ---------- Dialogs (Privacy / Terms) ---------- */
  $$('[data-dialog]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dlg = document.getElementById(btn.dataset.dialog);
      if (dlg) dlg.showModal();
    });
  });
  $$('.modal [data-close]').forEach((btn) => {
    btn.addEventListener('click', () => btn.closest('.modal').close());
  });
  $$('.modal').forEach((dlg) => {
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  });

  /* ---------- Footer year ---------- */
  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
