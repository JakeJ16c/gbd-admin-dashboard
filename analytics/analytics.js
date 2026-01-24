// /analytics/analytics.js
import { app, auth, db } from "/firebase.js";

import {
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import {
  getFunctions,
  httpsCallable,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js";

import {
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

/** ---------- tiny UI helpers ---------- */
function setText(id, value, fallback = "—") {
  const el = document.getElementById(id);
  if (!el) return;
  // use nullish checks so 0 shows as "0"
  el.textContent = (value ?? fallback);
}

function toNumber(v) {
  if (v == null) return 0;
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v.replace(/[^\d.]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function formatGBP(n) {
  const num = toNumber(n);
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(num);
}

/** ---------- Firestore totals ---------- */
async function loadOrdersAndRevenue() {
  const snap = await getDocs(collection(db, "Orders"));

  let ordersCount = 0;
  let revenue = 0;

  snap.forEach((doc) => {
    ordersCount += 1;
    const d = doc.data() || {};

    revenue += toNumber(
      d.total ??
      d.totalAmount ??
      d.orderTotal ??
      d.amount ??
      d.grandTotal ??
      d.totalPrice
    );
  });

  setText("totalOrders", ordersCount, 0);
  setText("totalRevenue", formatGBP(revenue), formatGBP(0));
}

async function loadProductsCount() {
  const snap = await getDocs(collection(db, "Products"));
  setText("totalProducts", snap.size, 0);
}

/** ---------- Cloud Function: GA4 visits summary ---------- */
async function loadVisitsSummary() {
  // If your functions are NOT in us-central1, set the region here:
  // const functions = getFunctions(app, "europe-west2");
  const functions = getFunctions(app);

  const fn = httpsCallable(functions, "getVisitsSummary");
  const res = await fn(); // requires admin custom claim
  const data = res?.data || {};

  setText("visitsToday", data.today ?? 0, 0);
  setText("visitsThisMonth", data.monthToDate ?? 0, 0);
  setText("visitsAllTime", data.allTime ?? 0, 0);
}

/** ---------- main ---------- */
async function loadAnalytics() {
  console.log("[Analytics] boot");

  // default visible values
  setText("totalOrders", 0);
  setText("totalRevenue", formatGBP(0));
  setText("totalProducts", 0);

  setText("visitsToday", 0);
  setText("visitsThisMonth", 0);
  setText("visitsAllTime", 0);

  try {
    await Promise.all([loadOrdersAndRevenue(), loadProductsCount()]);
  } catch (err) {
    console.error("[Analytics] Firestore load failed:", err);
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      await loadVisitsSummary();
    } catch (err) {
      console.error("[Analytics] getVisitsSummary failed:", err);
      // keep visits as 0
      setText("visitsToday", 0);
      setText("visitsThisMonth", 0);
      setText("visitsAllTime", 0);
    }
  });
}

// run even if DOMContentLoaded already fired (module/caching edge cases)
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAnalytics);
} else {
  loadAnalytics();
}
