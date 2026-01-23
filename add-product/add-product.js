// add-product/add-product.js
// Saves products using the SAME schema style as your existing Products page (products.js)

import { db } from "../firebase.js";

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
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const sizeMode = document.getElementById("sizeMode");
const oneSizeStockWrap = document.getElementById("oneSizeStockWrap");
const multiSizeWrap = document.getElementById("multiSizeWrap");
const sizesList = document.getElementById("sizesList");
const addSizeBtn = document.getElementById("addSizeBtn");

const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("imageInput");
const thumbs = document.getElementById("thumbs");

// Fields
const nameEl = document.getElementById("name");
const priceEl = document.getElementById("price");
const categoryEl = document.getElementById("category");
const designEl = document.getElementById("design");
const descEl = document.getElementById("desc");
const stockOneEl = document.getElementById("stockOne");

// (These exist in HTML but we won't save them to match old schema)
const skuEl = document.getElementById("sku");
const weightEl = document.getElementById("weight");

// --------------------
// State
// --------------------
const storage = getStorage();
let selectedFiles = []; // File[]
const MAX_IMAGES = 10;
const MAX_MB = 10;

// --------------------
// Navigation
// --------------------
cancelBtn.addEventListener("click", () => {
  window.location.href = "/product-management/";
});

// --------------------
// Sizes UI
// --------------------
sizeMode.addEventListener("change", (e) => {
  if (e.target.name !== "sizes") return;

  const mode = e.target.value;

  if (mode === "one") {
    oneSizeStockWrap.style.display = "block";
    multiSizeWrap.style.display = "none";
  } else {
    oneSizeStockWrap.style.display = "none";
    multiSizeWrap.style.display = "block";
    if (!sizesList.children.length) addSizeRow();
  }
});

function addSizeRow(size = "", qty = "") {
  const row = document.createElement("div");
  row.className = "addp-size-row";
  row.innerHTML = `
    <input class="size-name" type="text" placeholder="Size (e.g. S)" value="${size}">
    <input class="size-qty" type="number" min="0" placeholder="Qty" value="${qty}">
  `;
  sizesList.appendChild(row);
}

addSizeBtn.addEventListener("click", () => addSizeRow());

// --------------------
// Images (click + drag/drop)
// --------------------
dropzone.addEventListener("click", () => imageInput.click());

dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");
  handleFiles(Array.from(e.dataTransfer.files || []));
});

imageInput.addEventListener("change", (e) => {
  handleFiles(Array.from(e.target.files || []));
  imageInput.value = "";
});

function handleFiles(files) {
  const incoming = files.filter((f) => f.type.startsWith("image/"));
  if (!incoming.length) return;

  for (const f of incoming) {
    const mb = f.size / (1024 * 1024);
    if (mb > MAX_MB) {
      alert(`"${f.name}" is larger than ${MAX_MB}MB.`);
      return;
    }
  }

  const spaceLeft = MAX_IMAGES - selectedFiles.length;
  if (spaceLeft <= 0) {
    alert(`You can upload up to ${MAX_IMAGES} images.`);
    return;
  }

  selectedFiles = selectedFiles.concat(incoming.slice(0, spaceLeft));
  renderThumbs();
}

function renderThumbs() {
  thumbs.innerHTML = "";
  selectedFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const card = document.createElement("div");
    card.className = "addp-thumb";
    card.innerHTML = `
      <img src="${url}" alt="">
      <button class="addp-thumb-x" type="button" title="Remove">×</button>
    `;
    card.querySelector("button").onclick = () => {
      selectedFiles.splice(idx, 1);
      renderThumbs();
    };
    thumbs.appendChild(card);
  });
}

// --------------------
// Helpers (match existing style)
// --------------------
function slugify(str) {
  return String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function ensureDocIfMissing(collectionName, name) {
  const n = String(name || "").trim();
  if (!n) return;

  const slug = slugify(n);
  const refDoc = doc(db, collectionName, slug);

  const snap = await getDoc(refDoc);
  if (snap.exists()) return;

  // Match your existing pattern: { name, createdAt: new Date() }
  await setDoc(refDoc, { name: n, createdAt: new Date() });
}

function getPublishValue() {
  return document.querySelector('input[name="publish"]:checked')?.value || "live";
}

function getSizesMode() {
  return document.querySelector('input[name="sizes"]:checked')?.value || "one";
}

function buildStock() {
  const mode = getSizesMode();

  if (mode === "one") {
    const qty = parseInt(stockOneEl.value || "0", 10);
    if (Number.isNaN(qty) || qty < 0) {
      return { ok: false, message: "Stock must be 0 or more." };
    }
    return { ok: true, oneSizeOnly: true, stock: qty };
  }

  const rows = Array.from(sizesList.querySelectorAll(".addp-size-row"));
  const stockObj = {};

  for (const r of rows) {
    const size = r.querySelector(".size-name")?.value.trim();
    const qtyRaw = r.querySelector(".size-qty")?.value;
    const qty = parseInt(qtyRaw || "0", 10);

    if (!size) continue;
    if (Number.isNaN(qty) || qty < 0) {
      return { ok: false, message: "Each size quantity must be 0 or more." };
    }

    stockObj[size] = qty;
  }

  if (!Object.keys(stockObj).length) {
    return { ok: false, message: "Add at least one size with stock." };
  }

  return { ok: true, oneSizeOnly: false, stock: stockObj };
}

function sanitizeFileName(name) {
  return String(name || "image").replace(/[^a-z0-9.]/gi, "_").slice(0, 120);
}

// --------------------
// Save Product
// --------------------
saveBtn.addEventListener("click", async () => {
  // 1) Collect + validate
  const name = nameEl.value.trim();
  const price = parseFloat(priceEl.value);
  const category = categoryEl.value.trim();
  const design = designEl.value.trim();
  const description = descEl.value.trim();

  if (!name) return alert("Product name is required.");
  if (Number.isNaN(price)) return alert("Price is required.");
  if (!category) return alert("Category is required.");
  if (!design) return alert("Design is required.");
  if (!description) return alert("Description is required.");
  if (!selectedFiles.length) return alert("Please add at least 1 product image.");

  const stockRes = buildStock();
  if (!stockRes.ok) return alert(stockRes.message);

  // Publish mode controls archived (matches your Products list behaviour)
  const publish = getPublishValue(); // draft | live
  const archived = publish !== "live";

  // 2) Lock UI
  saveBtn.disabled = true;
  const prevText = saveBtn.textContent;
  saveBtn.textContent = "Saving...";

  try {
    // 3) Ensure category/design docs (matches existing approach)
    await ensureDocIfMissing("Categories", category);
    await ensureDocIfMissing("Designs", design);

    // 4) Upload images first (matches old uploader style)
    const urls = [];

    for (const file of selectedFiles) {
      const path = `products/${Date.now()}_${sanitizeFileName(file.name)}`;
      const imageRef = ref(storage, path);

      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      urls.push(url);
    }

    // 5) Build product doc (match your existing schema)
    const data = {
      name,
      price,
      stock: stockRes.stock,
      oneSizeOnly: stockRes.oneSizeOnly,
      description,
      images: urls,
      category,
      design,
      archived,
      updatedAt: new Date(),
      createdAt: new Date()
    };

    await addDoc(collection(db, "Products"), data);

    // 6) Done
    window.location.href = "/product-management/";
  } catch (err) {
    console.error("Add Product failed:", err);
    alert("Couldn’t save product. Open console for details.");
    saveBtn.disabled = false;
    saveBtn.textContent = prevText;
  }
});
