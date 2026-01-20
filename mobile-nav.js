// mobile-nav.js (Admin) — works from root + subfolders

import { auth } from "./firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

const bottomNavHTML = `
  <nav class="bottom-nav" aria-label="Admin navigation">
    <a href="/index.html" data-key="home">
      <i class="fa-solid fa-house"></i>
      <span>Home</span>
    </a>

    <a href="/product-management/" data-key="products">
      <i class="fa-solid fa-store"></i>
      <span>Products</span>
    </a>

    <a href="/orders.html" data-key="orders">
      <i class="fa-solid fa-box"></i>
      <span>Orders</span>
    </a>

    <a href="/site-design.html" data-key="design">
      <i class="fa-solid fa-paint-brush"></i>
      <span>Design</span>
    </a>

    <button type="button" data-key="more" data-action="open-more">
      <i class="fa-solid fa-ellipsis"></i>
      <span>More</span>
    </button>
  </nav>

  <div class="more-sheet" id="moreSheet" aria-hidden="true">
    <div class="more-sheet__backdrop" data-action="close-more"></div>
    <div class="more-sheet__panel" role="dialog" aria-label="More options">
      <div class="more-sheet__handle"></div>

      <a class="more-sheet__link" href="/settings.html">
        <i class="fa-solid fa-cog"></i>
        <span>Settings</span>
      </a>

      <a class="more-sheet__link" href="/analytics.html">
        <i class="fa-solid fa-chart-line"></i>
        <span>Analytics</span>
      </a>

      <a class="more-sheet__link" href="/reviews.html">
        <i class="fa-solid fa-star"></i>
        <span>Reviews</span>
      </a>

      <a class="more-sheet__link" href="/index.html#admin-promo">
        <i class="fa-solid fa-tag"></i>
        <span>Promo Codes</span>
      </a>

      <a class="more-sheet__link more-sheet__danger" href="#" id="mobileLogoutBtn">
        <i class="fa-solid fa-right-from-bracket"></i>
        <span>Log Out</span>
      </a>
    </div>
  </div>
`;

function getActiveKey() {
  const p = window.location.pathname;

  if (p === "/" || p.endsWith("/index.html")) return "home";
  if (p.startsWith("/product-management")) return "products";
  if (p.endsWith("/orders.html")) return "orders";
  if (p.endsWith("/site-design.html")) return "design";

  if (
    p.endsWith("/settings.html") ||
    p.endsWith("/analytics.html") ||
    p.endsWith("/reviews.html")
  ) {
    return "more";
  }

  return "home";
}

function setActiveBottomNav() {
  const activeKey = getActiveKey();
  const nav = document.querySelector(".bottom-nav");
  if (!nav) return;

  nav.querySelectorAll("a,button").forEach(el => el.classList.remove("active"));

  const activeEl = nav.querySelector(`[data-key="${activeKey}"]`);
  if (activeEl) activeEl.classList.add("active");
}

function openMore() {
  const sheet = document.getElementById("moreSheet");
  if (!sheet) return;
  sheet.classList.add("show");
  sheet.setAttribute("aria-hidden", "false");
  document.body.classList.add("more-open");
}

function closeMore() {
  const sheet = document.getElementById("moreSheet");
  if (!sheet) return;
  sheet.classList.remove("show");
  sheet.setAttribute("aria-hidden", "true");
  document.body.classList.remove("more-open");
}

async function doLogout() {
  try { await signOut(auth); } catch (e) {}
  window.location.href = "/login.html";
}

function init() {
  if (!document.querySelector(".bottom-nav")) {
    document.body.insertAdjacentHTML("beforeend", bottomNavHTML);
  }

  setActiveBottomNav();

  const openBtn = document.querySelector('[data-action="open-more"]');
  if (openBtn) openBtn.addEventListener("click", openMore);

  document.querySelectorAll('[data-action="close-more"]').forEach(el => {
    el.addEventListener("click", closeMore);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMore();
  });

  const mobileLogout = document.getElementById("mobileLogoutBtn");
  if (mobileLogout) {
    mobileLogout.addEventListener("click", (e) => {
      e.preventDefault();
      closeMore();
      doLogout();
    });
  }

  document.querySelectorAll("#moreSheet a.more-sheet__link").forEach(a => {
    if (a.id === "mobileLogoutBtn") return;
    a.addEventListener("click", closeMore);
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
