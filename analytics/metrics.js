// analytics/metrics.js

import { app, auth, db } from "/firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-functions.js";

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

  const delivery = asNumber(order.deliveryCost ?? order.delivery ?? order.shipping ?? 0);
  const discount = asNumber(order.discountAmount ?? order.discount ?? 0);

  const storedTotal = asNumber(order.total ?? order.amount ?? order.totalAmount ?? 0);
  if (storedTotal > 0) return storedTotal;

  return Math.max(0, itemsTotal + delivery - discount);
}

async function loadVisitsSummary() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not signed in.");

    await user.getIdToken(true);

    const functions = getFunctions(app);
    const fn = httpsCallable(functions, "getVisitsSummary");
    const res = await fn();
    const data = res.data || {};

    setText("visitsToday", data.today ?? 0, 0);
    setText("visitsThisMonth", data.monthToDate ?? 0, 0);
    setText("visitsAllTime", data.allTime ?? 0, 0);
  } catch (err) {
    console.warn("[Metrics] getVisitsSummary failed:", err);
    setText("visitsToday", 0, 0);
    setText("visitsThisMonth", 0, 0);
    setText("visitsAllTime", 0, 0);
  }
}

async function loadMetrics() {
  // Defaults so you never stay on —
  setText("totalOrders", 0);
  setText("totalRevenue", "£0.00");
  setText("totalProducts", 0);
  setText("visitsToday", 0);
  setText("visitsThisMonth", 0);
  setText("visitsAllTime", 0);

  try {
    const [ordersSnap, productsSnap] = await Promise.all([
      getDocs(collection(db, "Orders")),
      getDocs(collection(db, "Products")),
    ]);

    const orders = ordersSnap.docs.map((d) => d.data());
    const totalRevenue = orders.reduce((acc, o) => acc + calcOrderTotal(o), 0);

    setText("totalOrders", orders.length, 0);
    setText("totalRevenue", `£${totalRevenue.toFixed(2)}`, "£0.00");
    setText("totalProducts", productsSnap.size, 0);

    await loadVisitsSummary();
  } catch (err) {
    console.error("[Metrics] loadMetrics failed:", err);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadMetrics, { once: true });
} else {
  loadMetrics();
}

auth.onAuthStateChanged?.((user) => {
  if (user) loadVisitsSummary();
});
