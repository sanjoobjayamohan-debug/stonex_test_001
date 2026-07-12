// ════════════════════════════════════════════════════════════════
//  STONEX ADMIN DASHBOARD — admin.js
//  Firebase Auth + Firestore + Storage
// ════════════════════════════════════════════════════════════════

import { initializeApp }          from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
                                   from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, getDocs, addDoc, deleteDoc, onSnapshot, serverTimestamp }
                                   from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
                                   from "https://www.gstatic.com/firebasejs/11.2.0/firebase-storage.js";
import { firebaseConfig }          from "../firebase-config.js";

// ─── Init Firebase ───────────────────────────────────────────────
const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
const storage = getStorage(app);

// ─── Local state ─────────────────────────────────────────────────
let products = [];
let announcements = [];
let selectedFont = 'Inter';
let themeToggles = {};
let currentUser = null;

// ════════════════════════════════════════════════════════════════
//  AUTH GUARD — determine which page we are on
// ════════════════════════════════════════════════════════════════
const isLoginPage     = document.getElementById('login-form')  !== null;
const isDashboardPage = document.getElementById('dashboard-layout') !== null;

onAuthStateChanged(auth, (user) => {
  const fallbackEmail = localStorage.getItem('admin_logged_in_email');
  if (isLoginPage) {
    if (user || fallbackEmail) {
      // Already logged in → redirect to dashboard
      window.location.href = 'dashboard.html';
    }
  } else if (isDashboardPage) {
    if (!user && !fallbackEmail) {
      // Not logged in → redirect to login
      window.location.href = 'index.html';
    } else {
      currentUser = user || { email: fallbackEmail, uid: 'fallback-admin' };
      initDashboard(currentUser);
    }
  }
});

// ════════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ════════════════════════════════════════════════════════════════
if (isLoginPage) {
  const form   = document.getElementById('login-form');
  const errEl  = document.getElementById('login-error');
  const btnTxt = document.getElementById('login-btn-text');

  form && form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email    = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    errEl.classList.remove('show');
    btnTxt.textContent = 'Signing in…';
    document.getElementById('login-btn').disabled = true;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will redirect
    } catch (err) {
      // Check fallback credentials in Firestore if Firebase Auth failed
      try {
        const adminCredSnap = await getDoc(doc(db, 'siteConfig', 'adminCredentials'));
        if (adminCredSnap.exists()) {
          const data = adminCredSnap.data();
          if (data.email.toLowerCase() === email.toLowerCase() && data.password === password) {
            localStorage.setItem('admin_logged_in_email', email);
            localStorage.setItem('admin_logged_in_time', Date.now().toString());
            window.location.href = 'dashboard.html';
            return;
          }
        }
      } catch (fallbackErr) {
        console.error("Fallback login check failed:", fallbackErr);
      }

      const msgs = {
        'auth/invalid-credential':      'Invalid email or password.',
        'auth/user-not-found':          'No account found with this email.',
        'auth/wrong-password':          'Incorrect password.',
        'auth/too-many-requests':       'Too many failed attempts. Please try again later.',
        'auth/network-request-failed':  'Network error. Check your connection.',
      };
      errEl.textContent = msgs[err.code] || `Error: ${err.message}`;
      errEl.classList.add('show');
      btnTxt.textContent = 'Sign In';
      document.getElementById('login-btn').disabled = false;
    }
  });
}

// ════════════════════════════════════════════════════════════════
//  DASHBOARD
// ════════════════════════════════════════════════════════════════
async function initDashboard(user) {
  // Update sidebar user info
  const nameEl = document.getElementById('sidebar-user-name');
  const avatarEl = document.getElementById('sidebar-avatar');
  if (nameEl) nameEl.textContent = user.email.split('@')[0];
  if (avatarEl) avatarEl.textContent = (user.email[0] || 'A').toUpperCase();

  // Load all data
  await Promise.all([
    loadSection('companyInfo'),
    loadSection('hero'),
    loadSection('services'),
    loadSection('contact'),
    loadSection('theme'),
    loadSection('chatbot'),
    loadSection('whyUs'),
    loadSection('testimonials'),
    loadProducts(),
    loadAnnouncements(),
  ]);

  renderServicesEditor();
  updateOverviewStats();

  // Show dashboard
  document.getElementById('loading-overlay').style.display = 'none';
  document.getElementById('dashboard-layout').style.opacity = '1';
  document.getElementById('dashboard-layout').style.transition = 'opacity 0.4s';
}

// ─── Sign out ─────────────────────────────────────────────────
const signoutBtn = document.getElementById('signout-btn');
if (signoutBtn) {
  signoutBtn.addEventListener('click', async () => {
    localStorage.removeItem('admin_logged_in_email');
    localStorage.removeItem('admin_logged_in_time');
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

// ─── Sidebar toggle (mobile) ──────────────────────────────────
const sidebarToggle = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
if (sidebarToggle && sidebar) {
  sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

// ─── Panel switching ──────────────────────────────────────────
const navItems = document.querySelectorAll('.sidebar-nav-item[data-panel]');
navItems.forEach(item => {
  item.addEventListener('click', () => switchPanel(item.dataset.panel));
});

window.switchPanel = function(panelId) {
  navItems.forEach(i => i.classList.toggle('active', i.dataset.panel === panelId));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id === `panel-${panelId}`));

  const titles = {
    overview:      ['Dashboard Overview',      'Manage all your site content'],
    company:       ['Company Information',     'Name, address, hours & statistics'],
    hero:          ['Hero Section',            'Main banner title, subtitle & image'],
    services:      ['Services Editor',         'Edit the 4 service cards'],
    products:      ['Products Manager',        'Add, edit & remove product listings'],
    contact:       ['Contact & Social Media',  'Phone, email, address & social links'],
    announcements: ['Announcements',           'Manage the scrolling ticker messages'],
    whyus:         ['Why Choose Us',           'Customize content, cards, and section styling'],
    testimonials:  ['Client Testimonials',     'Customize on-site testimonials, stars, and client stories'],
    chatbot:       ['AI Chatbot Dashboard',    'Configure & monitor the custom AI Chatbot'],
    theme:         ['Theme & Appearance',      'Colors, fonts & display settings'],
  };
  const [title, subtitle] = titles[panelId] || ['Dashboard', ''];
  const tt = document.getElementById('topbar-title');
  const ts = document.getElementById('topbar-subtitle');
  if (tt) tt.textContent = title;
  if (ts) ts.textContent = subtitle;

  // Close mobile sidebar
  if (sidebar) sidebar.classList.remove('open');
};

// ════════════════════════════════════════════════════════════════
//  FIRESTORE — Load & Save Sections
// ════════════════════════════════════════════════════════════════

// Data cache
const dataCache = {};

async function loadSection(section) {
  try {
    const snap = await getDoc(doc(db, 'siteConfig', section));
    if (snap.exists()) {
      dataCache[section] = snap.data();
      fillForm(section, snap.data());
    }
  } catch (e) {
    console.warn(`Could not load ${section}:`, e);
  }
}

function fillForm(section, data) {
  const map = {
    companyInfo: {
      'company-name':     data.name,
      'company-tagline':  data.tagline,
      'company-phone':    data.phone,
      'company-email':    data.email,
      'company-address':  data.address,
      'company-hours':    data.hours,
      'company-about':    data.about,
      'stat-projects':    data.statProjects,
      'stat-clients':     data.statClients,
      'stat-years':       data.statYears,
      'stat-productscount': data.statProducts,
    },
    hero: {
      'hero-title1':    data.title1,
      'hero-title2':    data.title2,
      'hero-subtitle':  data.subtitle,
      'hero-btn1-text': data.btn1Text,
      'hero-btn2-text': data.btn2Text,
      'hero-badge':     data.badge,
    },
    contact: {
      'contact-phone':    data.phone,
      'contact-email':    data.email,
      'contact-address':  data.address,
      'contact-hours':    data.hours,
      'contact-map':      data.mapUrl,
      'social-facebook':  data.social?.facebook,
      'social-linkedin':  data.social?.linkedin,
      'social-instagram': data.social?.instagram,
    },
    theme: {
      'theme-primary':   data.primaryColor,
      'theme-accent':    data.accentColor,
      'theme-header-bg': data.headerBg,
    },
    chatbot: {
      'chatbot-name':               data.name,
      'chatbot-welcome':            data.welcome,
      'chatbot-system-instruction': data.systemInstruction,
      'chatbot-color':              data.color,
      'chatbot-model':              data.model,
    },
    whyUs: {
      'whyus-label-text': data.label,
      'whyus-title-text': data.title,
      'whyus-desc-text': data.desc,
      
      'whyus-card1-icon': data.card1_icon,
      'whyus-card1-title': data.card1_title,
      'whyus-card1-desc': data.card1_desc,
      
      'whyus-card2-icon': data.card2_icon,
      'whyus-card2-title': data.card2_title,
      'whyus-card2-desc': data.card2_desc,
      
      'whyus-card3-icon': data.card3_icon,
      'whyus-card3-title': data.card3_title,
      'whyus-card3-desc': data.card3_desc,
      
      'whyus-card4-icon': data.card4_icon,
      'whyus-card4-title': data.card4_title,
      'whyus-card4-desc': data.card4_desc,
      
      'whyus-card5-icon': data.card5_icon,
      'whyus-card5-title': data.card5_title,
      'whyus-card5-desc': data.card5_desc,
      
      'whyus-card6-icon': data.card6_icon,
      'whyus-card6-title': data.card6_title,
      'whyus-card6-desc': data.card6_desc,
      
      'whyus-bg-color': data.style?.bg_color,
      'whyus-bg-gradient': data.style?.bg_gradient,
      'whyus-label-color': data.style?.label_color,
      'whyus-label-size': data.style?.label_size,
      'whyus-label-weight': data.style?.label_weight,
      'whyus-label-transform': data.style?.label_transform,
      'whyus-label-decoration': data.style?.label_decoration,
      'whyus-label-spacing': data.style?.label_spacing,
      'whyus-title-color': data.style?.title_color,
      'whyus-title-size': data.style?.title_size,
      'whyus-title-weight': data.style?.title_weight,
      'whyus-title-transform': data.style?.title_transform,
      'whyus-title-decoration': data.style?.title_decoration,
      'whyus-title-spacing': data.style?.title_spacing,
      'whyus-desc-color': data.style?.desc_color,
      'whyus-desc-size': data.style?.desc_size,
      'whyus-desc-weight': data.style?.desc_weight,
      'whyus-card-bg': data.style?.card_bg,
      'whyus-card-border': data.style?.card_border,
      'whyus-card-title-color': data.style?.card_title_color,
      'whyus-card-desc-color': data.style?.card_desc_color,
    },
    testimonials: {
      'testi-label-text': data.label,
      'testi-title-text': data.title,
      'testi-desc-text': data.desc,

      'testi-1-name': data.testi1_name,
      'testi-1-role': data.testi1_role,
      'testi-1-quote': data.testi1_quote,
      'testi-1-stars': data.testi1_stars,

      'testi-2-name': data.testi2_name,
      'testi-2-role': data.testi2_role,
      'testi-2-quote': data.testi2_quote,
      'testi-2-stars': data.testi2_stars,

      'testi-3-name': data.testi3_name,
      'testi-3-role': data.testi3_role,
      'testi-3-quote': data.testi3_quote,
      'testi-3-stars': data.testi3_stars,

      'testi-4-name': data.testi4_name,
      'testi-4-role': data.testi4_role,
      'testi-4-quote': data.testi4_quote,
      'testi-4-stars': data.testi4_stars,
    },
  };

  if (map[section]) {
    Object.entries(map[section]).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val !== undefined && val !== null) el.value = val;
    });
  }

  // Special handling
  if (section === 'chatbot') {
    if (data.active !== undefined) {
      const btn = document.getElementById('toggle-chatbot-active');
      if (btn) {
        btn.classList.toggle('on', data.active);
        const lbl = document.getElementById('chatbot-status-label');
        if (lbl) lbl.textContent = data.active ? 'AI Chatbot is ACTIVE on the main website' : 'AI Chatbot is DISABLED on the main website';
      }
    }
    if (data.color) updateColorHex('chatbot', data.color);
    if (window.loadChatbotLeads) window.loadChatbotLeads();
  }

  if (section === 'theme') {
    if (data.font) { selectedFont = data.font; updateFontSelection(data.font); }
    if (data.primaryColor) updateColorHex('primary', data.primaryColor);
    if (data.accentColor)  updateColorHex('accent',  data.accentColor);
    if (data.headerBg)     updateColorHex('header-bg', data.headerBg);
    if (data.logoUrl) {
      const preview = document.getElementById('logo-image-preview');
      if (preview) { preview.src = data.logoUrl; preview.classList.add('show'); }
      const hint = document.getElementById('logo-current-img');
      if (hint) hint.textContent = 'Current: Custom uploaded logo';
      
      const sidebarLogoContainer = document.querySelector('.sidebar-logo-img-container');
      if (sidebarLogoContainer) {
        sidebarLogoContainer.innerHTML = `<img src="${data.logoUrl}" alt="Stonex Logo" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
      }
    }
    if (data.toggles) {
      themeToggles = data.toggles;
      Object.entries(data.toggles).forEach(([key, val]) => {
        const btn = document.getElementById(`toggle-${key}`);
        if (btn) {
          btn.classList.toggle('on', val);
        }
      });
    }
  }
}

// ─── SAVE functions (exposed globally) ───────────────────────

window.saveWhyUs = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      label: val('whyus-label-text') || 'Why Choose Stonex',
      title: val('whyus-title-text') || 'Your Trusted Industrial Partner',
      desc:  val('whyus-desc-text') || '',
      
      card1_icon: val('whyus-card1-icon') || '🛡️',
      card1_title: val('whyus-card1-title') || 'Quality Assured',
      card1_desc: val('whyus-card1-desc') || '',
      
      card2_icon: val('whyus-card2-icon') || '⚡',
      card2_title: val('whyus-card2-title') || 'Fast Delivery',
      card2_desc: val('whyus-card2-desc') || '',
      
      card3_icon: val('whyus-card3-icon') || '👥',
      card3_title: val('whyus-card3-title') || 'Expert Team',
      card3_desc: val('whyus-card3-desc') || '',
      
      card4_icon: val('whyus-card4-icon') || '💰',
      card4_title: val('whyus-card4-title') || 'Competitive Pricing',
      card4_desc: val('whyus-card4-desc') || '',
      
      card5_icon: val('whyus-card5-icon') || '🌐',
      card5_title: val('whyus-card5-title') || 'Wide Coverage',
      card5_desc: val('whyus-card5-desc') || '',
      
      card6_icon: val('whyus-card6-icon') || '🤝',
      card6_title: val('whyus-card6-title') || 'Customer Satisfaction',
      card6_desc: val('whyus-card6-desc') || '',
      
      style: {
        bg_color: val('whyus-bg-color') || '#111827',
        bg_gradient: val('whyus-bg-gradient') || 'none',
        label_color: val('whyus-label-color') || '#f97316',
        label_size: val('whyus-label-size') || '12px',
        label_weight: val('whyus-label-weight') || '700',
        label_transform: val('whyus-label-transform') || 'uppercase',
        label_decoration: val('whyus-label-decoration') || 'none',
        label_spacing: val('whyus-label-spacing') || '3px',
        title_color: val('whyus-title-color') || '#ffffff',
        title_size: val('whyus-title-size') || '',
        title_weight: val('whyus-title-weight') || '800',
        title_transform: val('whyus-title-transform') || 'none',
        title_decoration: val('whyus-title-decoration') || 'none',
        title_spacing: val('whyus-title-spacing') || 'normal',
        desc_color: val('whyus-desc-color') || 'rgba(255,255,255,0.6)',
        desc_size: val('whyus-desc-size') || '17px',
        desc_weight: val('whyus-desc-weight') || '400',
        card_bg: val('whyus-card-bg') || 'rgba(255,255,255,0.04)',
        card_border: val('whyus-card-border') || 'rgba(255,255,255,0.08)',
        card_title_color: val('whyus-card-title-color') || '#ffffff',
        card_desc_color: val('whyus-card-desc-color') || '#94a3b8'
      },
      updatedAt: serverTimestamp()
    };
    
    await setDoc(doc(db, 'siteConfig', 'whyUs'), data, { merge: true });
    toast('Why Choose Us content and styling saved successfully!', 'success');
    setSaveStatus('saved');
    logActivity('Updated Why Choose Us / Partner section content and styling');
  } catch (e) {
    toast('Error saving: ' + e.message, 'error');
    setSaveStatus('saved');
  }
};

window.saveTestimonials = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      label: val('testi-label-text') || 'Client Testimonials',
      title: val('testi-title-text') || 'What Our Partners Say',
      desc:  val('testi-desc-text') || '',

      testi1_name: val('testi-1-name') || 'Khalid Al-Otaibi',
      testi1_role: val('testi-1-role') || 'Project Director, Al-Namaa Construction',
      testi1_quote: val('testi-1-quote') || '',
      testi1_stars: numVal('testi-1-stars') || 5,

      testi2_name: val('testi-2-name') || 'Eng. Robert Fletcher',
      testi2_role: val('testi-2-role') || 'Logistics Manager, KSA Infra-Solutions',
      testi2_quote: val('testi-2-quote') || '',
      testi2_stars: numVal('testi-2-stars') || 5,

      testi3_name: val('testi-3-name') || 'Fatima Al-Dossary',
      testi3_role: val('testi-3-role') || 'QHSE Manager, Desert Plains Petrochemicals',
      testi3_quote: val('testi-3-quote') || '',
      testi3_stars: numVal('testi-3-stars') || 5,

      testi4_name: val('testi-4-name') || 'Eng. Tariq Masood',
      testi4_role: val('testi-4-role') || 'Procurement Head, Red Sea Gate Contracting',
      testi4_quote: val('testi-4-quote') || '',
      testi4_stars: numVal('testi-4-stars') || 5,

      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'siteConfig', 'testimonials'), data, { merge: true });
    toast('Client testimonials content saved successfully!', 'success');
    setSaveStatus('saved');
    logActivity('Updated Client Testimonials section content');
  } catch (e) {
    toast('Error saving: ' + e.message, 'error');
    setSaveStatus('saved');
  }
};

window.saveCompanyInfo = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      name:         val('company-name'),
      tagline:      val('company-tagline'),
      phone:        val('company-phone'),
      email:        val('company-email'),
      address:      val('company-address'),
      hours:        val('company-hours'),
      about:        val('company-about'),
      statProjects: numVal('stat-projects'),
      statClients:  numVal('stat-clients'),
      statYears:    numVal('stat-years'),
      statProducts: numVal('stat-productscount'),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'siteConfig', 'companyInfo'), data, { merge: true });
    toast('Company info saved successfully!', 'success');
    setSaveStatus('saved');
    logActivity('Updated company information');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.saveStats = window.saveCompanyInfo;

window.saveHero = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      title1:   val('hero-title1'),
      title2:   val('hero-title2'),
      subtitle: val('hero-subtitle'),
      btn1Text: val('hero-btn1-text'),
      btn2Text: val('hero-btn2-text'),
      badge:    val('hero-badge'),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'siteConfig', 'hero'), data, { merge: true });
    toast('Hero section saved!', 'success');
    setSaveStatus('saved');
    logActivity('Updated hero section');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.saveServices = async function() {
  setSaveStatus('saving');
  try {
    const items = ['industrial', 'equipment', 'civil', 'ppe'].map(key => ({
      key,
      title: val(`svc-title-${key}`),
      desc:  val(`svc-desc-${key}`),
    }));
    await setDoc(doc(db, 'siteConfig', 'services'), { items, updatedAt: serverTimestamp() }, { merge: true });
    toast('Services saved!', 'success');
    setSaveStatus('saved');
    logActivity('Updated services content');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.saveContact = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      phone:   val('contact-phone'),
      email:   val('contact-email'),
      address: val('contact-address'),
      hours:   val('contact-hours'),
      mapUrl:  val('contact-map'),
      social: {
        facebook:  val('social-facebook'),
        linkedin:  val('social-linkedin'),
        instagram: val('social-instagram'),
      },
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'siteConfig', 'contact'), data, { merge: true });
    toast('Contact info saved!', 'success');
    setSaveStatus('saved');
    logActivity('Updated contact & social info');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.saveTheme = async function() {
  setSaveStatus('saving');
  try {
    const data = {
      primaryColor: val('theme-primary'),
      accentColor:  val('theme-accent'),
      headerBg:     val('theme-header-bg'),
      font:         selectedFont,
      toggles:      themeToggles,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'siteConfig', 'theme'), data, { merge: true });
    toast('Theme settings saved!', 'success');
    setSaveStatus('saved');
    logActivity('Updated theme & appearance');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.saveAnnouncements = async function() {
  setSaveStatus('saving');
  try {
    const items = [...document.querySelectorAll('.announcement-item input')].map(inp => inp.value).filter(Boolean);
    await setDoc(doc(db, 'siteConfig', 'announcements'), { items, updatedAt: serverTimestamp() });
    announcements = items;
    toast('Announcements saved!', 'success');
    setSaveStatus('saved');
    const statEl = document.getElementById('stat-announcements');
    if (statEl) statEl.textContent = items.length;
    logActivity('Updated announcements');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

// ════════════════════════════════════════════════════════════════
//  PRODUCTS
// ════════════════════════════════════════════════════════════════
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, 'products'));
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProductTable();
  } catch (e) {
    console.warn('Could not load products:', e);
  }
}

window.addProduct = async function() {
  const name = val('new-product-name');
  const category = val('new-product-category');
  const icon = val('new-product-icon') || '📦';
  const desc = val('new-product-desc');

  if (!name || !category) { toast('Please enter product name and category', 'error'); return; }

  setSaveStatus('saving');
  try {
    const ref = await addDoc(collection(db, 'products'), { name, category, icon, desc, createdAt: serverTimestamp() });
    products.push({ id: ref.id, name, category, icon, desc });
    renderProductTable();
    ['new-product-name','new-product-icon','new-product-desc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    toast('Product added!', 'success');
    setSaveStatus('saved');
    updateOverviewStats();
    logActivity(`Added product: ${name}`);
  } catch (e) { toast('Error adding product: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.deleteProduct = async function(id) {
  if (!confirm('Delete this product?')) return;
  setSaveStatus('saving');
  try {
    await deleteDoc(doc(db, 'products', id));
    products = products.filter(p => p.id !== id);
    renderProductTable();
    toast('Product deleted.', 'info');
    setSaveStatus('saved');
    updateOverviewStats();
    logActivity('Deleted a product');
  } catch (e) { toast('Error deleting: ' + e.message, 'error'); setSaveStatus('saved'); }
};

window.renderProductTable = function() {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;
  const filter = val('filter-category') || 'all';
  const filtered = filter === 'all' ? products : products.filter(p => p.category === filter);

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--admin-text-muted)">No products found. Add one above!</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(p => `
    <tr>
      <td style="font-size:22px;text-align:center">${p.icon || '📦'}</td>
      <td style="font-weight:500;color:var(--admin-text)">${p.name}</td>
      <td><span class="category-pill">${p.category}</span></td>
      <td>${p.desc || '—'}</td>
      <td>
        <button class="btn btn-icon btn-danger btn-sm" onclick="deleteProduct('${p.id}')" title="Delete" style="width:32px;height:32px">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    </tr>
  `).join('');
};

// ════════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════
async function loadAnnouncements() {
  try {
    const snap = await getDoc(doc(db, 'siteConfig', 'announcements'));
    if (snap.exists()) {
      announcements = snap.data().items || [];
    } else {
      announcements = [
        '🏗️ New heavy equipment fleet now available for rental',
        '⚙️ Expanded catalogue of mechanical & electrical items — 1000+ SKUs',
        '🦺 ISO-certified PPE equipment in stock — same-day delivery available',
        '🪨 Bulk civil material supply with competitive pricing',
      ];
    }
    renderAnnouncementsList();
  } catch (e) {
    console.warn('Could not load announcements:', e);
  }
}

function renderAnnouncementsList() {
  const list = document.getElementById('announcements-list');
  if (!list) return;
  list.innerHTML = announcements.map((text, i) => `
    <div class="announcement-item" id="ann-item-${i}">
      <span class="drag-handle" title="Drag to reorder">⠿</span>
      <input type="text" value="${text}" placeholder="Announcement text..." id="ann-input-${i}" />
      <button class="btn btn-icon btn-danger" onclick="removeAnnouncement(${i})" title="Remove" style="width:32px;height:32px;flex-shrink:0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');

  const statEl = document.getElementById('stat-announcements');
  if (statEl) statEl.textContent = announcements.length;
}

window.addAnnouncement = function() {
  announcements.push('');
  renderAnnouncementsList();
  const lastInput = document.getElementById(`ann-input-${announcements.length - 1}`);
  if (lastInput) lastInput.focus();
};

window.removeAnnouncement = function(index) {
  announcements.splice(index, 1);
  renderAnnouncementsList();
};

// ════════════════════════════════════════════════════════════════
//  SERVICES EDITOR
// ════════════════════════════════════════════════════════════════
const SERVICE_DEFS = [
  { key: 'industrial', icon: '⚙️', label: 'Industrial Trading',      defaultTitle: 'Industrial Trading',       defaultDesc: 'Civil, mechanical, and electrical items sourced from globally certified manufacturers.' },
  { key: 'equipment',  icon: '🚜', label: 'Heavy Equipment Rentals', defaultTitle: 'Heavy Equipment Rentals',  defaultDesc: 'Premium fleet of well-maintained heavy construction equipment with flexible rental terms.' },
  { key: 'civil',      icon: '🏗️', label: 'Civil Material Supply',   defaultTitle: 'Civil Material Supply',    defaultDesc: 'All grades of civil construction materials in bulk with guaranteed quality and timely delivery.' },
  { key: 'ppe',        icon: '🦺', label: 'PPE Items',               defaultTitle: 'Personal Protective Equipment', defaultDesc: 'Certified and standard-compliant PPE for every industry need.' },
];

function renderServicesEditor() {
  const grid = document.getElementById('services-editor-grid');
  if (!grid) return;
  const servicesData = dataCache['services']?.items || [];
  const dataMap = Object.fromEntries(servicesData.map(s => [s.key, s]));

  grid.innerHTML = SERVICE_DEFS.map(svc => {
    const d = dataMap[svc.key] || {};
    return `
    <div class="service-editor-card">
      <div class="service-editor-card-header">
        <span>${svc.icon}</span> ${svc.label}
      </div>
      <div class="field-group">
        <label class="field-label">Card Title</label>
        <input type="text" class="admin-input" id="svc-title-${svc.key}" value="${d.title || svc.defaultTitle}" placeholder="${svc.defaultTitle}" />
      </div>
      <div class="field-group">
        <label class="field-label">Description</label>
        <textarea class="admin-textarea" id="svc-desc-${svc.key}" style="min-height:80px" placeholder="${svc.defaultDesc}">${d.desc || svc.defaultDesc}</textarea>
      </div>
    </div>`;
  }).join('');
}

// ════════════════════════════════════════════════════════════════
//  IMAGE UPLOAD (to Firebase Storage)
// ════════════════════════════════════════════════════════════════
window.handleImageUpload = async function(section, input) {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { toast('Image too large. Max 5MB.', 'error'); return; }

  // Show local preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById(`${section}-image-preview`);
    if (preview) { preview.src = e.target.result; preview.classList.add('show'); }
  };
  reader.readAsDataURL(file);

  setSaveStatus('saving');
  toast('Uploading image…', 'info');

  try {
    const storageRef = ref(storage, `stonex/${section}/${Date.now()}_${file.name}`);
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    if (section === 'logo') {
      await setDoc(doc(db, 'siteConfig', 'theme'), { logoUrl: url }, { merge: true });
      if (dataCache['theme']) dataCache['theme'].logoUrl = url;
      const sidebarLogoContainer = document.querySelector('.sidebar-logo-img-container');
      if (sidebarLogoContainer) {
        sidebarLogoContainer.innerHTML = `<img src="${url}" alt="Stonex Logo" style="max-width:100%; max-height:100%; object-fit:contain;" />`;
      }
    } else {
      await setDoc(doc(db, 'siteConfig', section === 'hero' ? 'hero' : section), { bgImage: url }, { merge: true });
      if (dataCache[section]) dataCache[section].bgImage = url;
    }
    const hint = document.getElementById(`${section}-current-img`);
    if (hint) hint.textContent = `Current: ${file.name} (uploaded)`;
    toast('Image uploaded & saved!', 'success');
    setSaveStatus('saved');
    logActivity(`Uploaded new ${section} image`);
  } catch (e) {
    toast('Upload failed: ' + e.message, 'error');
    setSaveStatus('saved');
  }
};

// ════════════════════════════════════════════════════════════════
//  THEME HELPERS
// ════════════════════════════════════════════════════════════════
window.updateColorHex = function(key, value) {
  const el = document.getElementById(`hex-${key}`);
  if (el) el.textContent = value;
};

window.selectFont = function(el) {
  document.querySelectorAll('.font-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  selectedFont = el.dataset.font;
  const lbl = document.getElementById('selected-font-name');
  if (lbl) {
    lbl.textContent = `Selected: ${selectedFont}`;
    lbl.style.fontFamily = `'${selectedFont}', sans-serif`;
  }
  const selectInp = document.getElementById('google-font-select');
  const customInp = document.getElementById('custom-font-input');
  if (selectInp) selectInp.value = "";
  if (customInp) customInp.value = "";
  loadFontPreview(selectedFont);
};

window.handleGoogleFontSelect = function(fontName) {
  if (!fontName) return;
  selectedFont = fontName;
  const lbl = document.getElementById('selected-font-name');
  if (lbl) {
    lbl.textContent = `Selected: ${selectedFont}`;
    lbl.style.fontFamily = `'${selectedFont}', sans-serif`;
  }
  document.querySelectorAll('.font-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.font === fontName);
  });
  const customInp = document.getElementById('custom-font-input');
  if (customInp) customInp.value = "";
  loadFontPreview(fontName);
};

window.handleCustomFontInput = function(fontName) {
  if (!fontName) return;
  selectedFont = fontName;
  const lbl = document.getElementById('selected-font-name');
  if (lbl) {
    lbl.textContent = `Selected: ${selectedFont}`;
    lbl.style.fontFamily = `'${selectedFont}', sans-serif`;
  }
  document.querySelectorAll('.font-option').forEach(o => {
    o.classList.remove('selected');
  });
  const selectInp = document.getElementById('google-font-select');
  if (selectInp) selectInp.value = "";
  loadFontPreview(fontName);
};

function loadFontPreview(fontName) {
  if (!fontName) return;
  const id = 'dynamic-font-preview-link';
  let link = document.getElementById(id);
  if (!link) {
    link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }
  link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;600;700&display=swap`;
}

function updateFontSelection(font) {
  let isStandard = false;
  document.querySelectorAll('.font-option').forEach(o => {
    const match = o.dataset.font === font;
    o.classList.toggle('selected', match);
    if (match) isStandard = true;
  });
  const lbl = document.getElementById('selected-font-name');
  if (lbl) {
    lbl.textContent = `Selected: ${font}`;
    lbl.style.fontFamily = `'${font}', sans-serif`;
  }
  const customInp = document.getElementById('custom-font-input');
  const selectInp = document.getElementById('google-font-select');
  if (!isStandard) {
    if (selectInp) {
      let exists = false;
      for (let option of selectInp.options) {
        if (option.value === font) {
          selectInp.value = font;
          exists = true;
          break;
        }
      }
      if (!exists) {
        selectInp.value = "";
        if (customInp) customInp.value = font;
      } else {
        if (customInp) customInp.value = "";
      }
    }
  } else {
    if (selectInp) selectInp.value = "";
    if (customInp) customInp.value = "";
  }
  loadFontPreview(font);
}

window.toggleChatbotActive = function(btn) {
  btn.classList.toggle('on');
  const active = btn.classList.contains('on');
  const lbl = document.getElementById('chatbot-status-label');
  if (lbl) lbl.textContent = active ? 'AI Chatbot is ACTIVE on the main website' : 'AI Chatbot is DISABLED on the main website';
};

window.saveChatbotSettings = async function() {
  setSaveStatus('saving');
  try {
    const activeBtn = document.getElementById('toggle-chatbot-active');
    const active = activeBtn ? activeBtn.classList.contains('on') : true;
    const data = {
      active,
      name:              val('chatbot-name') || 'Stonex AI Assistant',
      welcome:           val('chatbot-welcome') || 'Hello! I am the Stonex AI assistant. How can I help you today?',
      systemInstruction: val('chatbot-system-instruction') || 'You are Stonex\'s official AI assistant. Help customers choose between heavy equipment rentals, civil material supply, and PPE. Be professional and brief.',
      color:             val('chatbot-color') || '#f97316',
      model:             val('chatbot-model') || 'gemini-3.5-flash',
      updatedAt:         serverTimestamp(),
    };
    await setDoc(doc(db, 'siteConfig', 'chatbot'), data, { merge: true });
    toast('Chatbot settings saved!', 'success');
    setSaveStatus('saved');
    logActivity('Updated AI Chatbot configuration');
  } catch (e) { toast('Error saving: ' + e.message, 'error'); setSaveStatus('saved'); }
};

// --- CHATBOT LEADS FLOW ---
window.loadChatbotLeads = async function() {
  const tbody = document.getElementById('chatbot-leads-tbody');
  if (!tbody) return;

  try {
    const snap = await getDocs(collection(db, 'chatbotLeads'));
    let leads = [];
    snap.forEach(docSnap => {
      leads.push({ id: docSnap.id, ...docSnap.data() });
    });

    // Sort by submittedAt descending
    leads.sort((a, b) => {
      const timeA = a.submittedAt?.seconds || 0;
      const timeB = b.submittedAt?.seconds || 0;
      return timeB - timeA;
    });

    // Update total chats / leads count on dashboard
    const totalChatsEl = document.getElementById('chat-stat-total');
    if (totalChatsEl) {
      totalChatsEl.textContent = leads.length;
    }

    if (leads.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="padding:24px 8px; text-align:center; color:var(--admin-text-muted)">
            No customer leads collected yet. Try submitting details via the website chatbot!
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = leads.map(lead => {
      let dateStr = 'N/A';
      if (lead.submittedAt) {
        const dateObj = lead.submittedAt.toDate ? lead.submittedAt.toDate() : new Date(lead.submittedAt);
        dateStr = dateObj.toLocaleString();
      }

      const status = lead.status || 'New';
      const badgeStyle = status === 'New' 
        ? 'background: rgba(249,115,22,0.15); color: #f97316;' 
        : 'background: rgba(16,185,129,0.15); color: #10b981;';

      return `
        <tr style="border-bottom: 1px solid var(--admin-border)">
          <td style="padding:12px 14px; color:var(--admin-text); font-weight: 500;">${escapeHtml(lead.name)}</td>
          <td style="padding:12px 14px;">
            <a href="tel:${escapeHtml(lead.contact)}" style="color:var(--admin-primary); text-decoration:none; font-weight: 600;">${escapeHtml(lead.contact)}</a>
          </td>
          <td style="padding:12px 14px;">${escapeHtml(lead.address)}</td>
          <td style="padding:12px 14px; font-size:12px; color:var(--admin-text-muted)">${dateStr}</td>
          <td style="padding:12px 14px;">
            <span class="category-pill" style="${badgeStyle}; cursor:pointer; font-weight:600; font-size:11px;" onclick="toggleLeadStatus('${lead.id}', '${status}')">
              ${status} 🔄
            </span>
          </td>
          <td style="padding:12px 14px; text-align:right">
            <button class="btn btn-sm btn-outline" style="border-color:#ef4444; color:#ef4444; padding:4px 8px; cursor:pointer;" onclick="deleteLead('${lead.id}')">
              🗑️ Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error("Error loading leads: ", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="padding:24px 8px; text-align:center; color:#ef4444">
          Error loading leads: ${err.message}
        </td>
      </tr>
    `;
  }
};

window.toggleLeadStatus = async function(id, currentStatus) {
  const nextStatus = currentStatus === 'New' ? 'Contacted' : 'New';
  try {
    await setDoc(doc(db, 'chatbotLeads', id), { status: nextStatus }, { merge: true });
    toast(`Lead status updated to ${nextStatus}!`, 'success');
    loadChatbotLeads();
  } catch (err) {
    toast(`Error updating status: ${err.message}`, 'error');
  }
};

window.deleteLead = async function(id) {
  if (!confirm("Are you sure you want to delete this customer lead?")) return;
  try {
    await deleteDoc(doc(db, 'chatbotLeads', id));
    toast('Lead deleted successfully!', 'success');
    loadChatbotLeads();
  } catch (err) {
    toast(`Error deleting lead: ${err.message}`, 'error');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

window.toggleSetting = function(key, btn) {
  btn.classList.toggle('on');
  themeToggles[key] = btn.classList.contains('on');
};

// ════════════════════════════════════════════════════════════════
//  OVERVIEW STATS
// ════════════════════════════════════════════════════════════════
function updateOverviewStats() {
  const statEl = document.getElementById('stat-products');
  if (statEl) statEl.textContent = products.length;
}

// ════════════════════════════════════════════════════════════════
//  ACTIVITY LOG
// ════════════════════════════════════════════════════════════════
const activityLog = [];
function logActivity(msg) {
  activityLog.unshift({ msg, time: new Date().toLocaleTimeString() });
  const el = document.getElementById('activity-log');
  if (!el) return;
  el.innerHTML = activityLog.slice(0, 8).map(a => `
    <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--admin-border)">
      <span style="width:8px;height:8px;border-radius:50%;background:var(--admin-primary);flex-shrink:0;display:inline-block"></span>
      <span style="flex:1;font-size:14px;color:var(--admin-text-dim)">${a.msg}</span>
      <span style="font-size:12px;color:var(--admin-text-muted)">${a.time}</span>
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════
//  SAVE STATUS INDICATOR
// ════════════════════════════════════════════════════════════════
function setSaveStatus(state) {
  const dot = document.getElementById('save-dot');
  const txt = document.getElementById('save-status-text');
  const container = document.getElementById('save-status');
  if (!dot || !txt) return;
  if (state === 'saving') {
    dot.classList.add('saving');
    dot.classList.remove('saved-pulse');
    txt.textContent = 'Saving…';
    if (container) {
      container.style.borderColor = 'rgba(249,115,22,0.3)';
    }
  } else {
    dot.classList.remove('saving');
    dot.classList.add('saved-pulse');
    txt.textContent = 'All changes saved';
    if (container) {
      container.classList.add('success-flash');
      setTimeout(() => container.classList.remove('success-flash'), 1200);
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ════════════════════════════════════════════════════════════════
window.toast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; el.style.transition = '0.3s'; setTimeout(() => el.remove(), 300); }, 3500);
};

// ─── Helpers ─────────────────────────────────────────────────
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}
function numVal(id) {
  const el = document.getElementById(id);
  return el ? Number(el.value) || 0 : 0;
}
