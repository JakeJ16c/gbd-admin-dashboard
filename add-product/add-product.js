import { auth, db } from "../firebase.js";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js";

// --------------------
// DOM
// --------------------
const form = document.getElementById("addProductForm");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const nameEl = document.getElementById("name");
const categoryEl = document.getElementById("category");
const designEl = document.getElementById("design");
const priceEl = document.getElementById("price");
const descEl = document.getElementById("description");
const weightEl = document.getElementById("weight");

const sizeModeWrap = document.getElementById("sizeMode");
const oneSizeStockWrap = document.getElementById("oneSizeStockWrap");
const multiSizeWrap = document.getElementById("multiSizeWrap");
const stockOneEl = document.getElementById("stockOne");
const sizesList = document.getElementById("sizesList");
const addSizeBtn = document.getElementById("addSizeBtn");

const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("imageInput");
const previewGrid = document.getElementById("previewGrid");

const storage = getStorage();

// --------------------
// Helpers
// --------------------
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeFileName(name) {
  return String(name || "file")
    .trim()
    .replace(/[^a-z0-9.]+/gi, "_");
}

function setSaving(isSaving) {
  saveBtn.disabled = isSaving;
  cancelBtn.disabled = isSaving;
  saveBtn.textContent = isSaving ? "Saving..." : "Save Product";
}

function getCheckedValue(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

async function ensureNamedDoc(collectionName, name) {
  const n = String(name || "").trim();
  if (!n) return;

  const slug = slugify(n);
  if (!slug) return;

  const refDoc = doc(db, collectionName, slug);
  const snap = await getDoc(refDoc);

  if (!snap.exists()) {
    // Use merge so we never clobber if you later add fields
    await setDoc(
      refDoc,
      { name: n, createdAt: new Date() },
      { merge: true }
    );
  }
}

// --------------------
// Size UI
// --------------------
function addSizeRow(size = "", qty = "") {
  const row = document.createElement("div");
  row.className = "addp-size-row";

  row.innerHTML = `
    <input class="size-name" type="text" placeholder="Size (e.g. S)" value="${String(size).replace(/"/g, "&quot;")}">
    <input class="size-qty" type="number" min="0" placeholder="Qty" value="${String(qty).replace(/"/g, "&quot;")}">
    <button type="button" class="size-remove" aria-label="Remove size">✕</button>
  `;

  row.querySelector(".size-remove").addEventListener("click", () => {
    row.remove();
  });

  sizesList.appendChild(row);
}

function setMode(mode) {
  if (mode === "one") {
    oneSizeStockWrap.style.display = "block";
    multiSizeWrap.style.display = "none";
  } else {
    oneSizeStockWrap.style.display = "none";
    multiSizeWrap.style.display = "block";
    if (!sizesList.children.length) addSizeRow();
  }
}

// Initial mode from checked radio
setMode(getCheckedValue("sizes") || "one");

sizeModeWrap.addEventListener("change", (e) => {
  if (e.target?.name !== "sizes") return;
  setMode(e.target.value);
});

addSizeBtn.addEventListener("click", () => addSizeRow());

// --------------------
// Image handling
// --------------------
let selectedFiles = []; // File[]
let previewUrls = [];   // string[] (object URLs)

function clearPreviews() {
  previewUrls.forEach((u) => URL.revokeObjectURL(u));
  previewUrls = [];
  previewGrid.innerHTML = "";
}

function renderPreviews() {
  clearPreviews();

  selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    previewUrls.push(url);

    const card = document.createElement("div");
    card.className = "addp-preview-card";
    card.innerHTML = `
      <img src="${url}" alt="">
      <button type="button" class="addp-preview-remove" aria-label="Remove image">✕</button>
    `;

    card.querySelector(".addp-preview-remove").addEventListener("click", () => {
      selectedFiles.splice(idx, 1);
      renderPreviews();
    });

    previewGrid.appendChild(card);
  });
}

function addFiles(files) {
  const incoming = Array.from(files || []).filter(Boolean);

  // Keep it sane (optional cap)
  const MAX = 12;
  selectedFiles = selectedFiles.concat(incoming).slice(0, MAX);

  renderPreviews();
}

dropzone.addEventListener("click", () => imageInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  addFiles(e.dataTransfer?.files);
});

imageInput.addEventListener("change", (e) => {
  addFiles(e.target.files);
  // allow selecting same file again
  imageInput.value = "";
});

// --------------------
// Navigation
// --------------------
cancelBtn.addEventListener("click", () => {
  window.location.href = "/product-management/";
});

// --------------------
// SAVE
// --------------------
saveBtn.addEventListener("click", async () => {
  // Basic auth sanity check
  if (!auth.currentUser) {
    alert("You're not logged in. Please refresh and sign in again.");
    return;
  }

  const name = nameEl.value.trim();
  const category = categoryEl.value.trim();
  const design = designEl.value.trim();
  const description = descEl.value.trim();

  const price = parseFloat(priceEl.value);
  const weight = parseFloat(weightEl.value || "0");

  const sizesMode = getCheckedValue("sizes") || "one";
  const oneSizeOnly = sizesMode === "one";

  const publishChoice = getCheckedValue("publish") || "archived";
  const archived = publishChoice === "archived";
  const published = publishChoice === "published";

  // This is what your product-management table reads to show Published/Draft
  const visibility = published ? "published" : "draft";

  // Stock
  let stock;
  if (oneSizeOnly) {
    stock = parseInt(stockOneEl.value || "0", 10);
    if (Number.isNaN(stock)) stock = 0;
  } else {
    const stockObj = {};
    const rows = sizesList.querySelectorAll(".addp-size-row");
    rows.forEach((row) => {
      const s = row.querySelector(".size-name")?.value?.trim();
      const q = parseInt(row.querySelector(".size-qty")?.value || "0", 10);
      if (!s) return;
      stockObj[s] = Number.isNaN(q) ? 0 : q;
    });
    stock = stockObj;
  }

  // Validation (match how your existing modal behaves)
  if (!name) return alert("Product name is required.");
  if (Number.isNaN(price)) return alert("Please enter a valid price.");
  if (!category) return alert("Category is required.");
  if (!design) return alert("Design is required.");

  if (!oneSizeOnly && (!stock || Object.keys(stock).length === 0)) {
    return alert("Please add at least one size with stock.");
  }

  setSaving(true);

  try {
    // Keep your supporting collections in sync
    await ensureNamedDoc("Categories", category);
    await ensureNamedDoc("Designs", design);

    // Upload images (same style as your existing product-management)
    const imageUrls = [];
    for (const file of selectedFiles) {
      const path = `products/${Date.now()}_${safeFileName(file.name)}`;
      const fileRef = ref(storage, path);

      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);
      imageUrls.push(url);
    }

    // Final product payload (schema aligned to your existing system)
    const productData = {
      name,
      price,
      category,
      design,
      description,
      images: imageUrls,
      stock,
      oneSizeOnly,
      archived,
      published,
      visibility,
      weight: Number.isNaN(weight) ? 0 : weight,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await addDoc(collection(db, "Products"), productData);

    // Done
    window.location.href = "/product-management/";
  } catch (err) {
    console.error("Add Product failed:", err);

    // Make the popup actually useful
    const msg =
      err?.message ||
      err?.code ||
      "Unknown error. Check console for details.";

    alert(`Couldn't save product:\n${msg}`);
  } finally {
    setSaving(false);
  }
});
