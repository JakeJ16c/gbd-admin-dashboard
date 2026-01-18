const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");

cancelBtn.addEventListener("click", () => {
  window.location.href = "../products.html";
});

saveBtn.addEventListener("click", () => {
  alert("UI works. Next step: wire Firebase save + images + stock.");
});
