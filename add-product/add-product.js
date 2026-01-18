const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

const sizeMode = document.getElementById("sizeMode");
const oneSizeStockWrap = document.getElementById("oneSizeStockWrap");
const multiSizeWrap = document.getElementById("multiSizeWrap");
const sizesList = document.getElementById("sizesList");
const addSizeBtn = document.getElementById("addSizeBtn");

const dropzone = document.getElementById("dropzone");
const imageInput = document.getElementById("imageInput");

cancelBtn.addEventListener("click", () => {
  window.location.href = "../products.html";
});

saveBtn.addEventListener("click", () => {
  alert("Layout done. Next step: image previews + stock logic + Firestore save.");
});

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

// Click to open file picker (drag/drop previews later)
dropzone.addEventListener("click", () => imageInput.click());
