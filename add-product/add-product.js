// add-product/add-product.js
import { db, storage } from "../firebase.js";

import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

/* ---------------------------
   Element helpers
--------------------------- */
const $ = (id) => document.getElementById(id);

const cancelBtn = $("cancelBtn");
const saveBtn = $("saveBtn");

const sizeMode = $("sizeMode");
const oneSizeStockWrap = $("oneSizeStockWrap");
const multiSizeWrap = $("multiSizeWrap");
const sizesList = $("sizesList");
const addSizeBtn = $("addSizeBtn");

const dropzone = $("dropzone");
const imageInput = $("imageInput");
const thumbs = $("thumbs");

// Form fields (match your index.html ids)
const nameEl = $("name");
const priceEl = $("price");
const categoryEl = $("category");
const skuEl = $("sku");
const designEl = $("design");
const descEl = $("desc");
const weightEl = $("weight");

const stockOneEl = $("stockOne");

/* ---------------------------
   State
--------------------------- */
let selectedFiles = []; // File[]
let isSaving = false;

/* ---------------------------
   Nav
--------------------------- */
cancelBtn?.addEventListener("click", () => {
  window.location.href = "/product-management/";
});

/* ---------------------------
   Size mode toggle
--------------------------- */
function showOneSize() {
  oneSizeStockWrap.style.display = "block";
  multiSizeWrap.style.display = "none";
}
function showMultiSize() {
  oneSizeStockWrap.style.display = "none";
  multiSizeWrap.style.display = "block";
  if (!sizesList.children.length) addSizeRow();
}

sizeMode?.addEventListener("change", (e) => {
  if (e.target?.name !== "sizes") return;
  const mode = e.target.value;
  if (mode === "one") showOneSize();
  else showMultiSize();
});

// Default view
showOneSize();

function addSizeRow(size = "", qty = "") {
  const row = document.createElement("div");
  row.className = "addp-size-row";
  row.innerHTML = `
    <input class="size-name" type="text" placeholder="Size (e.g. S)" value="${escapeHtml(size)}">
    <input class="size-qty" type="number" min="0" placeholder="Qty" value="${escapeHtml(qty)}">
  `;
  sizesList.appendChild(row);
}

addSizeBtn?.addEventListener("click", () => addSizeRow());

/* ---------------------------
   Images: click + drag/drop + previews
--------------------------- */
dropzone?.addEventListener("click", () => imageInput?.click());

dropzone?.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "rgba(32,78,207,0.6)";
});

dropzone?.addEventListener("dragleave", () => {
  dropzone.style.borderColor = "rgba(0,0,0,0.18)";
});

dropzone?.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.style.borderColor = "rgba(0,0,0,0.18)";
  const files = Array.from(e.dataTransfer?.files || []);
  addFiles(files);
});

imageInput?.addEventListener("change", (e) => {
  const files = Array.from(e.target.files || []);
  addFiles(files);
  imageInput.value = ""; // allow selecting same file again
});

function addFiles(files) {
  // Basic filters
  const valid = files.filter((f) => f && f.type && f.type.startsWith("image/"));
  if (!valid.length) return;

  // Enforce max 10 images
  const spaceLeft = 10 - selectedFiles.length;
  if (spaceLeft <= 0) {
    alert("You can upload up to 10 images.");
    return;
  }

  const toAdd = valid.slice(0, spaceLeft);

  // Enforce ~10MB per image (matches UI text)
  for (const f of toAdd) {
    if (f.size > 10 * 1024 * 1024) {
      alert(`"${f.name}" is over 10MB. Please choose a smaller image.`);
      return;
    }
  }

  selectedFiles = selectedFiles.concat(toAdd);
  renderThumbs();
}

function renderThumbs() {
  if (!thumbs) return; // safety
  thumbs.innerHTML = "";

  selectedFiles.forEach((file, idx) => {
    const wrap = document.createElement("div");
    wrap.style.position = "relative";
    wrap.style.borderRadius = "12px";
    wrap.style.overflow = "hidden";
    wrap.style.border = "1px solid rgba(0,0,0,0.10)";
    wrap.style.background = "#fff";
    wrap.style.aspectRatio = "1 / 1";

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src);
    img.style.width = "100%";
    img.style.height = "100%";
    img.style.objectFit = "cover";
    wrap.appendChild(img);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove";
    remove.style.position = "absolute";
    remove.style.top = "6px";
    remove.style.right = "6px";
    remove.style.width = "26px";
    remove.style.height = "26px";
    remove.style.borderRadius = "999px";
    remove.style.border = "none";
    remove.style.cursor = "pointer";
    remove.style.background = "rgba(0,0,0,0.65)";
    remove.style.color = "#fff";
    remove.style.fontSize = "18px";
    remove.style.lineHeight = "26px";
    remove.style.padding = "0";

    remove.addEventListener("click", () => {
      selectedFiles.splice(idx, 1);
      renderThumbs();
    });

    wrap.appendChild(remove);
    thumbs.appendChild(wrap);
  });
}

/* ---------------------------
   Save to Firestore + Storage
   (matches old schema your Products page expects)
--------------------------- */
saveBtn?.addEventListener("click", async () => {
  if (isSaving) return;

  try {
    isSaving = true;
    setSavingState(true);

    const payload = await buildPayload();
    const imageUrls = await uploadSelectedImages();

    payload.images = imageUrls;

    // Keep Categories/Designs collections in sync (optional but helpful)
    await ensureNamedDoc("Categories", payload.category);
    if (payload.design) await ensureNamedDoc("Designs", payload.design);

    await addDoc(collection(db, "Products"), payload);

    alert("✅ Product created!");
    window.location.href = "/product-management/";
  } catch (err) {
    console.error("Add Product failed:", err);
    alert("Couldn't save product. Open console for details.");
  } finally {
    isSaving = false;
    setSavingState(false);
  }
});

function setSavingState(on) {
  if (!saveBtn) return;
  saveBtn.disabled = on;
  saveBtn.textContent = on ? "Saving..." : "Save Product";
}

async function buildPayload() {
  const name = (nameEl?.value || "").trim();
  const priceNum = Number(priceEl?.value);
  const category = (categoryEl?.value || "").trim();
  const sku = (skuEl?.value || "").trim();
  const designRaw = (designEl?.value || "").trim();
  const description = (descEl?.value || "").trim();
  const weightKg = weightEl?.value === "" ? null : Number(weightEl.value);

  const publish = document.querySelector('input[name="publish"]:checked')?.value || "draft";
  const archived = publish === "draft";

  const sizesMode = document.querySelector('input[name="sizes"]:checked')?.value || "one";
  const oneSizeOnly = sizesMode === "one";

  // Validation (keep it strict where it matters)
  if (!name) throw new Error("Missing name");
  if (!category) throw new Error("Missing category");
  if (!description) throw new Error("Missing description");
  if (Number.isNaN(priceNum) || priceNum <= 0) throw new Error("Invalid price");

  // Design: optional in your UI; BUT your existing system expects a design string.
  // So we default it if blank.
  const design = designRaw || "General";

  // Stock shape must match old schema:
  // - oneSizeOnly true => stock: number
  // - oneSizeOnly false => stock: { S: 10, M: 4, ... }
  let stock;

  if (oneSizeOnly) {
    const qty = Number(stockOneEl?.value);
    if (Number.isNaN(qty) || qty < 0) throw new Error("Invalid one-size stock");
    stock = qty;
  } else {
    const obj = {};
    const rows = Array.from(sizesList?.querySelectorAll(".addp-size-row") || []);
    rows.forEach((r) => {
      const s = (r.querySelector(".size-name")?.value || "").trim();
      const q = Number(r.querySelector(".size-qty")?.value);
      if (s && !Number.isNaN(q) && q >= 0) obj[s] = q;
    });
    if (Object.keys(obj).length === 0) throw new Error("Add at least one size with stock");
    stock = obj;
  }

  // Images are uploaded separately; we require at least 1 selected
  if (selectedFiles.length === 0) throw new Error("No images selected");

  return {
    name,
    price: priceNum,
    category,
    design,
    description,
    images: [],

    // old schema fields
    oneSizeOnly,
    stock,
    archived,

    // optional extras (won’t break old pages)
    sku: sku || null,
    weightKg: weightKg === null || Number.isNaN(weightKg) ? null : weightKg,

    createdAt: serverTimestamp()
  };
}

async function uploadSelectedImages() {
  const urls = [];
  for (const file of selectedFiles) {
    const safeName = file.name.replace(/[^a-z0-9.]/gi, "_");
    const path = `products/${Date.now()}_${safeName}`;
    const imageRef = ref(storage, path);
    await uploadBytes(imageRef, file);
    const url = await getDownloadURL(imageRef);
    urls.push(url);
  }
  return urls;
}

/* ---------------------------
   Categories / Designs helper
--------------------------- */
function slugify(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function ensureNamedDoc(collectionName, name) {
  const clean = (name || "").trim();
  if (!clean) return;

  const slug = slugify(clean);
  const refDoc = doc(db, collectionName, slug);
  const snap = await getDoc(refDoc);
  if (snap.exists()) return;

  await setDoc(refDoc, {
    name: clean,
    createdAt: serverTimestamp()
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}
