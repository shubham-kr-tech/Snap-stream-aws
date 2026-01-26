/**
 * SnapStream - Notifications JavaScript
 * Handles notifications page functionality
 */

// Declare required variables and functions
let requireAuth = () => true; // Placeholder for requireAuth function
let showToast = (message, type) => console.log(`${type}: ${message}`); // Placeholder for showToast function
let formatDate = (timestamp) => timestamp; // Placeholder for formatDate function
let showConfirm = (title, message, callback) => callback(); // Placeholder for showConfirm function

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;
  initNotifications();
});

/**
 * Initialize notifications page
 */
async function initNotifications() {
  await loadNotifications();
}

/**
 * Load notifications
 */
async function loadNotifications() {
  const container = document.getElementById('notifications-container');
  if (!container) return;
  
  // Show loading state
  container.innerHTML = createNotificationsSkeleton(5);
  
  try {
    // Simulated API call - replace with actual API
    const response = await simulateGetNotifications();
    
    if (response.success && response.notifications.length > 0) {
      renderNotifications(response.notifications);
    } else {
      renderEmptyNotifications();
    }
  } catch (error) {
    console.error('Failed to load notifications:', error);
    showToast('Failed to load notifications', 'error');
    container.innerHTML = '<p class="text-center" style="padding: 2rem;">Failed to load notifications</p>';
  }
}

/**
 * Render notifications list
 */
function renderNotifications(notifications) {
  const container = document.getElementById('notifications-container');
  
  container.innerHTML = notifications.map(notification => `
    <div class="notification-card ${notification.read ? '' : 'unread'}" data-id="${notification.id}">
      <div class="notification-icon">
        ${getNotificationIcon(notification.type)}
      </div>
      <div class="notification-content">
        <div class="notification-title">${notification.title}</div>
        <div class="notification-message">${notification.message}</div>
        <div class="notification-time">${formatDate(notification.timestamp)}</div>
      </div>
      <div class="notification-actions">
        ${!notification.read ? `<button class="btn btn-sm btn-secondary" onclick="markAsRead('${notification.id}')">Mark as read</button>` : ''}
      </div>
    </div>
  `).join('');
}

/**
 * Render empty notifications state
 */
function renderEmptyNotifications() {
  const container = document.getElementById('notifications-container');
  
  container.innerHTML = `
    <div class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <h3>No notifications</h3>
      <p>You're all caught up! New notifications will appear here.</p>
    </div>
  `;
}

/**
 * Get notification icon based on type
 */
function getNotificationIcon(type) {
  const icons = {
    success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    warning: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
  };
  return icons[type] || icons.info;
}

/**
 * Create notifications skeleton loader
 */
function createNotificationsSkeleton(count) {
  let html = '';
  for (let i = 0; i < count; i++) {
    html += `
      <div class="notification-card">
        <div class="skeleton" style="width: 2.5rem; height: 2.5rem; border-radius: 50%;"></div>
        <div class="notification-content" style="flex: 1;">
          <div class="skeleton" style="width: 40%; height: 1rem; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="width: 80%; height: 0.875rem; margin-bottom: 0.5rem;"></div>
          <div class="skeleton" style="width: 30%; height: 0.75rem;"></div>
        </div>
      </div>
    `;
  }
  return html;
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId) {
  try {
    // Simulated API call - replace with actual API
    await simulateMarkAsRead(notificationId);
    
    const card = document.querySelector(`.notification-card[data-id="${notificationId}"]`);
    if (card) {
      card.classList.remove('unread');
      const actionsDiv = card.querySelector('.notification-actions');
      if (actionsDiv) actionsDiv.innerHTML = '';
    }
    
    showToast('Notification marked as read', 'success');
  } catch (error) {
    showToast('Failed to mark notification as read', 'error');
  }
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead() {
  try {
    // Simulated API call - replace with actual API
    await simulateMarkAllAsRead();
    
    document.querySelectorAll('.notification-card.unread').forEach(card => {
      card.classList.remove('unread');
      const actionsDiv = card.querySelector('.notification-actions');
      if (actionsDiv) actionsDiv.innerHTML = '';
    });
    
    showToast('All notifications marked as read', 'success');
  } catch (error) {
    showToast('Failed to mark all notifications as read', 'error');
  }
}

/**
 * Clear all notifications
 */
function clearAllNotifications() {
  showConfirm('Clear All Notifications', 'Are you sure you want to clear all notifications? This action cannot be undone.', async () => {
    try {
      // Simulated API call - replace with actual API
      await simulateClearAllNotifications();
      renderEmptyNotifications();
      showToast('All notifications cleared', 'success');
    } catch (error) {
      showToast('Failed to clear notifications', 'error');
    }
  });
}

// =====================
// Simulated API Calls
// =====================

/**
 * Simulate get notifications API call (replace with actual API)
 */
async function simulateGetNotifications() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        notifications: [
          {
            id: '1',
            type: 'success',
            title: 'Analysis Complete',
            message: 'Your video "product_demo.mp4" has been analyzed successfully.',
            timestamp: '2026-01-24 10:45',
            read: false,
          },
          {
            id: '2',
            type: 'info',
            title: 'Upload Successful',
            message: 'Your file "team_photo.jpg" has been uploaded and is being processed.',
            timestamp: '2026-01-24 10:15',
            read: false,
          },
          {
            id: '3',
            type: 'error',
            title: 'Processing Failed',
            message: 'Failed to process "interview_recording.wav". Please try uploading again.',
            timestamp: '2026-01-23 16:45',
            read: true,
          },
          {
            id: '4',
            type: 'warning',
            title: 'Storage Limit Warning',
            message: 'You have used 80% of your storage quota. Consider upgrading your plan.',
            timestamp: '2026-01-22 09:00',
            read: true,
          },
          {
            id: '5',
            type: 'success',
            title: 'Transcription Complete',
            message: 'Transcription for "podcast_episode.mp3" is now available.',
            timestamp: '2026-01-21 14:30',
            read: true,
          },
        ],
      });
    }, 600);
  });
}

/**
 * Simulate mark as read API call (replace with actual API)
 */
async function simulateMarkAsRead(notificationId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 300);
  });
}

/**
 * Simulate mark all as read API call (replace with actual API)
 */
async function simulateMarkAllAsRead() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 300);
  });
}

/**
 * Simulate clear all notifications API call (replace with actual API)
 */
async function simulateClearAllNotifications() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ success: true });
    }, 300);
  });
}

// Export functions
window.markAsRead = markAsRead;
window.markAllAsRead = markAllAsRead;
window.clearAllNotifications = clearAllNotifications;
