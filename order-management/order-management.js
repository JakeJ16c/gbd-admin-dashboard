import {
  collection,
  doc,
  updateDoc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import { db, messaging } from '../firebase.js';
import { getToken } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-messaging.js";

// ✅ Format Firestore timestamp
function formatDate(timestamp) {
  const date = timestamp.toDate();
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${day}/${month}/${year} @ ${hours}:${minutes} ${ampm}`;
}

// ✅ Get FCM token and store to Firestore
async function setupPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BKWmwmuEDejKmOZEFLtWAgZXD2OUPqS_77NA6hTEf9-9SXDG9fJh0EZDG7qExr8IDrRiHVPSNvbXohUKsV12ueA",
        serviceWorkerRegistration: registration
      });

      console.log("✅ FCM Token:", token);
      await setDoc(doc(db, "adminTokens", "admin"), { token });
      console.log("📦 Token saved");
    } else {
      console.warn("❌ Notification permission denied");
    }
  } catch (err) {
    console.error("❌ FCM Setup Error:", err);
  }
}

// ✅ Load & watch orders in real-time
function loadOrdersLive() {
  const ordersRef = collection(db, "Orders");
  const container = document.getElementById("orderList");
  const urlParams = new URLSearchParams(window.location.search);
  const selectedOrderId = urlParams.get("orderId");

  onSnapshot(ordersRef, (snapshot) => {
    container.innerHTML = "";

    if (snapshot.empty) {
      container.innerHTML = "<p>No orders found.</p>";
      return;
    }

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const orderId = docSnap.id;
      const shouldOpen = selectedOrderId === orderId;

      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.Items)
          ? data.Items
          : [];

      const subtotal = items.reduce((acc, item) => {
        return acc + (parseFloat(item.price || 0) * parseFloat(item.qty || 0));
      }, 0);

      const createdAt = data.createdAt?.toDate
        ? formatDate(data.createdAt)
        : "Unknown";

      const orderCard = document.createElement("div");
      orderCard.className = "order-card";

      // ✅ Dynamic badge + card coloring
      const bgColor = {
        confirmed: '#cce5ff',
        cancelled: '#f8d7da',
        ready: '#fff3cd',
        dispatched: '#d1ecf1',
        delivered: '#d4edda'
      }[data.status] || '#eee';

      const textColor = {
        confirmed: '#004085',
        cancelled: '#721c24',
        ready: '#856404',
        dispatched: '#0c5460',
        delivered: '#155724'
      }[data.status] || '#555';

      orderCard.innerHTML = `
      <button class="order-toggle" style="
        width: 100%;
        border: none;
        background: #eeeeee;
        padding: 14px 18px;
        text-align: left;
        font-size: 1rem;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top-left-radius: 12px;
        border-top-right-radius: 12px;
        cursor: pointer;
      ">
        <span>${data.name || 'Unnamed'} – Order ${data.orderNumber || 'N/A'}</span>
        <span class="status-badge" style="
          font-size: 0.85rem;
          padding: 4px 10px;
          border-radius: 15px;
          background-color: ${bgColor};
          color: ${textColor};
        ">${data.status}</span>
      </button>

      <div class="order-content" style="
        display: ${shouldOpen ? 'block' : 'none'};
        background: white;
        padding: 16px;
        border-bottom-left-radius: 12px;
        border-bottom-right-radius: 12px;
      ">
        <p><strong>Email:</strong> ${data.email || "no@email.com"}</p>
        <p><strong>Address:</strong><br>${
          typeof data.address === "object"
            ? `
              ${data.address.houseNumber ? `<strong>House Number:</strong> ${data.address.houseNumber}<br>` : ""}
              ${data.address.street ? `<strong>Street:</strong> ${data.address.street}<br>` : ""}
              ${data.address.city ? `<strong>City:</strong> ${data.address.city}<br>` : ""}
              ${data.address.county ? `<strong>County:</strong> ${data.address.county}<br>` : ""}
              ${data.address.postcode ? `<strong>Postcode:</strong> ${data.address.postcode}` : ""}
            `.trim()
            : `${data.address || 'No address provided'}`
        }</p>
        <p><strong>Status:</strong> 
          <select class="status-dropdown" data-id="${orderId}" style="
            margin-top: 5px;
            padding: 6px 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 0.9rem;
          ">
            <option value="Confirmed" ${data.status === "Confirmed" ? "selected" : ""}>Confirmed</option>
            <option value="Cancelled" ${data.status === "Cancelled" ? "selected" : ""}>Cancelled</option>
            <option value="Ready" ${data.status === "Ready" ? "selected" : ""}>Ready To Ship</option>
            <option value="Dispatched" ${data.status === "Dispatched" ? "selected" : ""}>Dispatched</option>
            <option value="Delivered" ${data.status === "Delivered" ? "selected" : ""}>Delivered</option>
          </select>
        </p>
        <ul style="margin: 15px 0; padding: 0; list-style: none;">
          ${items.map(item => `
            <li style="background: #f8f8f8; padding: 10px; margin-bottom: 5px; border-radius: 5px;">
              ${item.productName} × ${item.qty} — £${(item.price * item.qty).toFixed(2)}
            </li>
          `).join("")}
        </ul>
        <p><strong>Subtotal:</strong> £${subtotal.toFixed(2)}</p>
        <p><strong>Placed:</strong> ${createdAt}</p>
      </div>
    `;

      orderCard.style.cssText = `
        background-color: ${bgColor};
        color: ${textColor};
        margin-bottom: 20px;
        border-radius: 12px;
      `;

      orderCard.querySelector('.order-toggle').addEventListener('click', () => {
        const content = orderCard.querySelector('.order-content');
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      });

      container.appendChild(orderCard);
    });

    enableUIHandlers();
  });
}

// ✅ Dropdown logic: change order status and reflect immediately
function enableUIHandlers() {
  document.querySelectorAll(".collapsible").forEach(btn => {
    btn.addEventListener("click", () => {
      const content = btn.nextElementSibling;
      content.style.display = content.style.display === "block" ? "none" : "block";
    });
  });

  document.querySelectorAll(".status-dropdown").forEach(dropdown => {
    dropdown.addEventListener("change", async (e) => {
      const orderId = e.target.dataset.id;
      const newStatus = e.target.value;

      try {
        const orderRef = doc(db, "Orders", orderId);
        await updateDoc(orderRef, { status: newStatus });
        alert(`Order updated to "${newStatus}"`);

        // ✅ Update badge text + colors immediately
        const card = e.target.closest('.order-card');
        const badge = card.querySelector('.status-badge');

        badge.textContent = newStatus;

        const bgColor = {
          confirmed: '#cce5ff',
          cancelled: '#f8d7da',
          ready: '#fff3cd',
          dispatched: '#d1ecf1',
          delivered: '#d4edda'
        }[newStatus] || '#eee';

        const textColor = {
          confirmed: '#004085',
          cancelled: '#721c24',
          ready: '#856404',
          dispatched: '#0c5460',
          delivered: '#155724'
        }[newStatus] || '#555';

        badge.style.backgroundColor = bgColor;
        badge.style.color = textColor;
        card.style.backgroundColor = bgColor;
        card.style.color = textColor;

      } catch (err) {
        console.error("Failed to update status:", err);
        alert("Failed to update order status.");
      }
    });
  });
}

// ✅ Init
setupPushNotifications();
loadOrdersLive();
