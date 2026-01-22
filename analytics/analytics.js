import { db } from "../firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

function toNumber(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function sumOrderTotal(items) {
  return (items || []).reduce((acc, item) => {
    const price = toNumber(item.price);
    const qty = toNumber(item.qty ?? item.quantity ?? 0);
    return acc + price * qty;
  }, 0);
}

function formatGBP(amount) {
  return `£${amount.toFixed(2)}`;
}

async function loadAnalytics() {
  // ---- Orders + revenue + daily sales ----
  const orderSnap = await getDocs(collection(db, "Orders"));

  let totalOrders = 0;
  let totalRevenue = 0;
  const salesByDay = {}; // YYYY-MM-DD => revenue

  orderSnap.forEach((docSnap) => {
    totalOrders++;

    const data = docSnap.data();

    const items = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data.Items)
        ? data.Items
        : [];

    const orderTotal = sumOrderTotal(items);
    totalRevenue += orderTotal;

    const dateObj = data.createdAt?.toDate ? data.createdAt.toDate() : null;
    if (dateObj) {
      const dayKey = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
      salesByDay[dayKey] = (salesByDay[dayKey] || 0) + orderTotal;
    }
  });

  // ---- Products count ----
  const productSnap = await getDocs(collection(db, "Products"));
  const totalProducts = productSnap.size;

  // ---- Paint totals ----
  document.getElementById("totalOrders").textContent = totalOrders;
  document.getElementById("totalRevenue").textContent = formatGBP(totalRevenue);
  document.getElementById("totalProducts").textContent = totalProducts;

  // Visits placeholders (wired in Step 2)
  document.getElementById("visitsToday").textContent = "—";
  document.getElementById("visitsMonth").textContent = "—";
  document.getElementById("visitsAllTime").textContent = "—";

  // ---- Simple sales chart (last 14 days) ----
  const allDays = Object.keys(salesByDay).sort(); // YYYY-MM-DD sorts correctly
  const lastDays = allDays.slice(-14);

  const labels = lastDays.map((d) =>
    new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" })
  );

  const values = lastDays.map((d) => salesByDay[d] || 0);

  const canvas = document.getElementById("salesChart");
  if (canvas && window.Chart) {
    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Sales (£)",
            data: values
          }
        ]
      },
      options: {
        responsive: true,
        scales: {
          y: { beginAtZero: true }
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", loadAnalytics);
