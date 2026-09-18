/**
 * COMMON CONFIGURATION
 */

// Dynamically points to local development backend (port 5000) or production host
const API_BASE = (function() {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1' || !host) {
      return 'http://localhost:5000';
    }
    if (window.location.origin.startsWith('http') && !window.location.origin.includes('render.com')) {
      return window.location.origin;
    }
  }
  return 'http://localhost:5000';
})();

const Utils = {
    // Matches the backend's capitalized risk levels to your CSS colors
    getRiskColor: (level) => {
        if (!level) return '#94a3b8';
        const norm = level.toLowerCase();
        if (norm === 'high') return '#ef4444';   // Red
        if (norm === 'medium') return '#eab308'; // Yellow/Amber
        if (norm === 'low') return '#22c55e';    // Green
        return '#94a3b8';
    },

    // Generates the Toast HTML structure defined in your admin.html CSS
    showToast: (title, message, type = 'success') => {
        let container = document.getElementById('toast-container');
        
        // Create container if it doesn't exist (useful for dashboard/login pages)
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        // Icons based on type
        const iconName = type === 'success' ? 'check-circle-2' : 'alert-circle';
        
        toast.innerHTML = `
            <i data-lucide="${iconName}" class="toast-icon ${type}" style="width: 20px; height: 20px;"></i>
            <div class="toast-content">
                <h4>${title}</h4>
                <p>${message}</p>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Initialize the icon for this new element
        if (window.lucide) window.lucide.createIcons();

        // Auto-remove
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
};

/**
 * THEME SYSTEM
 */
const ThemeSystem = {
    init: () => {
        // 1. Check LocalStorage on load
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            ThemeSystem.updateIcon(true);
        } else {
            ThemeSystem.updateIcon(false);
        }
    },

    toggle: () => {
        // 1. Toggle Class
        document.body.classList.toggle('light-mode');
        
        // 2. Save Preference
        const isLight = document.body.classList.contains('light-mode');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        // 3. Update UI Elements
        ThemeSystem.updateIcon(isLight);
        ThemeSystem.updateMap(isLight);
    },

    updateIcon: (isLight) => {
        // Finds the icon inside your toggle button (if it exists)
        const icon = document.getElementById('theme-icon');
        if (icon) {
            // Swaps Sun for Moon
            icon.className = isLight ? 'ri-moon-line' : 'ri-sun-line';
        }
    },

    updateMap: (isLight) => {
        // Checks if a Leaflet map instance exists globally (window.map)
        if (typeof map !== 'undefined' && map) {
            map.eachLayer((layer) => {
                // Finds the TileLayer and swaps the URL
                if (layer instanceof L.TileLayer) {
                    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
                    const lightUrl = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
                    layer.setUrl(isLight ? lightUrl : darkUrl);
                }
            });
        }
    }
};

// Initialize Theme Logic on Load
document.addEventListener('DOMContentLoaded', ThemeSystem.init);