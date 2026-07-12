// ════════════════════════════════════════════════════════════════
//  STONEX PUBLIC SITE — script.js
//  Loads content from Firebase Firestore and applies it live
// ════════════════════════════════════════════════════════════════

import { initializeApp }      from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, serverTimestamp }
                               from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { firebaseConfig }      from "./firebase-config.js";

// ─── Init ────────────────────────────────────────────────────
const app = initializeApp(firebaseConfig);
const db  = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Always default to clean white theme on load
document.documentElement.classList.add('theme-light');

// ════════════════════════════════════════════════════════════════
//  LOAD SITE CONFIG FROM FIRESTORE
// ════════════════════════════════════════════════════════════════
async function loadSiteConfig() {
  try {
    const [companySnap, heroSnap, servicesSnap, contactSnap, themeSnap, announcementsSnap, chatbotSnap, whyUsSnap, testimonialsSnap] =
      await Promise.all([
        getDoc(doc(db, 'siteConfig', 'companyInfo')),
        getDoc(doc(db, 'siteConfig', 'hero')),
        getDoc(doc(db, 'siteConfig', 'services')),
        getDoc(doc(db, 'siteConfig', 'contact')),
        getDoc(doc(db, 'siteConfig', 'theme')),
        getDoc(doc(db, 'siteConfig', 'announcements')),
        getDoc(doc(db, 'siteConfig', 'chatbot')),
        getDoc(doc(db, 'siteConfig', 'whyUs')),
        getDoc(doc(db, 'siteConfig', 'testimonials')),
      ]);

    if (companySnap.exists()) applyCompanyInfo(companySnap.data());
    if (heroSnap.exists())    applyHero(heroSnap.data());
    if (servicesSnap.exists()) applyServices(servicesSnap.data());
    if (contactSnap.exists())  applyContact(contactSnap.data());
    if (themeSnap.exists())    applyTheme(themeSnap.data());
    if (announcementsSnap.exists()) applyAnnouncements(announcementsSnap.data());
    if (whyUsSnap.exists())    applyWhyUs(whyUsSnap.data());
    if (testimonialsSnap.exists()) applyTestimonials(testimonialsSnap.data());
    if (chatbotSnap.exists())  initChatbotWidget(chatbotSnap.data());
    else initChatbotWidget({});
  } catch (e) {
    // Firebase not configured yet — run with static content
    console.info('Firebase not configured. Running with static content.', e.message);
    initChatbotWidget({});
  }
}

// ─── Company Info ────────────────────────────────────────────
function applyCompanyInfo(d) {
  setAll('.company-name', d.name);
  setAll('.company-tagline', d.tagline);
  setAll('.company-phone', d.phone);
  setAll('.company-email', d.email);
  setAll('.company-address', d.address);
  setAll('.company-hours', d.hours);
  // Stats
  if (d.statProjects) updateCounter('stat-projects-val', d.statProjects);
  if (d.statClients)  updateCounter('stat-clients-val', d.statClients);
  if (d.statYears)    updateCounter('stat-years-val', d.statYears);
  if (d.statProducts) updateCounter('stat-products-val', d.statProducts);
  // About description
  const aboutDesc = document.querySelectorAll('.about-desc-dynamic');
  if (d.about && aboutDesc.length) aboutDesc.forEach(el => el.textContent = d.about);
}

// ─── Hero ────────────────────────────────────────────────────
function applyHero(d) {
  const t1 = document.getElementById('hero-title-line1');
  const t2 = document.getElementById('hero-title-line2');
  const sub = document.getElementById('hero-subtitle-text');
  const btn1 = document.getElementById('hero-explore-btn');
  const btn2 = document.getElementById('hero-contact-btn');
  const badge = document.getElementById('hero-badge-text');
  const bgImg = document.querySelector('.hero-img');

  if (t1 && d.title1)   t1.textContent = d.title1;
  if (t2 && d.title2)   t2.textContent = d.title2;
  if (sub && d.subtitle) sub.textContent = d.subtitle;
  if (btn1 && d.btn1Text) btn1.textContent = d.btn1Text;
  if (btn2 && d.btn2Text) btn2.textContent = d.btn2Text;
  if (badge && d.badge)   badge.textContent = d.badge;
  if (bgImg && d.bgImage) bgImg.src = d.bgImage;
}

// ─── Services ────────────────────────────────────────────────
function applyServices(d) {
  if (!d.items) return;
  d.items.forEach(svc => {
    const titleEl = document.getElementById(`svc-frontend-title-${svc.key}`);
    const descEl  = document.getElementById(`svc-frontend-desc-${svc.key}`);
    if (titleEl && svc.title) titleEl.textContent = svc.title;
    if (descEl  && svc.desc)  descEl.textContent  = svc.desc;
  });
}

// ─── Contact ─────────────────────────────────────────────────
function applyContact(d) {
  setAll('.contact-phone-val', d.phone);
  setAll('.contact-email-val', d.email);
  setAll('.contact-address-val', d.address);
  setAll('.contact-hours-val', d.hours);

  // Social links
  const linkMap = {
    facebook:  d.social?.facebook,
    linkedin:  d.social?.linkedin,
    instagram: d.social?.instagram,
  };
  Object.entries(linkMap).forEach(([key, url]) => {
    if (url) {
      document.querySelectorAll(`[id*="social-${key}"], [id*="footer-${key.slice(0,2)}"]`).forEach(a => { a.href = url; });
    }
  });
}

// ─── Theme ───────────────────────────────────────────────────
function applyTheme(d) {
  const root = document.documentElement;
  if (d.primaryColor) {
    root.style.setProperty('--color-primary', d.primaryColor);
    root.style.setProperty('--color-primary-dark', adjustColor(d.primaryColor, -20));
  }
  if (d.accentColor) {
    root.style.setProperty('--color-accent', d.accentColor);
  }
  if (d.headerBg) {
    root.style.setProperty('--header-bg', d.headerBg);
  }
  if (d.font) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${d.font.replace(' ', '+')}:wght@300;400;500;600;700;800&display=swap`;
    document.head.appendChild(link);
    document.body.style.fontFamily = `'${d.font}', sans-serif`;
  }

  if (d.logoUrl) {
    document.querySelectorAll('#logo-link .logo-icon, #footer-logo-link .logo-icon').forEach(el => {
      el.innerHTML = `<img src="${d.logoUrl}" alt="Stonex Logo" style="height:100%; width:100%; object-fit:contain;" />`;
    });
  }

  // Toggles
  if (d.toggles) {
    document.documentElement.classList.toggle('theme-light', true);

    const topbar = document.getElementById('topbar');
    const ticker = document.querySelector('.ticker-wrap');
    const heroStats = document.querySelector('.hero-stats');
    const process = document.getElementById('process');

    if (topbar  && d.toggles.topbar  === false) topbar.style.display  = 'none';
    if (ticker  && d.toggles.ticker  === false) ticker.style.display  = 'none';
    if (heroStats && d.toggles.stats === false) heroStats.style.display = 'none';
    if (process && d.toggles.process === false) process.style.display = 'none';
  }
}

// ─── Announcements ───────────────────────────────────────────
function applyAnnouncements(d) {
  if (!d.items || !d.items.length) return;
  const tickerInner = document.querySelector('.ticker-items');
  if (!tickerInner) return;
  const html = d.items.map(t => `<span>${t}</span>`).join('');
  document.querySelectorAll('.ticker-items').forEach(el => el.innerHTML = html);
}

// ─── Why Choose Us (Your Trusted Industrial Partner) ─────────
function applyWhyUs(d) {
  if (!d) return;

  const lbl = document.getElementById('why-us-label');
  if (lbl && d.label) lbl.textContent = d.label;

  const title = document.getElementById('why-us-title');
  if (title && d.title) title.textContent = d.title;

  const desc = document.getElementById('why-us-desc');
  if (desc && d.desc) desc.textContent = d.desc;

  // Apply cards
  for (let i = 1; i <= 6; i++) {
    const card = document.getElementById(`why-card-${i}`);
    if (card) {
      const cardTitle = card.querySelector('h3');
      const cardDesc = card.querySelector('p');
      const cardIconWrap = card.querySelector('.why-icon');

      if (cardTitle && d[`card${i}_title`]) cardTitle.textContent = d[`card${i}_title`];
      if (cardDesc && d[`card${i}_desc`]) cardDesc.textContent = d[`card${i}_desc`];

      if (cardIconWrap && d[`card${i}_icon`]) {
        const iconVal = d[`card${i}_icon`].trim();
        if (iconVal) {
          cardIconWrap.innerHTML = `<span style="font-size: 32px; line-height: 1; display: block;">${iconVal}</span>`;
        }
      }
    }
  }

  // Inject custom CSS based on section configuration variables
  const styleData = d.style || {};
  let css = '';

  if (styleData.bg_color) {
    css += `#why-us { background: ${styleData.bg_color} !important; }`;
  }
  if (styleData.bg_gradient && styleData.bg_gradient !== 'none') {
    css += `#why-us { background: ${styleData.bg_gradient} !important; }`;
  }

  // Label Custom styles
  let labelCss = '';
  if (styleData.label_color) labelCss += `color: ${styleData.label_color} !important;`;
  if (styleData.label_size) labelCss += `font-size: ${styleData.label_size} !important;`;
  if (styleData.label_weight) labelCss += `font-weight: ${styleData.label_weight} !important;`;
  if (styleData.label_transform) labelCss += `text-transform: ${styleData.label_transform} !important;`;
  if (styleData.label_decoration) labelCss += `text-decoration: ${styleData.label_decoration} !important;`;
  if (styleData.label_spacing) labelCss += `letter-spacing: ${styleData.label_spacing} !important;`;
  if (labelCss) css += `#why-us .section-label { ${labelCss} }`;

  // Title Custom styles
  let titleCss = '';
  if (styleData.title_color) titleCss += `color: ${styleData.title_color} !important;`;
  if (styleData.title_size) titleCss += `font-size: ${styleData.title_size} !important;`;
  if (styleData.title_weight) titleCss += `font-weight: ${styleData.title_weight} !important;`;
  if (styleData.title_transform) titleCss += `text-transform: ${styleData.title_transform} !important;`;
  if (styleData.title_decoration) titleCss += `text-decoration: ${styleData.title_decoration} !important;`;
  if (styleData.title_spacing) titleCss += `letter-spacing: ${styleData.title_spacing} !important;`;
  if (titleCss) css += `#why-us .section-title { ${titleCss} }`;

  // Description Custom styles
  let descCss = '';
  if (styleData.desc_color) descCss += `color: ${styleData.desc_color} !important;`;
  if (styleData.desc_size) descCss += `font-size: ${styleData.desc_size} !important;`;
  if (styleData.desc_weight) descCss += `font-weight: ${styleData.desc_weight} !important;`;
  if (descCss) css += `#why-us .section-desc { ${descCss} }`;

  // Card styles
  let cardCss = '';
  if (styleData.card_bg) cardCss += `background: ${styleData.card_bg} !important;`;
  if (styleData.card_border) cardCss += `border-color: ${styleData.card_border} !important;`;
  if (cardCss) css += `#why-us .why-card { ${cardCss} }`;

  let cardTitleCss = '';
  if (styleData.card_title_color) cardTitleCss += `color: ${styleData.card_title_color} !important;`;
  if (cardTitleCss) css += `#why-us .why-card h3 { ${cardTitleCss} }`;

  let cardDescCss = '';
  if (styleData.card_desc_color) cardDescCss += `color: ${styleData.card_desc_color} !important;`;
  if (cardDescCss) css += `#why-us .why-card p { ${cardDescCss} }`;

  // Append style block to page
  let styleEl = document.getElementById('why-us-dynamic-styles');
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'why-us-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  styleEl.innerHTML = css;
}

// ─── Helpers ─────────────────────────────────────────────────
function setAll(selector, value) {
  if (!value) return;
  document.querySelectorAll(selector).forEach(el => el.textContent = value);
  // Also update href for emails/phones
  document.querySelectorAll(`a${selector}`).forEach(a => {
    if (a.href.startsWith('mailto:')) a.href = `mailto:${value}`;
    else if (a.href.startsWith('tel:')) a.href = `tel:${value.replace(/\s/g,'')}`;
  });
}

function updateCounter(id, target) {
  const el = document.getElementById(id);
  if (el) el.setAttribute('data-count', target);
}

function adjustColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amount));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amount));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

// ════════════════════════════════════════════════════════════════
//  STATIC UI LOGIC (runs regardless of Firebase)
// ════════════════════════════════════════════════════════════════

// ─── Navbar scroll ───────────────────────────────────────────
const header = document.getElementById('site-header');
window.addEventListener('scroll', () => {
  if (header) header.classList.toggle('scrolled', window.scrollY > 80);
}, { passive: true });

// ─── Mobile hamburger ────────────────────────────────────────
const hamburger  = document.getElementById('hamburger-btn');
const mobileMenu = document.getElementById('mobile-menu');
if (hamburger && mobileMenu) {
  hamburger.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    hamburger.classList.toggle('open', open);
    hamburger.setAttribute('aria-expanded', open);
    mobileMenu.setAttribute('aria-hidden', !open);
  });
  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.classList.remove('open');
    });
  });
}

// ─── Product Tabs ────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${tab}`));
  });
});

// ─── Smooth scroll for nav links ─────────────────────────────
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const offset = header ? header.offsetHeight : 0;
      window.scrollTo({ top: target.offsetTop - offset - 8, behavior: 'smooth' });
    }
  });
});

// ─── Active nav highlight ────────────────────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => observer.observe(s));

// ─── Counter animation ───────────────────────────────────────
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target = parseInt(el.dataset.count || el.textContent, 10);
    if (isNaN(target)) return;
    let start = 0;
    const duration = 2000;
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target).toLocaleString();
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  });
}
const heroSection = document.getElementById('home');
if (heroSection) {
  const heroObs = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { animateCounters(); heroObs.disconnect(); }
  }, { threshold: 0.3 });
  heroObs.observe(heroSection);
}

// ─── Back to top ─────────────────────────────────────────────
const bttBtn = document.getElementById('back-to-top-btn');
window.addEventListener('scroll', () => {
  if (bttBtn) bttBtn.classList.toggle('visible', window.scrollY > 500);
}, { passive: true });
if (bttBtn) bttBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

// ─── Apply Testimonials ──────────────────────────────────────
function applyTestimonials(d) {
  const labelEl = document.getElementById('testimonials-label');
  const titleEl = document.getElementById('testimonials-title');
  const descEl = document.getElementById('testimonials-desc');

  if (labelEl && d.label) labelEl.textContent = d.label;
  if (titleEl && d.title) titleEl.textContent = d.title;
  if (descEl && d.desc) descEl.textContent = d.desc;

  for (let i = 1; i <= 4; i++) {
    const slide = document.querySelector(`.testimonial-slide[data-index="${i-1}"]`);
    if (!slide) continue;

    const name = d[`testi${i}_name`] || '';
    const role = d[`testi${i}_role`] || '';
    const quote = d[`testi${i}_quote`] || '';
    const starsVal = d[`testi${i}_stars`] !== undefined ? Number(d[`testi${i}_stars`]) : 5;

    const nameEl = slide.querySelector('.author-name');
    if (nameEl && name) nameEl.textContent = name;

    const roleEl = slide.querySelector('.author-role');
    if (roleEl && role) roleEl.textContent = role;

    const textEl = slide.querySelector('.testimonial-text');
    if (textEl && quote) {
      const formattedQuote = quote.startsWith('"') && quote.endsWith('"') ? quote : `"${quote}"`;
      textEl.textContent = formattedQuote;
    }

    const avatarEl = slide.querySelector('.author-avatar');
    if (avatarEl && name) {
      const parts = name.split(' ');
      const initials = parts.map(p => p[0] || '').join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials;
    }

    const starsContainer = slide.querySelector('.testimonial-stars');
    if (starsContainer) {
      let starHtml = '';
      for (let s = 0; s < starsVal; s++) {
        starHtml += `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      for (let s = starsVal; s < 5; s++) {
        starHtml += `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      }
      starsContainer.innerHTML = starHtml;
    }
  }
}

// ─── Contact form & Quote request form ───────────────────────
const contactForm = document.getElementById('contact-form');
const formSuccess = document.getElementById('form-success');
if (contactForm) {
  contactForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('contact-submit-btn');
    if (btn) { btn.innerHTML = '<span class="btn-text">Sending…</span>'; btn.disabled = true; }

    const name = document.getElementById('contact-name')?.value.trim() || '';
    const company = document.getElementById('contact-company')?.value.trim() || '';
    const email = document.getElementById('contact-email-input')?.value.trim() || '';
    const phone = document.getElementById('contact-phone-input')?.value.trim() || '';
    const service = document.getElementById('contact-service')?.value || '';
    const message = document.getElementById('contact-message')?.value.trim() || '';

    if (!name || !email || !phone || !service || !message) {
      alert('Please fill in all required fields (Name, Email, Phone/Mobile, Service, and Message).');
      if (btn) { btn.innerHTML = '<span class="btn-text">Send Message</span> <span class="btn-icon">→</span>'; btn.disabled = false; }
      return;
    }

    try {
      // Save contact submission directly to chatbotLeads collection so it appears on the admin panel
      await addDoc(collection(db, 'chatbotLeads'), {
        name: name,
        contact: phone, // Capturing mobile number
        email: email, // Capturing email ID
        address: company ? `Company: ${company}` : 'Website General Contact Form',
        message: `Service: ${service}. Message: ${message}`,
        submittedAt: serverTimestamp(),
        status: 'New'
      });

      contactForm.style.display = 'none';
      if (formSuccess) formSuccess.hidden = false;
    } catch (err) {
      console.error('Error saving contact message:', err);
      alert('An error occurred while sending your message. Please try again.');
      if (btn) { btn.innerHTML = '<span class="btn-text">Send Message</span> <span class="btn-icon">→</span>'; btn.disabled = false; }
    }
  });
}

const quoteForm = document.getElementById('quote-request-form');
if (quoteForm) {
  quoteForm.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = quoteForm.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Submit Quote Request';
    if (btn) { btn.textContent = 'Submitting...'; btn.disabled = true; }

    const name = document.getElementById('quote-name')?.value.trim() || '';
    const phone = document.getElementById('quote-phone')?.value.trim() || '';
    const email = document.getElementById('quote-email')?.value.trim() || '';
    const service = document.getElementById('quote-service')?.value || '';
    const address = document.getElementById('quote-address')?.value.trim() || '';
    const message = document.getElementById('quote-message')?.value.trim() || '';

    if (!name || !phone || !email || !service || !address) {
      alert('Please fill in all required fields.');
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
      return;
    }

    try {
      // Save quotation request to chatbotLeads so it displays in admin leads dashboard
      await addDoc(collection(db, 'chatbotLeads'), {
        name: name,
        contact: phone, // Capturing mobile number
        email: email, // Capturing email ID
        address: `Delivery address: ${address}`,
        message: `Quotation Request - Category: ${service}. Specifications: ${message || 'None provided'}`,
        submittedAt: serverTimestamp(),
        status: 'New'
      });

      alert('Thank you! Your quotation request has been sent successfully. Our Sales engineering department will review it and get back to you within 24 hours.');
      quoteForm.reset();
    } catch (err) {
      console.error('Error saving quotation request:', err);
      alert('An error occurred while submitting your quotation. Please try again.');
    } finally {
      if (btn) { btn.textContent = originalText; btn.disabled = false; }
    }
  });
}

// ─── Scroll-reveal animations ────────────────────────────────
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.1 });
document.querySelectorAll('.service-card, .why-card, .process-step, .about-feature, .product-card, .stat-card-item').forEach(el => {
  el.classList.add('reveal-on-scroll');
  revealObserver.observe(el);
});

// ─── Init Firebase content load ──────────────────────────────
loadSiteConfig().then(() => {
  fetchDbProductsForSearch();
});
initHeroSlider();
initTestimonialCarousel();
initGlobalSearch();
handleIncomingSearchRoute();

// ─── Hero Slider & Parallax Logic ────────────────────────────
function initHeroSlider() {
  const sliderImgs = document.querySelectorAll('#hero-slider .hero-img');
  const sliderDots = document.querySelectorAll('#hero-slider-dots .slider-dot');
  let currentSlide = 0;
  let slideInterval;

  if (sliderImgs.length === 0) return;

  function showSlide(index) {
    sliderImgs.forEach((img, i) => {
      img.classList.toggle('active', i === index);
    });
    sliderDots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    let next = (currentSlide + 1) % sliderImgs.length;
    showSlide(next);
  }

  function startAutoplay() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 6000); // Rotate every 6 seconds
  }

  // Click on dots
  sliderDots.forEach(dot => {
    dot.addEventListener('click', () => {
      const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
      showSlide(slideIndex);
      startAutoplay(); // Reset interval on click
    });
  });

  // Scroll Parallax effect
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const sliderContainer = document.getElementById('hero-slider');
    if (sliderContainer && scrollY < window.innerHeight) {
      // Shift background slightly slower to produce premium parallax depth
      sliderContainer.style.transform = `translateY(${scrollY * 0.4}px)`;
    }
  }, { passive: true });

  startAutoplay();
}

// ─── Testimonial Carousel Logic ──────────────────────────────
function initTestimonialCarousel() {
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.testimonial-dot');
  const prevBtn = document.getElementById('testimonial-prev-btn');
  const nextBtn = document.getElementById('testimonial-next-btn');
  let currentSlide = 0;
  let slideInterval;

  if (slides.length === 0) return;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    let next = (currentSlide + 1) % slides.length;
    showSlide(next);
  }

  function prevSlide() {
    let prev = (currentSlide - 1 + slides.length) % slides.length;
    showSlide(prev);
  }

  function startAutoplay() {
    clearInterval(slideInterval);
    slideInterval = setInterval(nextSlide, 5000); // Rotate every 5 seconds
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      prevSlide();
      startAutoplay();
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      nextSlide();
      startAutoplay();
    });
  }

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const slideIndex = parseInt(dot.getAttribute('data-slide'), 10);
      showSlide(slideIndex);
      startAutoplay();
    });
  });

  startAutoplay();
}

// ─── Chatbot Sound Player ──────────────────────────────────
function playChatbotSound(type) {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    if (type === 'activate') {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 upward arpeggio
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.08);
        gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + index * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.2);

        osc.start(ctx.currentTime + index * 0.08);
        osc.stop(ctx.currentTime + index * 0.08 + 0.25);
      });
    } else if (type === 'message') {
      const notes = [880, 1174.66]; // A5 and D6 double-ping
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);

        gain.gain.setValueAtTime(0, ctx.currentTime + index * 0.1);
        gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + index * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.18);

        osc.start(ctx.currentTime + index * 0.1);
        osc.stop(ctx.currentTime + index * 0.1 + 0.22);
      });
    }
  } catch (e) {
    console.warn('Web Audio playback failed:', e);
  }
}

// ─── AI Chatbot Widget Logic ──────────────────────────────
function initChatbotWidget(data) {
  const isEnabled = data.active !== false; // Active by default or if true
  const triggerBtn = document.getElementById('chatbot-trigger-btn');
  const chatbotWidget = document.getElementById('ai-chatbot-widget');
  const closeBtn = document.getElementById('chatbot-close-btn');
  const titleEl = document.getElementById('chatbot-widget-title');
  const messagesContainer = document.getElementById('chatbot-messages');
  const inputForm = document.getElementById('chatbot-input-form');
  const inputField = document.getElementById('chatbot-input-field');

  if (!triggerBtn || !chatbotWidget) return;

  // If chatbot is disabled, hide the trigger button
  if (!isEnabled) {
    triggerBtn.style.display = 'none';
    chatbotWidget.style.display = 'none';
    return;
  }

  // Set values from config
  const chatbotName = data.name || 'Stonex Assistant';
  const welcomeMsg = data.welcome || 'Hello! Welcome to Stonex Industrial. Please enter your message below, and we will get back to you with a direct quote.';

  if (titleEl) titleEl.textContent = chatbotName;

  if (data.color) {
    const header = chatbotWidget.querySelector('.chatbot-header');
    if (header) header.style.background = data.color;
    triggerBtn.style.background = data.color;
    triggerBtn.style.boxShadow = `0 8px 32px ${data.color}66`;
  }

  // Populate first welcome message if empty
  if (messagesContainer && messagesContainer.children.length === 0) {
    appendMessage('ai', welcomeMsg);
  }

  // Toggle Widget Visibility
  triggerBtn.addEventListener('click', () => {
    const isHidden = chatbotWidget.classList.contains('ai-chatbot-hidden');
    if (isHidden) {
      chatbotWidget.classList.remove('ai-chatbot-hidden');
      triggerBtn.querySelector('.trigger-open-icon').classList.add('chatbot-hidden');
      triggerBtn.querySelector('.trigger-close-icon').classList.remove('chatbot-hidden');
      if (inputField) inputField.focus();
      playChatbotSound('activate');
    } else {
      chatbotWidget.classList.add('ai-chatbot-hidden');
      triggerBtn.querySelector('.trigger-open-icon').classList.remove('chatbot-hidden');
      triggerBtn.querySelector('.trigger-close-icon').classList.add('chatbot-hidden');
    }
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      chatbotWidget.classList.add('ai-chatbot-hidden');
      triggerBtn.querySelector('.trigger-open-icon').classList.remove('chatbot-hidden');
      triggerBtn.querySelector('.trigger-close-icon').classList.add('chatbot-hidden');
    });
  }

  // Handle send message form
  if (inputForm) {
    inputForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = inputField.value.trim();
      if (!text) return;

      inputField.value = '';
      appendMessage('user', text);

      // Show typing indicator
      const typingIndicator = showTypingIndicator();

      setTimeout(() => {
        removeTypingIndicator(typingIndicator);
        appendContactFormMessage(text);
      }, 600);
    });
  }

  // --- Chatbot Lead Form Interactive Logic ---
  const leadFormToggle = document.getElementById('chatbot-lead-form-toggle');
  const leadForm = document.getElementById('chatbot-lead-form');
  const leadArrow = document.getElementById('lead-form-arrow');

  if (leadFormToggle && leadForm && leadArrow) {
    // Start collapsed/closed
    leadForm.classList.add('closed');
    
    leadFormToggle.addEventListener('click', () => {
      const isClosed = leadForm.classList.contains('closed');
      if (isClosed) {
        leadForm.classList.remove('closed');
        leadArrow.classList.add('open');
      } else {
        leadForm.classList.add('closed');
        leadArrow.classList.remove('open');
      }
    });

    leadForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('lead-name')?.value || '';
      const contact = document.getElementById('lead-contact')?.value || '';
      const address = document.getElementById('lead-address')?.value || '';

      if (!name || !contact || !address) return;

      // Submit to Firestore
      try {
        const submitBtn = leadForm.querySelector('.btn-lead-submit');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }

        await addDoc(collection(db, 'chatbotLeads'), {
          name,
          contact,
          address,
          submittedAt: serverTimestamp(),
          status: 'New'
        });

        // Show thank you message in chat
        appendMessage('ai', `Thank you, ${name}! Your contact details (Phone: ${contact}, Address: ${address}) have been recorded. Our industrial sales team will contact you shortly.`);

        // Clear and collapse form
        leadForm.reset();
        leadForm.classList.add('closed');
        leadArrow.classList.remove('open');

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Details';
        }
      } catch (err) {
        console.error('Error saving lead: ', err);
        appendMessage('ai', "I encountered an error saving your contact details. Please try again.");
        const submitBtn = leadForm.querySelector('.btn-lead-submit');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit Details';
        }
      }
    });
  }

  function appendMessage(sender, text) {
    if (!messagesContainer) return;
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg chat-msg-${sender}`;
    msgEl.textContent = text;
    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    if (sender === 'ai' && !chatbotWidget.classList.contains('ai-chatbot-hidden')) {
      playChatbotSound('message');
    }
  }

  function appendContactFormMessage(userMessageText) {
    if (!messagesContainer) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'chat-msg chat-msg-ai';
    msgEl.style.width = '100%';
    msgEl.style.maxWidth = '100%';
    msgEl.style.background = 'var(--surface)';
    msgEl.style.border = '1px solid var(--border)';
    msgEl.style.borderRadius = 'var(--radius)';
    msgEl.style.padding = '16px';
    msgEl.style.margin = '10px 0';
    msgEl.style.color = '#fff';
    
    const formId = `chat-inline-form-${Date.now()}`;

    const btnColor = data.color || 'var(--color-primary)';

    msgEl.innerHTML = `
      <div style="font-size: 13px; line-height: 1.5; margin-bottom: 12px; font-weight: 500; color: #fff;">
        Thank you! Please submit your contact details below, and our sales representative will get back to you with a direct quote.
      </div>
      <form id="${formId}" style="display: flex; flex-direction: column; gap: 10px;">
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">Full Name *</label>
          <input type="text" class="form-name" placeholder="Enter your name" required style="width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--dark); color: #fff; font-size: 13px; outline: none; transition: border-color 0.2s;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">Phone Number *</label>
          <input type="tel" class="form-phone" placeholder="+966 5X XXX XXXX" required style="width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--dark); color: #fff; font-size: 13px; outline: none; transition: border-color 0.2s;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">Email Address</label>
          <input type="email" class="form-email" placeholder="name@company.com" style="width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--dark); color: #fff; font-size: 13px; outline: none; transition: border-color 0.2s;" />
        </div>
        <div>
          <label style="display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 4px;">Project Details / Message</label>
          <textarea class="form-message" rows="2" required style="width: 100%; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: var(--dark); color: #fff; font-size: 13px; outline: none; resize: vertical; transition: border-color 0.2s;">${userMessageText}</textarea>
        </div>
        <button type="submit" class="btn-submit-inline" style="background: ${btnColor}; color: #fff; border: none; padding: 10px; border-radius: var(--radius-sm); font-weight: 700; font-size: 13px; cursor: pointer; transition: background 0.2s; margin-top: 4px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          Send Contact Details
        </button>
      </form>
    `;

    messagesContainer.appendChild(msgEl);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (!chatbotWidget.classList.contains('ai-chatbot-hidden')) {
      playChatbotSound('message');
    }

    // Attach event listener
    const formEl = document.getElementById(formId);
    if (formEl) {
      const nameInput = formEl.querySelector('.form-name');
      if (nameInput) nameInput.focus();

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = formEl.querySelector('.form-name').value.trim();
        const phone = formEl.querySelector('.form-phone').value.trim();
        const email = formEl.querySelector('.form-email').value.trim();
        const message = formEl.querySelector('.form-message').value.trim();
        const submitBtn = formEl.querySelector('.btn-submit-inline');

        if (!name || !phone || !message) return;

        try {
          if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
          }

          // Save to Firestore 'chatbotLeads' collection
          await addDoc(collection(db, 'chatbotLeads'), {
            name,
            contact: phone,
            email: email || '',
            address: 'Submitted via Chat message form',
            message: message,
            submittedAt: serverTimestamp(),
            status: 'New'
          });

          // Show Success state in the bubble
          msgEl.innerHTML = `
            <div style="text-align: center; padding: 10px 0;">
              <div style="font-size: 32px; margin-bottom: 12px;">✅</div>
              <h5 style="font-family: 'Space Grotesk', sans-serif; font-size: 16px; font-weight: 700; color: #fff; margin-bottom: 6px;">Details Submitted!</h5>
              <p style="font-size: 13px; color: var(--text-muted); line-height: 1.4; margin-bottom: 0;">
                Thank you, <strong>${name}</strong>. Our team has received your request and will call you at <strong>${phone}</strong> shortly.
              </p>
            </div>
          `;
          messagesContainer.scrollTop = messagesContainer.scrollHeight;

        } catch (error) {
          console.error('Error saving lead from chat:', error);
          alert('Failed to submit details. Please check your internet connection and try again.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Contact Details';
          }
        }
      });
    }
  }

  function showTypingIndicator() {
    if (!messagesContainer) return null;
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    messagesContainer.appendChild(indicator);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    return indicator;
  }

  function removeTypingIndicator(indicator) {
    if (indicator && indicator.parentNode) {
      indicator.parentNode.removeChild(indicator);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  GLOBAL NAVIGATION SEARCH ENGINE
// ════════════════════════════════════════════════════════════════

const SEARCH_DATA = [
  // Services
  { title: "Industrial Trading", category: "Services", type: "service", url: "services.html#service-trading", desc: "Sourcing & supply of high-grade industrial items" },
  { title: "Heavy Equipment Rentals", category: "Services", type: "service", url: "services.html#service-equipment", desc: "Fleet of modern cranes, excavators, forklifts & more" },
  { title: "Civil Material Supply", category: "Services", type: "service", url: "services.html#service-civil", desc: "Top-quality cement, rebar, blocks & materials" },
  { title: "Personal Protective Equipment", category: "Services", type: "service", url: "services.html#service-ppe", desc: "Comprehensive head-to-toe safety gear" },

  // Products - Civil (tab-civil)
  { title: "Cement & Binders", category: "Products", type: "product", url: "products.html?tab=civil#prod-cement", desc: "OPC, PPC, and specialty cement grades" },
  { title: "Steel Rebar & TMT", category: "Products", type: "product", url: "products.html?tab=civil#prod-rebar", desc: "Grade 500D, 550D rebar in all sizes" },
  { title: "Blocks & Bricks", category: "Products", type: "product", url: "products.html?tab=civil#prod-blocks", desc: "Hollow blocks, solid concrete blocks, bricks" },

  // Products - Mechanical (tab-mechanical)
  { title: "Industrial Pumps", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-pumps", desc: "Centrifugal, submersible, booster pumps" },
  { title: "Valves & Fittings", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-valves", desc: "Ball, gate, check valves, flanges" },
  { title: "Bearings & Seals", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-bearings", desc: "SKF, FAG, NSK bearings in all types" },
  { title: "Fasteners & Hardware", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-fasteners", desc: "Bolts, nuts, anchors, threaded rods" },
  { title: "Hand & Power Tools", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-tools", desc: "Professional grade tools for all trades" },
  { title: "Hoses & Couplings", category: "Products", type: "product", url: "products.html?tab=mechanical#prod-hoses", desc: "Hydraulic, pneumatic, water hoses" },

  // Products - Electrical (tab-electrical)
  { title: "Cables & Wires", category: "Products", type: "product", url: "products.html?tab=electrical#prod-cables", desc: "Power, control, instrumentation cables" },
  { title: "Switchgear & Panels", category: "Products", type: "product", url: "products.html?tab=electrical#prod-switchgear", desc: "MCBs, MCCBs, ACBs, distribution boards" },
  { title: "Electric Motors", category: "Products", type: "product", url: "products.html?tab=electrical#prod-motors", desc: "IE3, ATEX, VFD-compatible motors" },
  { title: "Industrial Lighting", category: "Products", type: "product", url: "products.html?tab=electrical#prod-lighting", desc: "LED, explosion-proof, floodlights" },
  { title: "Conduit & Trunking", category: "Products", type: "product", url: "products.html?tab=electrical#prod-conduit", desc: "GI, PVC, flexible conduit systems" },
  { title: "Instrumentation", category: "Products", type: "product", url: "products.html?tab=electrical#prod-instrumentation", desc: "Sensors, transmitters, gauges" },

  // Products - PPE (tab-ppe)
  { title: "Safety Helmets", category: "Products", type: "product", url: "products.html?tab=ppe#prod-helmets", desc: "Class A, B, C rated hard hats" },
  { title: "Hi-Vis Clothing", category: "Products", type: "product", url: "products.html?tab=ppe#prod-vests", desc: "Class 2 & 3 reflective vests, coveralls" },
  { title: "Safety Gloves", category: "Products", type: "product", url: "products.html?tab=ppe#prod-gloves", desc: "Cut-resistant, chemical, welding gloves" },
  { title: "Eye & Face Protection", category: "Products", type: "product", url: "products.html?tab=ppe#prod-eyewear", desc: "Goggles, face shields, welding visors" },
  { title: "Safety Footwear", category: "Products", type: "product", url: "products.html?tab=ppe#prod-footwear", desc: "Steel toe, composite, chemical-resistant" },
  { title: "Fall Protection", category: "Products", type: "product", url: "products.html?tab=ppe#prod-fall", desc: "Harnesses, lanyards, anchor systems" },

  // Products - Equipment (tab-equipment)
  { title: "Excavators", category: "Products", type: "product", url: "products.html?tab=equipment#prod-excavator", desc: "Mini to large class, tracked & wheeled" },
  { title: "Mobile Cranes", category: "Products", type: "product", url: "products.html?tab=equipment#prod-crane", desc: "15T–200T capacity range" },
  { title: "Forklifts", category: "Products", type: "product", url: "products.html?tab=equipment#prod-forklift", desc: "Electric, diesel, 3T–20T capacity" },
  { title: "Compactors", category: "Products", type: "product", url: "products.html?tab=equipment#prod-compactor", desc: "Plate, rammer, and road rollers" },
  { title: "Generators", category: "Products", type: "product", url: "products.html?tab=equipment#prod-generator", desc: "20kVA–2000kVA, silenced sets" },
  { title: "Welding Machines", category: "Products", type: "product", url: "products.html?tab=equipment#prod-welder", desc: "Diesel and electric multi-process welders" }
];

// Fetch custom Firestore products to index them in global search
async function fetchDbProductsForSearch() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    snap.docs.forEach(docSnap => {
      const data = docSnap.data();
      if (data.name) {
        SEARCH_DATA.push({
          title: data.name,
          category: "Products",
          type: "product",
          url: `products.html?tab=${data.category || 'all'}#prod-db-${docSnap.id}`,
          desc: data.desc || `Category: ${data.category || 'General'}`
        });
      }
    });
  } catch (e) {
    console.info("Firestore products not available or empty for search index.");
  }
}

// Wire up navbar search dropdowns and forms (desktop + mobile)
function initGlobalSearch() {
  const desktopInput = document.getElementById('nav-search-input-desktop');
  const desktopSuggestions = document.getElementById('nav-search-suggestions-desktop');
  const mobileInput = document.getElementById('nav-search-input-mobile');
  const mobileSuggestions = document.getElementById('nav-search-suggestions-mobile');

  function handleSearchInput(inputEl, suggestionsEl) {
    if (!inputEl || !suggestionsEl) return;

    inputEl.addEventListener('input', () => {
      const q = inputEl.value.trim().toLowerCase();
      if (!q) {
        suggestionsEl.hidden = true;
        suggestionsEl.innerHTML = '';
        return;
      }

      // Filter local search index
      const results = SEARCH_DATA.filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.desc.toLowerCase().includes(q)
      ).slice(0, 5);

      if (results.length === 0) {
        suggestionsEl.innerHTML = `<div class="suggestion-no-results">No results found for "${escapeHtml(q)}"</div>`;
        suggestionsEl.hidden = false;
        return;
      }

      let html = '';
      results.forEach(item => {
        const titleHighlighted = highlightMatch(item.title, q);
        const descHighlighted = highlightMatch(item.desc, q);
        const badgeClass = item.type === 'product' ? 'suggestion-badge-product' : 'suggestion-badge-service';

        html += `
          <div class="suggestion-item" data-url="${item.url}">
            <div class="suggestion-info">
              <span class="suggestion-title">${titleHighlighted}</span>
              <span class="suggestion-desc">${descHighlighted}</span>
            </div>
            <span class="suggestion-badge ${badgeClass}">${item.category}</span>
          </div>
        `;
      });

      suggestionsEl.innerHTML = html;
      suggestionsEl.hidden = false;

      // Click callback
      suggestionsEl.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('click', () => {
          const url = el.getAttribute('data-url');
          if (url) {
            window.location.href = url;
            suggestionsEl.hidden = true;
            inputEl.value = '';
          }
        });
      });
    });

    // Outer clicks hide suggestions
    document.addEventListener('click', (e) => {
      if (!inputEl.contains(e.target) && !suggestionsEl.contains(e.target)) {
        suggestionsEl.hidden = true;
      }
    });
  }

  handleSearchInput(desktopInput, desktopSuggestions);
  handleSearchInput(mobileInput, mobileSuggestions);

  // Forms redirect to products with query
  const desktopForm = document.getElementById('nav-search-form-desktop');
  if (desktopForm) {
    desktopForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = desktopInput.value.trim();
      if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
    });
  }

  const mobileForm = document.getElementById('nav-search-form-mobile');
  if (mobileForm) {
    mobileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const q = mobileInput.value.trim();
      if (q) window.location.href = `products.html?search=${encodeURIComponent(q)}`;
    });
  }
}

function highlightMatch(text, query) {
  if (!text) return '';
  const index = text.toLowerCase().indexOf(query);
  if (index === -1) return escapeHtml(text);
  
  const before = text.substring(0, index);
  const match = text.substring(index, index + query.length);
  const after = text.substring(index + query.length);

  return `${escapeHtml(before)}<span class="suggestion-match">${escapeHtml(match)}</span>${escapeHtml(after)}`;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}

// Inspect active URL to deep-link to sections, activate tab panels, and highlight matching elements
function handleIncomingSearchRoute() {
  const params = new URLSearchParams(window.location.search);
  const searchQuery = params.get('search');
  const tabQuery = params.get('tab');
  const hash = window.location.hash;

  // 1. If we are on products.html
  if (window.location.pathname.includes('products.html')) {
    if (searchQuery) {
      const productSearchInput = document.getElementById('product-search-input');
      if (productSearchInput) {
        productSearchInput.value = searchQuery;
        setTimeout(() => {
          // Open all tabs to make any matching card visible
          document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.add('active');
            panel.style.display = 'block';
          });
          document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

          // Perform cards filter
          const cards = document.querySelectorAll('.product-card');
          cards.forEach(card => {
            const title = card.querySelector('h4')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
            if (title.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase())) {
              card.style.display = 'block';
            } else {
              card.style.display = 'none';
            }
          });

          // Scroll & Glow highlight
          const exactMatch = Array.from(cards).find(card => 
            card.querySelector('h4')?.textContent.toLowerCase().includes(searchQuery.toLowerCase())
          );
          if (exactMatch) {
            exactMatch.scrollIntoView({ behavior: 'smooth', block: 'center' });
            exactMatch.classList.add('search-highlight-active');
            setTimeout(() => {
              exactMatch.classList.remove('search-highlight-active');
            }, 2500);
          }
        }, 200);
      }
    } else if (tabQuery) {
      setTimeout(() => {
        document.querySelectorAll('.tab-panel').forEach(panel => {
          const id = panel.getAttribute('id');
          if (id === `panel-${tabQuery}`) {
            panel.classList.add('active');
            panel.style.display = 'block';
          } else {
            panel.classList.remove('active');
            panel.style.display = 'none';
          }
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
          if (btn.dataset.tab === tabQuery) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }, 200);
    }

    // Scroll to hash and highlight card
    if (hash) {
      setTimeout(() => {
        const targetId = hash.substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          const panel = targetEl.closest('.tab-panel');
          if (panel && !panel.classList.contains('active')) {
            const panelId = panel.getAttribute('id');
            const tabName = panelId ? panelId.replace('panel-', '') : '';
            if (tabName) {
              document.querySelectorAll('.tab-panel').forEach(p => {
                p.classList.toggle('active', p === panel);
                p.style.display = p === panel ? 'block' : 'none';
              });
              document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
              });
            }
          }

          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('search-highlight-active');
          setTimeout(() => {
            targetEl.classList.remove('search-highlight-active');
          }, 2500);
        }
      }, 400);
    }
  }

  // 2. If we are on services.html
  if (window.location.pathname.includes('services.html')) {
    if (hash) {
      setTimeout(() => {
        const targetId = hash.substring(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          targetEl.classList.add('search-highlight-active');
          setTimeout(() => {
            targetEl.classList.remove('search-highlight-active');
          }, 2500);
        }
      }, 400);
    }
  }
}
