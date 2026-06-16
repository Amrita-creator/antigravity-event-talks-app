// Global State
let allReleases = [];
let selectedRelease = null;
let currentFilter = 'all';

// DOM Elements
const releasesContainer = document.getElementById('releases-container');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('search-input');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const displayedCount = document.getElementById('displayed-count');
const exportCsvBtn = document.getElementById('export-csv-btn');

// Composer DOM Elements
const noSelectionPlaceholder = document.getElementById('no-selection-placeholder');
const composerCard = document.getElementById('composer-card');
const composerCategory = document.getElementById('composer-category');
const composerDate = document.getElementById('composer-date');
const composerTitle = document.getElementById('composer-title');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCountSpan = document.getElementById('char-count');
const progressCircle = document.querySelector('.progress-ring__circle');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const resetTweetBtn = document.getElementById('reset-tweet-btn');
const tweetBtn = document.getElementById('tweet-btn');

// Progress Ring Configuration
const ringRadius = 12;
const ringCircumference = 2 * Math.PI * ringRadius;
if (progressCircle) {
    progressCircle.style.strokeDasharray = `${ringCircumference} ${ringCircumference}`;
    progressCircle.style.strokeDashoffset = ringCircumference;
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

    // Tweet Input Counter & Preview
    tweetTextarea.addEventListener('input', updateTweetComposerStatus);

    // Reset Composer
    resetTweetBtn.addEventListener('click', resetTweetDraft);

    // Open Twitter Web Intent
    tweetBtn.addEventListener('click', publishTweet);
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
                    <button class="btn btn-secondary copy-btn" onclick="copyToClipboard('${item.id}', this)">
                        <i class="fa-regular fa-copy"></i> Copy Note
                    </button>
                    <button class="btn btn-secondary compose-btn" onclick="selectReleaseForTweet('${item.id}')">
                        <i class="fa-solid fa-feather-pointed"></i> Compose Tweet
                    </button>
                </div>
            </article>
        `;
    }).join('');
}

// Select Release Note to Tweet
window.selectReleaseForTweet = function(id) {
    const item = allReleases.find(r => r.id === id);
    if (!item) return;

    selectedRelease = item;
    
    // Toggle sidebars visibility
    noSelectionPlaceholder.classList.add('hidden');
    composerCard.classList.remove('hidden');

    // Populate metadata
    composerCategory.textContent = item.category;
    composerDate.textContent = item.date;
    composerTitle.textContent = item.title;

    // Remove category class and add the correct one
    composerCard.className = `composer-card category-${item.category.toLowerCase()}`;

    // Auto-generate starting Tweet text template
    generateDefaultTweetText(item);
    updateTweetComposerStatus();

    // Scroll composer into view on mobile
    if (window.innerWidth <= 1200) {
        composerCard.scrollIntoView({ behavior: 'smooth' });
    }
};

// Generate default tweet template based on category
function generateDefaultTweetText(item) {
    let emoji = '🚀';
    if (item.category === 'Fix') emoji = '🐛';
    if (item.category === 'Deprecation') emoji = '⚠️';
    if (item.category === 'Update') emoji = '⚙️';

    // Strip HTML to plain text for the preview summary
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.content;
    let plainText = tempDiv.textContent || tempDiv.innerText || "";
    
    // Normalize spaces and trim
    plainText = plainText.replace(/\s+/g, ' ').trim();
    
    // Limit snippet to ~140 chars to fit standard tweets easily
    if (plainText.length > 140) {
        plainText = plainText.substring(0, 137) + '...';
    }

    const tweetText = `Google BigQuery ${item.category} ${emoji}\n\n${plainText}\n\n#BigQuery #GCP #DataEngineering`;
    tweetTextarea.value = tweetText;
}

// Update character limits, Progress Ring, and Live Preview
function updateTweetComposerStatus() {
    const text = tweetTextarea.value;
    const maxChars = 280;
    const remaining = maxChars - text.length;

    charCountSpan.textContent = remaining;

    // Manage color statuses
    const wrapper = document.querySelector('.char-count-container');
    wrapper.classList.remove('char-count-warning', 'char-count-danger');
    
    if (remaining <= 40 && remaining > 0) {
        wrapper.classList.add('char-count-warning');
        if (progressCircle) progressCircle.style.stroke = '#eab308';
    } else if (remaining <= 0) {
        wrapper.classList.add('char-count-danger');
        if (progressCircle) progressCircle.style.stroke = '#f43f5e';
    } else {
        if (progressCircle) progressCircle.style.stroke = '#6366f1';
    }

    // Progress Ring offset
    if (progressCircle) {
        const percentage = Math.max(0, Math.min(100, (text.length / maxChars) * 100));
        const offset = ringCircumference - (percentage / 100) * ringCircumference;
        progressCircle.style.strokeDashoffset = offset;
    }

    // Update Live Preview box
    tweetPreviewText.textContent = text || "(Your tweet text will appear here as a preview)";
    
    // Disable or enable tweet button
    tweetBtn.disabled = text.length === 0 || remaining < 0;
}

// Reset draft to default state
function resetTweetDraft() {
    if (selectedRelease) {
        generateDefaultTweetText(selectedRelease);
        updateTweetComposerStatus();
    }
}

// Open Tweet Composer in New Window (X intent)
function publishTweet() {
    const tweetText = tweetTextarea.value;
    if (!tweetText) return;

    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(intentUrl, '_blank');
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

// Copy Release Note to Clipboard
window.copyToClipboard = function(id, buttonEl) {
    const item = allReleases.find(r => r.id === id);
    if (!item) return;

    // Strip HTML to copy pure text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = item.content;
    const textToCopy = `${item.title}\nDate: ${item.date}\nCategory: ${item.category}\n\n${tempDiv.textContent || tempDiv.innerText}`;

    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalContent = buttonEl.innerHTML;
        buttonEl.innerHTML = `<i class="fa-solid fa-check" style="color: var(--color-feature);"></i> Copied!`;
        buttonEl.disabled = true;
        setTimeout(() => {
            buttonEl.innerHTML = originalContent;
            buttonEl.disabled = false;
        }, 2000);
    }).catch(err => {
        console.error('Could not copy text: ', err);
    });
};

// Export all fetched Release Notes to CSV
function exportToCSV() {
    if (allReleases.length === 0) {
        alert("No release notes available to export.");
        return;
    }

    const headers = ["ID", "Title", "Date", "Category", "Content", "Link"];
    const rows = allReleases.map(item => {
        // Strip html tags from content
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

