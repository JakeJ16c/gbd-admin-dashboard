import { db } from './firebase.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

function sumOrderTotal(items) {
  return items.reduce((acc, item) => {
    const price = parseFloat(item.price || 0);
    const qty = parseFloat(item.qty || 0);
    return acc + price * qty;
  }, 0);
}

async function loadAnalytics() {
  const orderSnap = await getDocs(collection(db, 'Orders'));
  let totalOrders = 0;
  let totalRevenue = 0;
  const salesByDate = {};
  const visitsByDate = {};

  orderSnap.forEach(docSnap => {
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
    const date = dateObj ? dateObj.toLocaleDateString() : 'Unknown';
    salesByDate[date] = (salesByDate[date] || 0) + orderTotal;
  });

  const productSnap = await getDocs(collection(db, 'Products'));
  const totalProducts = productSnap.size;
  const visitSnap = await getDocs(collection(db, 'Visits'));
  const totalVisits = visitSnap.size;
  visitSnap.forEach(docSnap => {
    const data = docSnap.data();
    const dateObj = data.timestamp?.toDate ? data.timestamp.toDate() : null;
    const date = dateObj ? dateObj.toLocaleDateString() : 'Unknown';
    visitsByDate[date] = (visitsByDate[date] || 0) + 1;
  });

  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('totalRevenue').textContent = `£${totalRevenue.toFixed(2)}`;
  document.getElementById('totalProducts').textContent = totalProducts;
  document.getElementById('totalVisits').textContent = totalVisits;

  const labels = Array.from(new Set([...Object.keys(salesByDate), ...Object.keys(visitsByDate)]));

  document.getElementById('totalOrders').textContent = totalOrders;
  document.getElementById('totalRevenue').textContent = `£${totalRevenue.toFixed(2)}`;
  document.getElementById('totalProducts').textContent = totalProducts;

  const ctx = document.getElementById('salesChart').getContext('2d');
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Sales (£)',
        data: labels.map(l => salesByDate[l] || 0),
        backgroundColor: 'rgba(32, 78, 207, 0.6)',
        borderColor: 'rgba(32, 78, 207, 1)',
        borderWidth: 1
      }, {
        label: 'Visits',
        data: labels.map(l => visitsByDate[l] || 0),
        type: 'line',
        borderColor: 'rgba(255, 99, 132, 1)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y1'

      labels: Object.keys(salesByDate),
      datasets: [{
        label: 'Sales (£)',
        data: Object.values(salesByDate),
        backgroundColor: 'rgba(32, 78, 207, 0.6)',
        borderColor: 'rgba(32, 78, 207, 1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        y: { beginAtZero: true, position: 'left' },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
        y: { beginAtZero: true, position: 'left' },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false } }
        y: { beginAtZero: true }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', loadAnalytics);
