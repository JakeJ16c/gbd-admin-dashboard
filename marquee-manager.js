// Import Firebase database and storage utilities
import { db, storage } from './firebase.js';
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL
} from 'https://www.gstatic.com/firebasejs/11.8.1/firebase-storage.js';

// Reference to the marquee container
const container = document.getElementById('marquee-editor');

// Load existing marquee items from Firestore
async function loadMarqueeImages() {
  container.innerHTML = '';
  const snap = await getDocs(collection(db, 'marqueeImages'));

  snap.forEach(docSnap => {
    const data = docSnap.data();
    const div = document.createElement('div');
    div.classList.add('marquee-item');
    div.innerHTML = `
      <div class="marquee-image-wrapper">
        <img src="${data.imageUrl}" alt="${data.name}">
        <div class="edit-overlay">
          <i class="fas fa-pen"></i>
          <input class="edit-input" type="file" accept="image/*" data-id="${docSnap.id}">
        </div>
      </div>
      <div class="marquee-meta">
        <input type="text" value="${data.name}" data-id="${docSnap.id}">
        <button class="delete-btn" data-id="${docSnap.id}" title="Delete">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(div);
  });

  // Add the + item for creating new marquee images
  const addDiv = document.createElement('div');
  addDiv.className = 'marquee-item';
  addDiv.innerHTML = `
    <div class="marquee-add-wrapper" id="add-marquee">
      <i class="fas fa-plus"></i>
    </div>
    <div style="height: 1rem;"></div>
  `;
  container.appendChild(addDiv);
}

// Create a new empty marquee image document
async function addMarqueeItem() {
  await addDoc(collection(db, 'marqueeImages'), {
    name: 'New Item',
    imageUrl: '',
    createdAt: Date.now()
  });
  loadMarqueeImages();
}

// Listen for file/image or text input changes
container.addEventListener('change', async (e) => {
  if (e.target.classList.contains('edit-input')) {
    const id = e.target.dataset.id;
    const file = e.target.files[0];
    if (!file) return;
    const path = `marquee/${Date.now()}_${file.name.replace(/[^a-z0-9.]/gi, '_')}`;
    const fileRef = ref(storage, path);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);
    await updateDoc(doc(db, 'marqueeImages', id), { imageUrl: url });
    loadMarqueeImages();
  }

  if (e.target.matches('input[type="text"]')) {
    const id = e.target.dataset.id;
    await updateDoc(doc(db, 'marqueeImages', id), { name: e.target.value.trim() });
  }
});

// Handle click actions (Add or Delete buttons)
container.addEventListener('click', (e) => {
  if (e.target.closest('#add-marquee')) {
    addMarqueeItem();
  }

  if (e.target.closest('.delete-btn')) {
    const id = e.target.closest('.delete-btn').dataset.id;
    const modal = document.getElementById('confirm-modal');
    modal.classList.add('active');
    document.getElementById('confirm-delete').dataset.id = id;
  }
});

// Load images when script is initialized
loadMarqueeImages();

// Inject confirmation modal HTML into body
const modal = document.createElement('div');
modal.id = 'confirm-modal';
modal.className = 'confirm-modal';
modal.innerHTML = `
  <div class="modal-content">
    <p>Are you sure you want to delete this image?</p>
    <div class="modal-actions">
      <button id="confirm-delete" class="confirm">Yes, Delete</button>
      <button id="cancel-delete" class="cancel">Cancel</button>
    </div>
  </div>
`;
document.body.appendChild(modal);

// Confirm deletion logic
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');

confirmDeleteBtn.addEventListener('click', async (e) => {
  const id = e.target.dataset.id;
  if (!id) return;
  await deleteDoc(doc(db, 'marqueeImages', id));
  document.getElementById('confirm-modal').classList.remove('active');
  loadMarqueeImages();
});

cancelDeleteBtn.addEventListener('click', () => {
  document.getElementById('confirm-modal').classList.remove('active');
});
