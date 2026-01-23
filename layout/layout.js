// layout/layout.js
// Loads shared layout partials (sidebar/header/bottom nav) into slots on each page.

import { auth } from "../firebase.js";
import { signOut } from "https://www.gstatic.com/firebasejs/11.8.1/firebase-auth.js";

async function inject(slotId, fileName) {
  const slot = document.getElementById(slotId);
  if (!slot) return;

  // Resolve relative to this file (so it works from any folder/page)
  const url = new URL(fileName, import.meta.url);

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load ${url}`);

  slot.innerHTML = await res.text();
}

function getActiveKey() {
  // Prefer explicit page key if you set it later
  const explicit = document.body?.dataset?.page;
  if (explicit) return explicit;

  const p = window.location.pathname;

  if (p === "/" || p.endsWith("/index.html")) return "home";
  if (p.includes("/product-management")) return "product-management";
  if (p.includes("/order-management")) return "order-management";
  if (p.includes("/site-design")) return "site-design";
  if (p.includes("/settings")) return "settings";

  return "";
}

function setActiveNav() {
  const key = getActiveKey();
  if (!key) return;

  document.querySelectorAll("[data-nav]").forEach((el) => {
    const isActive = el.dataset.nav === key;
    el.classList.toggle("active", isActive);
    if (isActive) el.setAttribute("aria-current", "page");
    else el.removeAttribute("aria-current");
  });
}

function wireLogout() {
  const btn =
    document.getElementById("logoutLink") ||
    document.getElementById("logoutBtn");

  if (!btn) return;

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    try {
      await signOut(auth);
      window.location.href = "/login.html";
    } catch (err) {
      console.error("Logout failed:", err);
      alert("Couldn't log out. Try again.");
    }
  });
}

async function initLayout() {
  // Mark pages that use the injected layout so legacy global CSS can be safely scoped.
  document.body.classList.add("layout-v2");

  // These slots won't exist yet until we update a page later — that's fine.
  await inject("sidebar-slot", "sidebar.html");
  await inject("header-slot", "header.html");
  await inject("bottomnav-slot", "bottom-nav.html");

  setActiveNav();
  wireLogout();
}

initLayout().catch(console.error);
