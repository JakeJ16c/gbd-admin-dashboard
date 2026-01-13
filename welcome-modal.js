// Welcome Modal Editor - Full-Screen Inline Editing
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-firestore.js";

// Default modal data
const defaultModalData = {
  headline: "Welcome to You're So Golden!",
  message: "Explore our handcrafted bead collections and unique gifts.",
  cta: "Shop Now",
  backgroundColor: "#fff3cd",
  ctaColor: "#204ECF",
  image: "./image0.jpeg"
};

// Check if Firebase is available
function isFirebaseAvailable() {
  return typeof db !== 'undefined' && db !== null;
}

// Get modal data from localStorage as fallback
function getLocalModalData() {
  try {
    const stored = localStorage.getItem('welcomeModalData');
    return stored ? JSON.parse(stored) : defaultModalData;
  } catch (e) {
    console.warn('Error reading from localStorage:', e);
    return defaultModalData;
  }
}

// Save modal data to localStorage as fallback
function saveLocalModalData(data) {
  try {
    localStorage.setItem('welcomeModalData', JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('Error saving to localStorage:', e);
    return false;
  }
}

// Load modal data from Firebase or localStorage
async function loadModalData() {
  let data = defaultModalData;
  
  try {
    if (isFirebaseAvailable()) {
      const ref = doc(db, "SiteSettings", "WelcomeModal");
      const snap = await getDoc(ref);
      if (snap.exists()) {
        data = { ...defaultModalData, ...snap.data() };
      }
    } else {
      console.log('Firebase not available, using localStorage');
      data = getLocalModalData();
    }
  } catch (error) {
    console.warn('Error loading modal data:', error);
    data = getLocalModalData();
  }

  return data;
}

// Update preview with current data
function updatePreview(data) {
  const elements = {
    headline: document.getElementById("preview-headline"),
    message: document.getElementById("preview-message"),
    cta: document.getElementById("preview-cta"),
    image: document.getElementById("previewImage"),
    previewBox: document.getElementById("welcomePreviewBox")
  };

  if (elements.headline) elements.headline.textContent = data.headline;
  if (elements.message) elements.message.textContent = data.message;
  if (elements.cta) elements.cta.textContent = data.cta;
  if (elements.image) elements.image.src = data.image;
  
  if (elements.previewBox) {
    elements.previewBox.style.backgroundColor = data.backgroundColor;
  }
  
  if (elements.cta) {
    elements.cta.style.backgroundColor = data.ctaColor;
  }
}

// Update full-screen modal with current data
function updateFullscreenModal(data) {
  const elements = {
    headline: document.getElementById("fullscreenHeadline"),
    message: document.getElementById("fullscreenMessage"),
    cta: document.getElementById("fullscreenCTA"),
    image: document.getElementById("fullscreenModalImage"),
    bgColor: document.getElementById("fullscreenBgColor"),
    ctaColor: document.getElementById("fullscreenCtaColor"),
    modal: document.getElementById("fullscreenModal")
  };

  if (elements.headline) elements.headline.textContent = data.headline;
  if (elements.message) elements.message.textContent = data.message;
  if (elements.cta) elements.cta.textContent = data.cta;
  if (elements.image) elements.image.src = data.image;
  if (elements.bgColor) elements.bgColor.value = data.backgroundColor;
  if (elements.ctaColor) elements.ctaColor.value = data.ctaColor;
  
  if (elements.modal) {
    elements.modal.style.backgroundColor = data.backgroundColor;
  }
  
  if (elements.cta) {
    elements.cta.style.backgroundColor = data.ctaColor;
  }
}

// Open full-screen modal for editing
function openFullscreenModal() {
  const backdrop = document.getElementById("fullscreenModalBackdrop");
  if (backdrop) {
    backdrop.classList.remove("hidden");
    // Load current data into the modal
    loadModalData().then(data => {
      updateFullscreenModal(data);
    });
  }
}

// Close full-screen modal
function closeFullscreenModal() {
  const backdrop = document.getElementById("fullscreenModalBackdrop");
  if (backdrop) {
    backdrop.classList.add("hidden");
  }
}

// Get current data from full-screen modal
function getCurrentModalData() {
  const elements = {
    headline: document.getElementById("fullscreenHeadline"),
    message: document.getElementById("fullscreenMessage"),
    cta: document.getElementById("fullscreenCTA"),
    image: document.getElementById("fullscreenModalImage"),
    bgColor: document.getElementById("fullscreenBgColor"),
    ctaColor: document.getElementById("fullscreenCtaColor")
  };

  return {
    headline: elements.headline?.textContent || defaultModalData.headline,
    message: elements.message?.textContent || defaultModalData.message,
    cta: elements.cta?.textContent || defaultModalData.cta,
    backgroundColor: elements.bgColor?.value || defaultModalData.backgroundColor,
    ctaColor: elements.ctaColor?.value || defaultModalData.ctaColor,
    image: elements.image?.src || defaultModalData.image
  };
}

// Save modal data to Firebase and update preview
async function saveModalData() {
  const data = getCurrentModalData();
  
  try {
    if (isFirebaseAvailable()) {
      const ref = doc(db, "SiteSettings", "WelcomeModal");
      await setDoc(ref, data);
      console.log("✅ Modal data saved to Firebase");
    } else {
      saveLocalModalData(data);
      console.log("✅ Modal data saved locally");
    }
    
    // Update preview
    updatePreview(data);
    
    // Close modal
    closeFullscreenModal();
    
    // Show success feedback
    showSaveSuccess();
    
  } catch (error) {
    console.warn("Save failed, using localStorage:", error);
    saveLocalModalData(data);
    updatePreview(data);
    closeFullscreenModal();
    showSaveSuccess();
  }
}

// Show save success feedback
function showSaveSuccess() {
  const saveBtn = document.getElementById("saveChangesBtn");
  if (saveBtn) {
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "✅ Saved!";
    saveBtn.style.background = "#28a745";
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = "#28a745";
    }, 2000);
  }
}

// Handle image upload
function handleImageUpload(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const imageUrl = e.target.result;
    
    // Update both modal image and preview
    const fullscreenImg = document.getElementById("fullscreenModalImage");
    if (fullscreenImg) fullscreenImg.src = imageUrl;
    
    // Auto-save after image upload
    setTimeout(() => {
      saveModalData();
    }, 500);
  };
  reader.readAsDataURL(file);
}

// Apply real-time color changes
function applyColorChanges() {
  const bgColor = document.getElementById("fullscreenBgColor")?.value;
  const ctaColor = document.getElementById("fullscreenCtaColor")?.value;
  const modal = document.getElementById("fullscreenModal");
  const ctaBtn = document.getElementById("fullscreenCTA");

  if (bgColor && modal) {
    modal.style.backgroundColor = bgColor;
  }

  if (ctaColor && ctaBtn) {
    ctaBtn.style.backgroundColor = ctaColor;
  }
}

// Initialize the welcome modal editor
function initializeWelcomeModalEditor() {
  console.log('Welcome Modal Editor: Initializing...');
  
  // Load initial data and update preview
  loadModalData().then(data => {
    updatePreview(data);
  });

  // Add click handler for preview (open full-screen modal)
  const previewBox = document.getElementById("welcomePreviewBox");
  if (previewBox) {
    previewBox.addEventListener('click', openFullscreenModal);
  }

  // Add click handler for close button
  const closeBtn = document.getElementById("modalCloseBtn");
  if (closeBtn) {
    closeBtn.addEventListener('click', closeFullscreenModal);
  }

  // Add click handler for save button
  const saveBtn = document.getElementById("saveChangesBtn");
  if (saveBtn) {
    saveBtn.addEventListener('click', saveModalData);
  }

  // Add change handlers for color pickers
  const bgColorInput = document.getElementById("fullscreenBgColor");
  const ctaColorInput = document.getElementById("fullscreenCtaColor");
  
  if (bgColorInput) {
    bgColorInput.addEventListener('change', applyColorChanges);
  }
  
  if (ctaColorInput) {
    ctaColorInput.addEventListener('change', applyColorChanges);
  }

  // Add image upload handler
  const imageUpload = document.getElementById("fullscreenImageUpload");
  if (imageUpload) {
    imageUpload.addEventListener('change', (e) => {
      handleImageUpload(e.target.files[0]);
    });
  }

  // Close modal when clicking backdrop
  const backdrop = document.getElementById("fullscreenModalBackdrop");
  if (backdrop) {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeFullscreenModal();
      }
    });
  }

  // Handle ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeFullscreenModal();
    }
  });

  console.log('Welcome Modal Editor: Ready!');
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initializeWelcomeModalEditor();
});

// Also initialize immediately in case DOMContentLoaded already fired
if (document.readyState === 'loading') {
  // Still loading, wait for DOMContentLoaded
} else {
  // Already loaded
  initializeWelcomeModalEditor();
}

// Export functions for potential external use
window.welcomeModalEditor = {
  openModal: openFullscreenModal,
  closeModal: closeFullscreenModal,
  saveData: saveModalData,
  loadData: loadModalData
};

