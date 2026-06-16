// Global State
let allReleases = [];
let currentFilter = 'all';

// DOM Elements
const releasesContainer = document.getElementById('releases-container');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const displayedCount = document.getElementById('displayed-count');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const themeIcon = document.getElementById('theme-icon');

// Modal Elements
const previewModal = document.getElementById('preview-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalReleaseBody = document.getElementById('modal-release-body');
const modalTweetText = document.getElementById('modal-tweet-text');
const modalEmailTextarea = document.getElementById('modal-email-textarea');
const modalCopyBtn = document.getElementById('modal-copy-btn');
const modalCopyEmailBtn = document.getElementById('modal-copy-email-btn');
const modalTweetBtn = document.getElementById('modal-tweet-btn');

// State for Modal
let modalReleaseId = null;

// Initialize Theme Immediately to prevent flicker
const savedTheme = localStorage.getItem('theme') || 'dark';
if (savedTheme === 'light') {
    document.body.classList.add('light-theme');
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
} else {
    document.body.classList.remove('light-theme');
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchReleases();
    setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
    refreshBtn.addEventListener('click', fetchReleases);
    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }
    if (themeToggleBtn) {
        themeIcon.className = document.body.classList.contains('light-theme') ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.toggle('light-theme');
            localStorage.setItem('theme', isLight ? 'light' : 'dark');
            themeIcon.className = isLight ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
        });
    }
    
    // Search Filter
    searchInput.addEventListener('input', filterAndRenderReleases);
    
    // Category Filter Buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            const button = e.currentTarget;
            button.classList.add('active');
            currentFilter = button.getAttribute('data-category');
            filterAndRenderReleases();
        });
    });

    // Close Modal Listeners
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closePreviewModal);
    }
    if (previewModal) {
        previewModal.addEventListener('click', (e) => {
            if (e.target === previewModal) {
                closePreviewModal();
            }
        });
    }
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !previewModal.classList.contains('hidden')) {
            closePreviewModal();
        }
    });

    // Modal Action Buttons
    if (modalCopyBtn) {
        modalCopyBtn.addEventListener('click', () => {
            const item = allReleases.find(r => r.id === modalReleaseId);
            if (!item) return;

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = item.content;
            const textToCopy = `${item.title}\nDate: ${item.date}\nCategory: ${item.category}\n\n${tempDiv.textContent || tempDiv.innerText}`;

            copyTextToClipboard(textToCopy, modalCopyBtn, "Copy Note");
        });
    }

    if (modalCopyEmailBtn) {
        modalCopyEmailBtn.addEventListener('click', () => {
            if (modalEmailTextarea) {
                copyTextToClipboard(modalEmailTextarea.value, modalCopyEmailBtn, "Copy Email");
            }
        });
    }

    if (modalTweetBtn) {
        modalTweetBtn.addEventListener('click', () => {
            if (modalTweetText) {
                const tweetText = modalTweetText.textContent;
                if (!tweetText) return;
                const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                window.open(intentUrl, '_blank');
            }
        });
    }
}

// Fetch Release Notes from API
async function fetchReleases() {
    showLoader(true);
    refreshIcon.classList.add('spin');
    refreshBtn.disabled = true;

    try {
        const response = await fetch('/api/releases');
        if (!response.ok) {
            throw new Error('Failed to fetch release notes from server');
        }
        const data = await response.json();
        allReleases = data.releases || [];
        
        updateCategoryCounts();
        filterAndRenderReleases();
    } catch (error) {
        console.error('Error loading release notes:', error);
        releasesContainer.innerHTML = `
            <div class="placeholder-card" style="grid-column: 1/-1;">
                <i class="fa-solid fa-triangle-exclamation" style="color: var(--color-fix); font-size: 3rem;"></i>
                <h3>Error Loading Release Notes</h3>
                <p>${error.message}. Please try refreshing in a few moments.</p>
            </div>
        `;
    } finally {
        showLoader(false);
        refreshIcon.classList.remove('spin');
        refreshBtn.disabled = false;
    }
}

// Update the Badge numbers in the Sidebar
function updateCategoryCounts() {
    const counts = {
        Feature: 0,
        Update: 0,
        Fix: 0,
        Deprecation: 0
    };

    allReleases.forEach(item => {
        if (counts.hasOwnProperty(item.category)) {
            counts[item.category]++;
        }
    });

    document.getElementById('count-feature').textContent = counts.Feature;
    document.getElementById('count-update').textContent = counts.Update;
    document.getElementById('count-fix').textContent = counts.Fix;
    document.getElementById('count-deprecation').textContent = counts.Deprecation;
}

// Filter and Render Releases
function filterAndRenderReleases() {
    const searchQuery = searchInput.value.toLowerCase().trim();
    
    const filtered = allReleases.filter(item => {
        const matchesCategory = currentFilter === 'all' || item.category === currentFilter;
        const matchesSearch = item.title.toLowerCase().includes(searchQuery) || 
                              item.content.toLowerCase().includes(searchQuery) ||
                              item.date.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    displayedCount.textContent = filtered.length;

    if (filtered.length === 0) {
        releasesContainer.innerHTML = `
            <div class="placeholder-card" style="grid-column: 1/-1;">
                <i class="fa-solid fa-folder-open" style="font-size: 3rem;"></i>
                <h3>No Release Notes Found</h3>
                <p>Try clearing your search query or choosing a different filter.</p>
            </div>
        `;
        return;
    }

    releasesContainer.innerHTML = filtered.map(item => {
        return `
            <article class="release-card category-${item.category.toLowerCase()}">
                <div class="release-header">
                    <div class="meta-group">
                        <span class="category-tag">${item.category}</span>
                        <span class="release-date">
                            <i class="fa-regular fa-calendar"></i> ${item.date}
                        </span>
                    </div>
                </div>
                <h3 class="release-title">${item.title}</h3>
                <div class="release-body">${item.content}</div>
                <div class="release-actions">
                    <button class="btn btn-primary preview-btn" onclick="openPreviewModal('${item.id}')">
                        <i class="fa-solid fa-eye"></i> Preview Note
                    </button>
                    <button class="btn btn-secondary link-btn" onclick="window.open('${item.link}', '_blank')" ${item.link ? '' : 'disabled'}>
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> Source
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// Modal View Controls
window.openPreviewModal = function(id) {
    const item = allReleases.find(r => r.id === id);
    if (!item) return;

    modalReleaseId = id;

    // Apply formatted release HTML body
    modalReleaseBody.innerHTML = `
        <h3 style="font-family: var(--font-heading); margin-bottom: 8px; font-size: 1.15rem; color: var(--text-main);">${item.title}</h3>
        <div style="font-size: 0.8rem; margin-bottom: 16px; color: var(--text-muted);">
            <span class="category-tag" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 0.7rem; background-color: var(--border-color);">${item.category}</span> 
            &nbsp;•&nbsp; ${item.date}
        </div>
        <div>${item.content}</div>
    `;

    // Compose Tweet Draft
    let emoji = '🚀';
    if (item.category === 'Fix') emoji = '🐛';
    if (item.category === 'Deprecation') emoji = '⚠️';
    if (item.category === 'Update') emoji = '⚙️';

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.content;
    let plainText = tempDiv.textContent || tempDiv.innerText || "";
    plainText = plainText.replace(/\s+/g, ' ').trim();
    if (plainText.length > 140) {
        plainText = plainText.substring(0, 137) + '...';
    }
    const tweetText = `Google BigQuery ${item.category} ${emoji}\n\n${plainText}\n\n#BigQuery #GCP #DataEngineering`;
    modalTweetText.textContent = tweetText;

    // Compose Email Draft Text
    const emailDraftText = `Hi Team,\n\nHere is a new Google BigQuery release note update published on ${item.date}:\n\nTitle: ${item.title}\nCategory: ${item.category}\n\nDetails:\n${tempDiv.textContent || tempDiv.innerText}\n\nView original release note: ${item.link}\n\nBest regards,`;
    modalEmailTextarea.value = emailDraftText;

    // Show the Modal Overlay
    previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Disable background scrolling
};

function closePreviewModal() {
    previewModal.classList.add('hidden');
    document.body.style.overflow = ''; // Re-enable background scrolling
}

// Copy Helper function with success UI states
function copyTextToClipboard(text, buttonEl, originalLabel) {
    navigator.clipboard.writeText(text).then(() => {
        const originalHTML = buttonEl.innerHTML;
        buttonEl.innerHTML = `<i class="fa-solid fa-check" style="color: var(--color-feature);"></i> Copied!`;
        buttonEl.disabled = true;
        setTimeout(() => {
            buttonEl.innerHTML = originalHTML;
            buttonEl.disabled = false;
        }, 1500);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
}

// Export all fetched Release Notes to CSV
function exportToCSV() {
    if (allReleases.length === 0) {
        alert("No release notes available to export.");
        return;
    }

    const headers = ["ID", "Title", "Date", "Category", "Content", "Link"];
    const rows = allReleases.map(item => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = item.content;
        const cleanContent = (tempDiv.textContent || tempDiv.innerText).replace(/"/g, '""');
        
        return [
            `"${item.id.replace(/"/g, '""')}"`,
            `"${item.title.replace(/"/g, '""')}"`,
            `"${item.date.replace(/"/g, '""')}"`,
            `"${item.category.replace(/"/g, '""')}"`,
            `"${cleanContent.replace(/\r?\n|\r/g, " ")}"`,
            `"${item.link.replace(/"/g, '""')}"`
        ];
    });

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility Loader Toggle
function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
        releasesContainer.classList.add('hidden');
    } else {
        loader.classList.add('hidden');
        releasesContainer.classList.remove('hidden');
    }
}
