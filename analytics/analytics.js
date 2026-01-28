// analytics/analytics.js (UPDATED)

import { app, auth, db } from "/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js";

console.log("[Analytics] analytics.js loaded at:", window.location.pathname);

function setText(id, value, fallback = "—") {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = value ?? fallback;
}

function asNumber(x) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function calcOrderTotal(order) {
  // Match your order-management.js logic:
  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.Items)
      ? order.Items
      : [];

  const itemsTotal = items.reduce((acc, item) => {
    const price = asNumber(item.price);
    const qty = asNumber(item.qty ?? item.quantity ?? 0);
    return acc + price * qty;
  }, 0);

  // Optional fields if you add them later:
  const delivery = asNumber(order.deliveryCost ?? order.delivery ?? order.shipping ?? 0);
  const discount = asNumber(order.discountAmount ?? order.discount ?? 0);

  // If you ever start storing a real total, use it when present & > 0
  const storedTotal = asNumber(order.total ?? order.amount ?? order.totalAmount ?? 0);
  if (storedTotal > 0) return storedTotal;

  return Math.max(0, itemsTotal + delivery - discount);
}

async function loadVisitsSummary() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");

    // Refresh token to pick up admin claim
    await user.getIdToken(true);

    const functions = getFunctions(app);
    const getVisitsSummary = httpsCallable(functions, "getVisitsSummary");
    const res = await getVisitsSummary();
    const data = res.data || {};

    setText("visitsToday", data.today ?? 0, 0);
    setText("visitsMonth", data.monthToDate ?? 0, 0);
    setText("visitsAllTime", data.allTime ?? 0, 0);

    console.log("[Analytics] Visits summary:", data);
  } catch (err) {
    console.warn("[Analytics] getVisitsSummary failed:", err);
    // Keep placeholders at 0 if callable fails
    setText("visitsToday", 0, 0);
    setText("visitsMonth", 0, 0);
    setText("visitsAllTime", 0, 0);
  }
}

async function loadAnalytics() {
  // Set safe defaults immediately (so you never stay on "—")
  setText("totalOrders", 0);
  setText("totalRevenue", "£0.00");
  setText("totalProducts", 0);
  setText("visitsToday", 0);
  setText("visitsMonth", 0);
  setText("visitsAllTime", 0);

  try {
    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "Orders")),
      getDocs(collection(db, "Products")),
    ]);

    const orders = ordersSnap.docs.map((d) => d.data());
    const ordersCount = orders.length;

    const totalRevenue = orders.reduce((acc, o) => acc + calcOrderTotal(o), 0);

    setText("totalOrders", ordersCount, 0);
    setText("totalRevenue", `£${totalRevenue.toFixed(2)}`, "£0.00");
    setText("totalProducts", productsSnap.size, 0);

    console.log("[Analytics] Totals:", { ordersCount, totalRevenue, products: productsSnap.size });

    // Visits (admin-only callable)
    await loadVisitsSummary();
  } catch (err) {
    console.error("[Analytics] loadAnalytics failed:", err);
  }
}

// ✅ Don’t rely purely on DOMContentLoaded timing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAnalytics, { once: true });
} else {
  loadAnalytics();
}

// Also re-run visits summary when auth becomes ready
auth.onAuthStateChanged?.((user) => {
  if (user) loadVisitsSummary();
});
