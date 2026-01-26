/**
 * SnapStream - Upload JavaScript (REAL Flask Upload)
 * Uploads media file to Flask backend: POST /api/upload
 */

let selectedFile = null;

document.addEventListener("DOMContentLoaded", async () => {
  // protect page
  if (window.requireAuth) {
    const ok = await window.requireAuth();
    if (!ok) return;
  }

  initUpload();
});

function initUpload() {
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const browseBtn = document.getElementById("browse-btn");
  const uploadForm = document.getElementById("upload-form");

  if (!uploadArea || !fileInput || !uploadForm) return;

  // Click upload area opens file manager
  uploadArea.addEventListener("click", () => {
    fileInput.click();
  });

  // Browse button opens file manager
  if (browseBtn) {
    browseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    });
  }

  // File selection
  fileInput.addEventListener("change", (e) => {
    handleFileSelect(e.target.files);
  });

  // Drag and drop
  uploadArea.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  });

  uploadArea.addEventListener("dragleave", () => {
    uploadArea.classList.remove("dragover");
  });

  uploadArea.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
    handleFileSelect(e.dataTransfer.files);
  });

  // Submit upload
  uploadForm.addEventListener("submit", handleUpload);
}

function handleFileSelect(files) {
  if (!files || files.length === 0) return;

  const file = files[0];

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "video/mp4",
    "audio/mpeg", // mp3
    "audio/wav",
  ];

  const maxSize = 100 * 1024 * 1024; // 100MB

  if (!allowedTypes.includes(file.type)) {
    window.showToast?.(
      "Invalid file type. Allowed: JPG, PNG, GIF, MP4, MP3, WAV",
      "error"
    );
    return;
  }

  if (file.size > maxSize) {
    window.showToast?.("File too large. Maximum size is 100MB", "error");
    return;
  }

  selectedFile = file;
  showFilePreview(file);
}

function showFilePreview(file) {
  const uploadArea = document.getElementById("upload-area");
  const filePreview = document.getElementById("file-preview");
  const previewName = document.getElementById("preview-name");
  const previewSize = document.getElementById("preview-size");
  const previewType = document.getElementById("preview-type");
  const previewIcon = document.getElementById("preview-icon");
  const uploadBtn = document.getElementById("upload-btn");

  uploadArea.classList.add("hidden");
  filePreview.classList.remove("hidden");
  uploadBtn.disabled = false;

  previewName.textContent = file.name;

  const sizeText = window.formatFileSize
    ? window.formatFileSize(file.size)
    : `${(file.size / 1024).toFixed(2)} KB`;
  previewSize.textContent = sizeText;

  previewType.textContent = file.type.split("/")[0].toUpperCase();

  const type = window.getFileType ? window.getFileType(file.name) : "image";
  previewIcon.innerHTML = getFileIcon(type);
}

function clearFilePreview() {
  const uploadArea = document.getElementById("upload-area");
  const filePreview = document.getElementById("file-preview");
  const fileInput = document.getElementById("file-input");
  const uploadBtn = document.getElementById("upload-btn");

  selectedFile = null;
  fileInput.value = "";

  uploadArea.classList.remove("hidden");
  filePreview.classList.add("hidden");
  uploadBtn.disabled = true;

  resetProgress();
}

async function handleUpload(e) {
  e.preventDefault();

  if (!selectedFile) {
    window.showToast?.("Please select a file to upload", "error");
    return;
  }

  const tags = document.getElementById("custom-tags")?.value || "";

  const uploadBtn = document.getElementById("upload-btn");
  const progressSection = document.getElementById("progress-section");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = "Uploading...";
  progressSection.classList.remove("hidden");

  const formData = new FormData();
  formData.append("file", selectedFile);
  formData.append("custom_tags", tags); // Flask expects custom_tags

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/api/upload", true);
  xhr.withCredentials = true;

  xhr.upload.onprogress = (event) => {
    if (event.lengthComputable) {
      const percent = (event.loaded / event.total) * 100;
      progressBar.style.width = `${percent}%`;
      progressText.textContent = `${Math.round(percent)}%`;
    }
  };

  xhr.onload = () => {
    try {
      const data = JSON.parse(xhr.responseText || "{}");

      if (xhr.status >= 200 && xhr.status < 300 && data.success) {
        progressBar.style.width = `100%`;
        progressText.textContent = `100%`;

        window.showToast?.("Upload Successful! Redirecting to My Media...", "success");

        showUploadSuccess();

        // ✅ BEST: redirect so My Media will fetch fresh data
        setTimeout(() => {
          window.location.href = "/media";
        }, 1000);

      } else {
        window.showToast?.(data.message || "Upload failed", "error");
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = "Upload";
        progressSection.classList.add("hidden");
      }
    } catch (err) {
      window.showToast?.("Upload failed (invalid server response)", "error");
      uploadBtn.disabled = false;
      uploadBtn.innerHTML = "Upload";
      progressSection.classList.add("hidden");
    }
  };

  xhr.onerror = () => {
    window.showToast?.("Server error. Please try again.", "error");
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = "Upload";
    progressSection.classList.add("hidden");
  };

  xhr.send(formData);
}

function showUploadSuccess() {
  const successSection = document.getElementById("success-section");
  const progressSection = document.getElementById("progress-section");
  const uploadBtn = document.getElementById("upload-btn");

  progressSection.classList.add("hidden");
  successSection.classList.remove("hidden");
  uploadBtn.classList.add("hidden");
}

function resetProgress() {
  const progressSection = document.getElementById("progress-section");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");
  const successSection = document.getElementById("success-section");
  const uploadBtn = document.getElementById("upload-btn");

  if (progressSection) progressSection.classList.add("hidden");
  if (progressBar) progressBar.style.width = "0%";
  if (progressText) progressText.textContent = "0%";
  if (successSection) successSection.classList.add("hidden");

  if (uploadBtn) {
    uploadBtn.classList.remove("hidden");
    uploadBtn.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      Upload
    `;
  }
}

function startNewUpload() {
  clearFilePreview();
}

function getFileIcon(type) {
  const icons = {
    image: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <circle cx="8.5" cy="8.5" r="1.5"></circle>
      <polyline points="21 15 16 10 5 21"></polyline>
    </svg>`,
    video: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="23 7 16 12 23 17 23 7"></polygon>
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
    </svg>`,
    audio: `<svg width="48" height="48" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18V5l12-2v13"></path>
      <circle cx="6" cy="18" r="3"></circle>
      <circle cx="18" cy="16" r="3"></circle>
    </svg>`,
  };

  return icons[type] || icons.image;
}

// Export for inline onclick
window.clearFilePreview = clearFilePreview;
window.startNewUpload = startNewUpload;
