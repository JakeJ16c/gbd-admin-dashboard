import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js';
import { collection, getDocs, doc, deleteDoc } from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';

const orderList = document.getElementById('orderList');
const productList = document.getElementById('productList');
const logoutBtn = document.getElementById('logoutBtn');

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    alert("You must be logged in.");
    window.location.href = './login.html';
  } else {
    loadOrders();
    loadProducts();
  }
});

// Logout button
logoutBtn.addEventListener('click', async () => {
  await signOut(auth);
  window.location.href = './login.html';
});

async function loadOrders() {
  const ordersRef = collection(db, "Orders");
  const snapshot = await getDocs(ordersRef);
  orderList.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    orderList.innerHTML += `<div><strong>${data.name}</strong> - £${data.total || 0}</div>`;
  });
}

async function loadProducts() {
  const productsRef = collection(db, "Products");
  const snapshot = await getDocs(productsRef);
  productList.innerHTML = "";
  snapshot.forEach(doc => {
    const data = doc.data();
    productList.innerHTML += `<div><strong>${data.name}</strong> - £${data.price} <button onclick="deleteProduct('${doc.id}')">Delete</button></div>`;
  });
}

window.deleteProduct = async function(id) {
  if (confirm("Delete this product?")) {
    await deleteDoc(doc(db, "Products", id));
    loadProducts();
  }
};

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
