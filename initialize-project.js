// ════════════════════════════════════════════════════════════════
//  STONEX PROJECT INITIALIZER & SEEDER
//  Run this to create the admin user and populate default data.
// ════════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, doc, setDoc, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db  = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export async function runInitialization(email, password) {
  window.runInitialization = runInitialization;
  const logEl = document.getElementById('init-log');
  const printLog = (msg, success = true) => {
    const div = document.createElement('div');
    div.style.color = success ? '#10b981' : '#ef4444';
    div.style.marginBottom = '6px';
    div.textContent = msg;
    logEl.appendChild(div);
  };

  logEl.innerHTML = '';
  printLog("Starting initialization…");

  // 1. Create Admin User
  let fallbackAuth = false;
  try {
    printLog(`Creating admin account: ${email}…`);
    await createUserWithEmailAndPassword(auth, email, password);
    printLog("✔ Admin account created successfully!");
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      printLog("ℹ Admin account already exists. Skipping user creation.");
    } else {
      printLog(`⚠️ Firebase Auth failed: ${err.message}`);
      printLog(`💡 Setting up seamless Firestore-only authentication fallback...`);
      fallbackAuth = true;
    }
  }

  // 2. Seed default site configuration data
  try {
    if (fallbackAuth || true) {
      printLog("Saving fallback admin credentials to Firestore...");
      await setDoc(doc(db, 'siteConfig', 'adminCredentials'), {
        email: email,
        password: password,
        isFallback: true
      });
      printLog("✔ Fallback credentials stored successfully!");
    }
    printLog("Seeding default company information…");
    await setDoc(doc(db, 'siteConfig', 'companyInfo'), {
      name: "Stonex",
      tagline: "Industrial Trading & Equipment Solutions",
      phone: "+966 50 000 0000",
      email: "info@stonextrading.com",
      address: "Industrial Area, Al Jubail, Saudi Arabia",
      hours: "Sun–Thu: 8:00 AM – 6:00 PM",
      whatsapp: "+966500000000",
      about: "Stonex is a premier industrial trading company committed to delivering high-quality products and services to construction, oil & gas, manufacturing, and infrastructure sectors. We pride ourselves on being a one-stop solution for all your industrial needs.",
      statProjects: 500,
      statClients: 200,
      statYears: 15,
      statProducts: 1000
    });

    printLog("Seeding default hero content…");
    await setDoc(doc(db, 'siteConfig', 'hero'), {
      title1: "Powering Industry",
      title2: "One Solution at a Time",
      subtitle: "Stonex delivers comprehensive industrial trading, heavy equipment rentals, civil material supply, and premium PPE — all under one roof.",
      btn1Text: "Explore Services",
      btn2Text: "Contact Us",
      badge: "Trusted Industrial Partner"
    });

    printLog("Seeding default services content…");
    await setDoc(doc(db, 'siteConfig', 'services'), {
      items: [
        { key: 'industrial', title: 'Industrial Trading', desc: 'Civil, mechanical, and electrical items sourced from globally certified manufacturers.' },
        { key: 'equipment', title: 'Heavy Equipment Rentals', desc: 'Premium fleet of well-maintained heavy construction equipment with flexible rental terms.' },
        { key: 'civil', title: 'Civil Material Supply', desc: 'All grades of civil construction materials in bulk with guaranteed quality and timely delivery.' },
        { key: 'ppe', title: 'PPE Items', desc: 'Certified and standard-compliant PPE for every industry need.' }
      ]
    });

    printLog("Seeding default contact info & social links…");
    await setDoc(doc(db, 'siteConfig', 'contact'), {
      phone: "+966 50 000 0000",
      email: "info@stonextrading.com",
      address: "Industrial Area, Al Jubail, Saudi Arabia",
      hours: "Sun–Thu: 8:00 AM – 6:00 PM",
      mapUrl: "",
      social: {
        facebook: "#",
        linkedin: "#",
        instagram: "#",
        whatsapp: "+966500000000"
      }
    });

    printLog("Seeding default theme settings…");
    await setDoc(doc(db, 'siteConfig', 'theme'), {
      primaryColor: "#f97316",
      accentColor: "#dc2626",
      headerBg: "#0d1117",
      font: "Inter",
      toggles: {
        topbar: true,
        ticker: true,
        stats: true,
        whatsapp: true,
        process: true
      }
    });

    printLog("Seeding default announcements…");
    await setDoc(doc(db, 'siteConfig', 'announcements'), {
      items: [
        '🏗️ New heavy equipment fleet now available for rental',
        '⚙️ Expanded catalogue of mechanical & electrical items — 1000+ SKUs',
        '🦺 ISO-certified PPE equipment in stock — same-day delivery available',
        '🪨 Bulk civil material supply with competitive pricing'
      ]
    });

    // 3. Seed some default products
    printLog("Seeding initial products catalogue…");
    const initialProducts = [
      { name: "Steel Rebar & TMT", category: "civil", icon: "🔩", desc: "Grade 500D, 550D rebar in all sizes" },
      { name: "Industrial Pumps", category: "mechanical", icon: "💧", desc: "Centrifugal, submersible, booster pumps" },
      { name: "Cables & Wires", category: "electrical", icon: "⚡", desc: "Power, control, instrumentation cables" },
      { name: "Safety Helmets", category: "ppe", icon: "⛑️", desc: "Class A, B, C rated hard hats" },
      { name: "Mobile Cranes", category: "equipment", icon: "🏗️", desc: "15T–200T capacity range" }
    ];

    const prodCol = collection(db, 'products');
    const existingProds = await getDocs(prodCol);
    if (existingProds.empty) {
      for (const prod of initialProducts) {
        await addDoc(prodCol, prod);
      }
    }
    printLog("✔ Database seeded successfully!");
    printLog("🚀 INITIALIZATION COMPLETED! You can now visit your dashboard.");

  } catch (err) {
    printLog(`❌ Error seeding database: ${err.message}`, false);
  }
};
