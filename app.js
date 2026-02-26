/* ========================================
   JOLLYGOOD+ Slide Library - App Logic
   Static file version (FTP deployable)
======================================== */

// PDF.js Configuration
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

// ========================================
// Data Management
// ========================================

// Default PDF list (files in ComicPDF folder)
const DEFAULT_PDFS = [
    { id: 'pdf1', filename: 'A_竹＿大人女子＿補助金戦略.pdf', title: '大人女子 補助金戦略' },
    { id: 'pdf2', filename: 'B_竹コトー補助金_医療教育の突破口.pdf', title: '竹コトー補助金 医療教育の突破口' },
    { id: 'pdf3', filename: 'D_竹＿絶望の戦場.pdf', title: '絶望の戦場' },
    { id: 'pdf4', filename: 'F_竹＿冒険.pdf', title: '冒険' },
    { id: 'pdf5', filename: '人財消失事件の謎.pdf', title: '人財消失事件の謎' },
    { id: 'pdf6', filename: '全院教育DXパッケージ（松プラン）提案書.pdf', title: '全院教育DXパッケージ（松プラン）' },
    { id: 'pdf7', filename: '新人・研修医特化型_教育DXパッケージ「竹プラン」提案書.pdf', title: '新人・研修医特化型 教育DXパッケージ「竹プラン」' },
    { id: 'pdf8', filename: '現場知を未来の標準へ.pdf', title: '現場知を未来の標準へ' },
    { id: 'pdf9', filename: '竹＿経験が自信を変える.pdf', title: '経験が自信を変える' },
    { id: 'pdf10', filename: '部門特化型_教育DXパッケージ「梅プラン」提案書.pdf', title: '部門特化型 教育DXパッケージ「梅プラン」' }
];

// Get PDF metadata from server (data.json)
async function getPdfData() {
    try {
        const response = await fetch('data.json?t=' + new Date().getTime()); // Prevent caching
        if (!response.ok) throw new Error('Data fetch failed');
        const data = await response.json();
        if (!Array.isArray(data) || data.length === 0) {
            console.warn('data.json is empty, using defaults');
            return DEFAULT_PDFS; // Fallback to defaults if server data is empty
        }
        return data;
    } catch (e) {
        console.error('Error fetching data.json:', e);
        // Fallback to localStorage or defaults for offline safety? 
        // For now, sticking to defaults to ensure display.
        return DEFAULT_PDFS;
    }
}

async function savePdfData(data) {
    try {
        const response = await fetch('save-data.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Save failed: ' + response.statusText);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Save failed');
        }
        console.log('Data saved successfully');
    } catch (e) {
        console.error('Error saving data:', e);
        showToast('データの保存に失敗しました');
        throw e;
    }
}

async function getPdfById(id) {
    const pdfs = await getPdfData();
    return pdfs.find(p => p.id === id);
}

async function updatePdf(id, updates) {
    const pdfs = await getPdfData();
    const index = pdfs.findIndex(p => p.id === id);
    if (index !== -1) {
        pdfs[index] = { ...pdfs[index], ...updates };
        await savePdfData(pdfs);
    }
}

// Generate OGP HTML file via PHP
async function generateOgpHtml(pdf) {
    const response = await fetch('generate-ogp.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            pdfId: pdf.id,
            title: pdf.title,
            description: pdf.description || ''
        })
    });
    return response.json();
}

// ========================================
// DOM Elements
// ========================================
const pdfGrid = document.getElementById('pdfGrid');
const viewerModal = document.getElementById('viewerModal');
const adminModal = document.getElementById('adminModal');
const editModal = document.getElementById('editModal');
const pdfCanvas = document.getElementById('pdfCanvas');
const viewerTitle = document.getElementById('viewerTitle');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const ctaSection = document.getElementById('ctaSection');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Viewer state
let currentPdf = null;
let pdfDoc = null;
let currentPage = 1;
let totalPages = 0;
let zoomLevel = 1;

// ========================================
// Google Authentication
// ========================================

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = '1995264722-fs8s2b5jpc8t0d3lpu0e8gpdogjipjrc.apps.googleusercontent.com';
const ALLOWED_DOMAIN = 'jollygood.co.jp';

// Gemini AI is accessed via server-side proxy (gemini-proxy.php)
// API key is stored securely in config.php on the server

let currentUser = null;

const savedUser = localStorage.getItem('googleUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
}
// Update UI immediately (don't wait for Google script)
updateAuthUI();

function initGoogleAuth() {
    if (typeof google === 'undefined') {
        // Google Sign-In not loaded yet, retry
        setTimeout(initGoogleAuth, 100);
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleSignIn,
        auto_select: true,
    });
}

// Helper to safe decode JWT body (Base64Url to Base64)
function decodeJwtResponse(token) {
    let base64Url = token.split('.')[1];
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    return JSON.parse(jsonPayload);
}

function handleGoogleSignIn(response) {
    try {
        // Decode JWT token securely
        const payload = decodeJwtResponse(response.credential);

        currentUser = {
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
            domain: payload.email.split('@')[1]
        };

        localStorage.setItem('googleUser', JSON.stringify(currentUser));
        updateAuthUI();

        if (isAdminAllowed()) {
            showToast(`${currentUser.name}さん、ようこそ！管理画面にアクセスできます。`);
        } else {
            showToast(`${currentUser.name}さん、ログインしました。`);
        }
    } catch (e) {
        console.error('Login Failed: ', e);
        showToast('ログインに失敗しました');
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('googleUser');

    // Disable auto-select to prevent immediate re-login
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    updateAuthUI();
    showToast('ログアウトしました');
}

function isAdminAllowed() {
    return currentUser && currentUser.domain === ALLOWED_DOMAIN;
}

function updateAuthUI() {
    const userInfo = document.getElementById('userInfo');
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');

    if (currentUser) {
        userInfo.classList.remove('hidden');
        userAvatar.src = currentUser.picture;
        userName.textContent = currentUser.name;

        // Show/Hide Admin Button based on domain
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) {
            if (isAdminAllowed()) {
                adminBtn.style.display = 'flex';
            } else {
                adminBtn.style.display = 'none';
            }
        }
        // Hide Google button when logged in
        const googleBtn = document.getElementById('googleBtnContainer');
        if (googleBtn) googleBtn.style.display = 'none';
    } else {
        if (userInfo) userInfo.classList.add('hidden');

        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.style.display = 'none';

        // Show Google button when logged out and render it
        const googleBtn = document.getElementById('googleBtnContainer');
        if (googleBtn) {
            googleBtn.style.display = 'block';
            renderGoogleButton();
        }
    }
}

function renderGoogleButton() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.id) return;

    const container = document.getElementById("googleBtnContainer");
    if (container) {
        // Render the standard Google Sign-In button
        google.accounts.id.renderButton(
            container,
            { theme: "outline", size: "large", type: "standard", text: "signin_with" }
        );
    }
}

// Initialize Google Auth with robust loading check
function initGoogleAuth() {
    // Wait for the Google One Tap script to fully load
    const checkGoogleScript = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            clearInterval(checkGoogleScript);

            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleSignIn,
                auto_select: false, // Disable auto-select to allow account switching
            });

            // Re-run UI update to ensure button renders now that library is ready
            updateAuthUI();
        }
    }, 100); // Check every 100ms
}

function logout() {
    currentUser = null;
    localStorage.removeItem('googleUser');

    // Disable auto-select to prevent immediate re-login
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }

    updateAuthUI();
    showToast('ログアウトしました');
}

// Initialize when page loads (but initGoogleAuth handles the script wait)
document.addEventListener('DOMContentLoaded', initGoogleAuth);

// Manual login button listener removed as we use standard GSI button now

// Logout button handler
document.getElementById('logoutBtn').addEventListener('click', logout);

// ========================================
// Library View
// ========================================

async function renderLibrary() {
    const pdfs = await getPdfData();
    // Sort by newest first (reverse array order, assuming newer items added later/at bottom)
    const sortedPdfs = [...pdfs].reverse();
    pdfGrid.innerHTML = '';

    for (const pdf of sortedPdfs) {
        const card = await createPdfCard(pdf);
        pdfGrid.appendChild(card);
    }

    // Auto-generate AI content for PDFs without descriptions (Admins only)
    if (isAdminAllowed()) {
        // Auto-generation disabled to prevent API rate limits (429 errors)
        // AI content is generated manually from admin panel
        // autoGenerateForNewPdfs();
    }

    // Update tag cloud based on current PDF data
    updateTagCloud();
}

// ========================================
// Search and Tag Filtering
// ========================================

let activeTag = null;
let searchQuery = '';

// Predefined category tags for medical VR content
const categoryTags = [
    { label: '医療', keywords: ['医療', '病院', 'クリニック', '診療'] },
    { label: '介護・福祉', keywords: ['介護', '福祉', '施設', 'ケア'] },
    { label: '看護', keywords: ['看護', '看護師', 'ナース'] },
    { label: '教育・研修', keywords: ['教育', '研修', 'トレーニング', '学習'] },
    { label: 'VR', keywords: ['VR', 'バーチャル', '360'] },
    { label: '認知症', keywords: ['認知症', '認知', 'ケア'] },
    { label: '手技・技術', keywords: ['手技', '技術', '実技', '手順'] },
    { label: '導入事例', keywords: ['事例', '導入', '実績', '活用'] }
];

// Tag extraction helper needs data passed to it or await (simplifying to request data inside)
// IMPORTANT: This function was sync before. We need to be careful.
// However, it's only called by updateTagCloud which is called by renderLibrary.
// Let's make updateTagCloud accept pdfs or handle it async.

async function extractTagsFromPdfs() {
    const pdfs = await getPdfData();
    const tagCounts = {};

    categoryTags.forEach(cat => {
        tagCounts[cat.label] = 0;
    });

    pdfs.forEach(pdf => {
        const text = [pdf.title, pdf.description, ...(pdf.notes || [])].join(' ').toLowerCase();

        categoryTags.forEach(cat => {
            const hasMatch = cat.keywords.some(kw => text.includes(kw.toLowerCase()));
            if (hasMatch) {
                tagCounts[cat.label]++;
            }
        });
    });

    // Return tags that have at least 1 matching PDF
    return Object.entries(tagCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([label]) => label);
}

async function updateTagCloud() {
    const tagCloud = document.getElementById('tagCloud');
    if (!tagCloud) return;

    const activeTags = await extractTagsFromPdfs();

    tagCloud.innerHTML = activeTags.map(tag =>
        `<button class="tag-btn ${activeTag === tag ? 'active' : ''}" data-tag="${tag}">${tag}</button>`
    ).join('');

    // Add click handlers
    tagCloud.querySelectorAll('.tag-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tag = btn.dataset.tag;
            if (activeTag === tag) {
                activeTag = null;
            } else {
                activeTag = tag;
            }
            applyFilters();
        });
    });
}

async function applyFilters() {
    const pdfs = await getPdfData();
    const sortedPdfs = [...pdfs].reverse();
    const cards = document.querySelectorAll('.pdf-card');
    let visibleCount = 0;

    // Update tag button states
    document.querySelectorAll('.tag-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tag === activeTag);
    });

    // Filter cards
    sortedPdfs.forEach((pdf, index) => {
        const card = cards[index];
        if (!card) return;

        let visible = true;
        const text = [pdf.title, pdf.description, ...(pdf.notes || [])].join(' ').toLowerCase();

        // Check search query
        if (searchQuery.trim()) {
            visible = text.includes(searchQuery.trim().toLowerCase());
        }

        // Check active tag
        if (visible && activeTag) {
            const cat = categoryTags.find(c => c.label === activeTag);
            if (cat) {
                visible = cat.keywords.some(kw => text.includes(kw.toLowerCase()));
            }
        }

        card.style.display = visible ? '' : 'none';
        if (visible) visibleCount++;
    });

    // Show/hide no results message
    let noResultsEl = document.querySelector('.no-results');
    if (visibleCount === 0) {
        if (!noResultsEl) {
            noResultsEl = document.createElement('div');
            noResultsEl.className = 'no-results';
            pdfGrid.appendChild(noResultsEl);
        }
        noResultsEl.textContent = `「${searchQuery || activeTag}」に一致するスライドが見つかりませんでした`;
        noResultsEl.style.display = '';
    } else if (noResultsEl) {
        noResultsEl.style.display = 'none';
    }

    // Update clear button visibility
    const clearBtn = document.getElementById('clearSearchBtn');
    if (clearBtn) {
        clearBtn.style.display = searchQuery ? '' : 'none';
    }
}

// Search event handlers
document.getElementById('searchInput')?.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilters();
});

document.getElementById('clearSearchBtn')?.addEventListener('click', () => {
    searchQuery = '';
    document.getElementById('searchInput').value = '';
    applyFilters();
});

async function autoGenerateForNewPdfs() {
    const pdfs = await getPdfData();
    const MAX_AUTO_GENERATE = 3; // Process max 3 PDFs per batch
    const DELAY_MS = 5000; // 5 second delay between API calls

    let processed = 0;

    for (const pdf of pdfs) {
        if (processed >= MAX_AUTO_GENERATE) break;

        // Skip if already has description
        if (pdf.description && pdf.description.trim().length > 0) continue;

        // Mark as being processed to avoid duplicates
        if (pdf.aiGenerating) continue;
        await updatePdf(pdf.id, { aiGenerating: true });

        console.log(`Auto-generating AI content for: ${pdf.title}`);

        try {
            // Generate description
            const summary = await autoGenerateSummary(pdf);
            if (summary) {
                await updatePdf(pdf.id, { description: summary, aiGenerating: false });
            } else {
                await updatePdf(pdf.id, { aiGenerating: false });
            }
        } catch (error) {
            console.error('Auto-generation failed:', error);
            await updatePdf(pdf.id, { aiGenerating: false });
        }

        processed++;

        // Rate limiting: wait between API calls
        if (processed < MAX_AUTO_GENERATE) {
            await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
    }
}


async function createPdfCard(pdf) {
    const card = document.createElement('div');
    card.className = 'pdf-card';
    card.dataset.pdfId = pdf.id;

    // Get like count for this PDF
    const likeCount = getLikes(pdf.id);

    card.innerHTML = `
        <div class="pdf-card-thumbnail">
            <canvas></canvas>
        </div>
        <div class="pdf-card-info">
            <h3 class="pdf-card-title">${escapeHtml(pdf.title)}</h3>
            <div class="pdf-card-meta">
                <span class="pdf-card-pages">📄 <span class="page-count">...</span>ページ</span>
                <span class="pdf-card-likes">❤️ ${likeCount}</span>
            </div>
        </div>
    `;

    card.addEventListener('click', () => openViewer(pdf.id));

    // Load thumbnail
    const canvas = card.querySelector('canvas');
    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;

        // Update page count
        const pageCount = doc.numPages;
        card.querySelector('.page-count').textContent = pageCount;

        // Store page count
        if (pdf.pageCount !== pageCount) {
            await updatePdf(pdf.id, { pageCount });
        }

        // Render selected OGP page as thumbnail (default to page 1)
        const thumbnailPage = pdf.ogpPage || 1;
        const page = await doc.getPage(thumbnailPage);
        const viewport = page.getViewport({ scale: 0.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

    } catch (error) {
        console.error('Error loading PDF thumbnail:', pdf.filename, error);
        card.querySelector('.page-count').textContent = '-';
    }

    return card;
}

// ========================================
// PDF Viewer
// ========================================

async function openViewer(pdfId) {
    currentPdf = await getPdfById(pdfId);
    if (!currentPdf) return;

    // Track view event
    trackEvent(pdfId, 'views');

    viewerModal.classList.add('active');
    viewerTitle.textContent = currentPdf.title;
    ctaSection.classList.add('hidden');

    // Show admin edit button only if admin
    const adminEditBtn = document.getElementById('adminEditBtn');
    if (adminEditBtn) {
        adminEditBtn.style.display = isAdminAllowed() ? 'flex' : 'none';
    }

    // Update info sidebar
    updateInfoSidebar(currentPdf);

    // Show/Hide Watch Video Button
    const watchVideoBtn = document.getElementById('watchVideoBtn');
    if (currentPdf.videoUrl) {
        watchVideoBtn.classList.remove('hidden');
    } else {
        watchVideoBtn.classList.add('hidden');
    }

    // Reset video player
    closeVideoPlayer();

    // Load PDF
    try {
        const pdfPath = `ComicPDF/${currentPdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        pdfDoc = await loadingTask.promise;
        totalPages = pdfDoc.numPages;
        currentPage = 1;
        zoomLevel = 1;
        zoomSlider.value = 100;
        zoomValue.textContent = '100%';

        totalPagesSpan.textContent = totalPages;

        await renderPage(currentPage);
        updateNavigationButtons();
        updateLikeUI();

    } catch (error) {
        console.error('Error loading PDF:', error);
        showToast('PDFの読み込みに失敗しました');
    }

    // Handle URL hash
    updateUrlHash(pdfId);
}

function updateInfoSidebar(pdf) {
    document.getElementById('pdfDescription').textContent = pdf.description || '-';
    document.getElementById('pdfNotes').textContent = pdf.notes || '-';

    const servicesList = document.getElementById('relatedServices');
    servicesList.innerHTML = '';
    if (pdf.services && pdf.services.length > 0) {
        pdf.services.forEach(url => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`;
            servicesList.appendChild(li);
        });
    } else {
        servicesList.innerHTML = '<li>-</li>';
    }

    const programsList = document.getElementById('relatedPrograms');
    programsList.innerHTML = '';
    if (pdf.programs && pdf.programs.length > 0) {
        pdf.programs.forEach(url => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="${escapeHtml(url)}" target="_blank">${escapeHtml(url)}</a>`;
            programsList.appendChild(li);
        });
    } else {
        programsList.innerHTML = '<li>-</li>';
    }
}

async function renderPage(pageNum) {
    if (!pdfDoc) return;

    try {
        const page = await pdfDoc.getPage(pageNum);

        // Get container dimensions for fit-to-container scaling
        const canvasWrapper = document.querySelector('.canvas-wrapper');
        const containerWidth = canvasWrapper.clientWidth - 32; // padding
        const containerHeight = canvasWrapper.clientHeight - 32;

        // Calculate scale to fit container while maintaining aspect ratio
        const defaultViewport = page.getViewport({ scale: 1 });
        const scaleX = containerWidth / defaultViewport.width;
        const scaleY = containerHeight / defaultViewport.height;
        const fitScale = Math.min(scaleX, scaleY);

        // Apply user zoom on top of fit scale
        const finalScale = fitScale * zoomLevel;
        const viewport = page.getViewport({ scale: finalScale });

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;

        const ctx = pdfCanvas.getContext('2d');

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        currentPageSpan.textContent = pageNum;

        // Show CTA on last page (after 5 seconds delay)
        if (pageNum === totalPages) {
            setTimeout(() => {
                ctaSection.classList.remove('hidden');
            }, 5000);
        } else {
            ctaSection.classList.add('hidden');
        }

    } catch (error) {
        console.error('Error rendering page:', error);
    }
}

function updateNavigationButtons() {
    document.getElementById('prevPageBtn').disabled = currentPage <= 1;
    document.getElementById('nextPageBtn').disabled = currentPage >= totalPages;
}

function closeViewer() {
    viewerModal.classList.remove('active');
    pdfDoc = null;
    currentPdf = null;
    window.location.hash = '';
    closeVideoPlayer();
}

// Navigation
document.getElementById('prevPageBtn').addEventListener('click', async () => {
    if (currentPage > 1) {
        currentPage--;
        await renderPage(currentPage);
        updateNavigationButtons();
    }
});

document.getElementById('nextPageBtn').addEventListener('click', async () => {
    if (currentPage < totalPages) {
        currentPage++;
        await renderPage(currentPage);
        updateNavigationButtons();
    }
});

// Scroll-based page navigation
let isScrolling = false;
let scrollAccumulator = 0;
const SCROLL_THRESHOLD = 100; // Requires this much scroll distance to change page

document.querySelector('.canvas-wrapper').addEventListener('wheel', async (e) => {
    if (!viewerModal.classList.contains('active')) return;

    e.preventDefault();

    // Accumulate scroll distance
    scrollAccumulator += e.deltaY;

    if (Math.abs(scrollAccumulator) >= SCROLL_THRESHOLD) {
        if (isScrolling) return; // Prevent new scroll event from triggering if already processing
        isScrolling = true;

        if (scrollAccumulator > 0 && currentPage < totalPages) {
            // Scroll down = next page
            currentPage++;
            await renderPage(currentPage);
            updateNavigationButtons();
        } else if (scrollAccumulator < 0 && currentPage > 1) {
            // Scroll up = previous page
            currentPage--;
            await renderPage(currentPage);
            updateNavigationButtons();
        }

        scrollAccumulator = 0; // Reset accumulator after page change attempt

        // Debounce to prevent rapid page changes
        setTimeout(() => {
            isScrolling = false;
        }, 300);
    }
}, { passive: false });

// Keyboard navigation
document.addEventListener('keydown', async (e) => {
    if (!viewerModal.classList.contains('active')) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentPage > 1) {
            currentPage--;
            await renderPage(currentPage);
            updateNavigationButtons();
        }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        if (currentPage < totalPages) {
            currentPage++;
            await renderPage(currentPage);
            updateNavigationButtons();
        }
    } else if (e.key === 'Escape') {
        closeViewer();
    }
});

// Zoom
zoomSlider.addEventListener('input', async () => {
    zoomLevel = zoomSlider.value / 100;
    zoomValue.textContent = zoomSlider.value + '%';
    await renderPage(currentPage);
});

// Close viewer
document.getElementById('closeViewerBtn').addEventListener('click', closeViewer);
viewerModal.querySelector('.modal-backdrop').addEventListener('click', closeViewer);

// Close CTA section
document.getElementById('closeCTABtn')?.addEventListener('click', () => {
    ctaSection.classList.add('hidden');
});

// Admin edit button - opens edit modal for current PDF
document.getElementById('adminEditBtn')?.addEventListener('click', () => {
    if (!currentPdf) return;
    const pdfId = currentPdf.id;
    closeViewer();
    // Small delay to ensure viewer is closed before opening edit modal
    setTimeout(() => {
        openEditModal(pdfId);
    }, 100);
});

// ========================================
// Like Feature
// ========================================

function getAllLikes() {
    const stored = localStorage.getItem('pdfLikes');
    return stored ? JSON.parse(stored) : {};
}

function getLikes(pdfId) {
    const likes = getAllLikes();
    return likes[pdfId] || 0;
}

// ========================================
// Analytics Tracking
// ========================================

function getAnalytics() {
    const stored = localStorage.getItem('pdfAnalytics');
    return stored ? JSON.parse(stored) : {};
}

function saveAnalytics(data) {
    localStorage.setItem('pdfAnalytics', JSON.stringify(data));
}

function trackEvent(pdfId, eventType) {
    const analytics = getAnalytics();
    if (!analytics[pdfId]) {
        analytics[pdfId] = { views: 0, shares: 0, downloads: 0 };
    }
    analytics[pdfId][eventType] = (analytics[pdfId][eventType] || 0) + 1;
    saveAnalytics(analytics);
}

function getStats(pdfId) {
    const analytics = getAnalytics();
    const likes = getLikes(pdfId);
    const stats = analytics[pdfId] || { views: 0, shares: 0, downloads: 0 };
    return {
        views: stats.views || 0,
        likes: likes,
        shares: stats.shares || 0,
        downloads: stats.downloads || 0
    };
}

// ========================================
// AI Summary Generation
// ========================================

async function extractPdfText(pdf, maxPages = 5) {
    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;

        let allText = '';
        const pagesToExtract = Math.min(doc.numPages, maxPages);

        for (let i = 1; i <= pagesToExtract; i++) {
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            allText += pageText + '\n';
        }

        return allText.trim();
    } catch (error) {
        console.error('Error extracting PDF text:', error);
        return '';
    }
}

async function capturePdfPageAsImage(pdf, pageNum = 1) {
    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(pageNum);

        const scale = 1.5;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        return imageData.split(',')[1];

    } catch (error) {
        console.error('Error capturing PDF page:', error);
        return null;
    }
}

async function generateAiSummaryFromImage(imageBase64, pdfTitle) {
    const prompt = `この画像はプレゼンテーションスライドです。
このスライドが「誰向けの」「何についての」資料かを、3行程度の文章で分かりやすく要約してください。
箇条書きは使わず、自然な文章で説明してください。

タイトル: ${pdfTitle}

要約（3行程度、日本語）:`;

    try {
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        {
                            inline_data: {
                                mime_type: 'image/jpeg',
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 150
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (error) {
        console.error('Error generating AI summary from image:', error);
        return null;
    }
}

async function generateAiSummaryFromText(pdfText, pdfTitle) {
    const prompt = `以下はプレゼンテーションスライドから抽出したテキストです。
このスライドが「誰向けの」「何についての」資料かを、3行程度の文章で分かりやすく要約してください。
箇条書きは使わず、自然な文章で説明してください。

タイトル: ${pdfTitle}

抽出テキスト:
${pdfText.substring(0, 2000)}

要約（3行程度、日本語）:`;

    try {
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.3,
                    maxOutputTokens: 150
                }
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;
    } catch (error) {
        console.error('Error generating AI summary from text:', error);
        return null;
    }
}

async function autoGenerateSummary(pdf) {
    showToast('AI要約を生成中...');

    const pdfText = await extractPdfText(pdf, 3);
    let summary = null;

    // テキストが十分あればテキストベースで分析
    if (pdfText && pdfText.length > 100) {
        summary = await generateAiSummaryFromText(pdfText, pdf.title);
    }

    // テキストが少ないか失敗した場合は画像で分析
    if (!summary) {
        showToast('画像を解析中...');
        const imageBase64 = await capturePdfPageAsImage(pdf, 1);
        if (imageBase64) {
            summary = await generateAiSummaryFromImage(imageBase64, pdf.title);
        }
    }

    if (summary) {
        showToast('AI要約を生成しました！');
        return summary;
    } else {
        showToast('AI要約の生成に失敗しました');
        return null;
    }
}

async function autoGenerateTitle(pdf) {
    showToast('AIタイトルを生成中...');

    const imageBase64 = await capturePdfPageAsImage(pdf, 1);
    if (!imageBase64) {
        showToast('画像を取得できませんでした');
        return null;
    }

    const prompt = `この画像はプレゼンテーションスライドです。
このスライドの内容を表す簡潔なタイトルを1つだけ生成してください。
- 20〜25文字程度で
- 「〜について」「〜の資料」などの説明的な表現は避ける
- キャッチーで印象的なタイトル

タイトル（25文字以内）:`;

    try {
        const response = await fetch('gemini-proxy.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: prompt },
                        { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } }
                    ]
                }],
                generationConfig: { temperature: 0.5, maxOutputTokens: 50 }
            })
        });

        if (!response.ok) throw new Error(`API error: ${response.status}`);

        const data = await response.json();
        let title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || null;

        // 25文字以内に切り詰め
        if (title && title.length > 25) {
            title = title.substring(0, 25);
        }

        if (title) {
            showToast('AIタイトルを生成しました！');
            return title;
        }
    } catch (error) {
        console.error('Error generating AI title:', error);
    }

    showToast('AIタイトルの生成に失敗しました');
    return null;
}

function getAnonymousUserId() {
    let anonymousId = localStorage.getItem('anonymousUserId');
    if (!anonymousId) {
        anonymousId = 'anon_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('anonymousUserId', anonymousId);
    }
    return anonymousId;
}

function getUserLikes() {
    const userId = currentUser ? currentUser.email : getAnonymousUserId();
    const stored = localStorage.getItem(`userLikes_${userId}`);
    return stored ? JSON.parse(stored) : [];
}

function saveLike(pdfId, liked) {
    // Update total likes
    const likes = getAllLikes();
    if (liked) {
        likes[pdfId] = (likes[pdfId] || 0) + 1;
    } else {
        likes[pdfId] = Math.max((likes[pdfId] || 0) - 1, 0);
    }
    localStorage.setItem('pdfLikes', JSON.stringify(likes));

    // Update user's likes (works for both logged in users and anonymous)
    const userId = currentUser ? currentUser.email : getAnonymousUserId();
    let userLikes = getUserLikes();
    if (liked) {
        userLikes.push(pdfId);
    } else {
        userLikes = userLikes.filter(id => id !== pdfId);
    }
    localStorage.setItem(`userLikes_${userId}`, JSON.stringify(userLikes));
}

function updateLikeUI() {
    if (!currentPdf) return;

    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = likeBtn.querySelector('.like-icon');
    const likeCount = document.getElementById('likeCount');

    const likes = getLikes();
    const userLikes = getUserLikes();
    const isLiked = userLikes.includes(currentPdf.id);

    likeCount.textContent = likes[currentPdf.id] || 0;
    likeIcon.textContent = isLiked ? '♥' : '♡';
    likeBtn.classList.toggle('liked', isLiked);
}

document.getElementById('likeBtn').addEventListener('click', () => {
    if (!currentPdf) return;

    const userLikes = getUserLikes();
    const isLiked = userLikes.includes(currentPdf.id);

    saveLike(currentPdf.id, !isLiked);
    updateLikeUI();

    if (!isLiked) {
        showToast('いいねしました！');
    }
});

// ========================================
// Video Player Logic
// ========================================

const videoContainer = document.getElementById('videoContainer');
const videoPlayer = document.getElementById('videoPlayer');

document.getElementById('watchVideoBtn')?.addEventListener('click', () => {
    if (!currentPdf || !currentPdf.videoUrl) return;

    const embedUrl = getEmbedUrl(currentPdf.videoUrl);
    if (embedUrl) {
        videoPlayer.src = embedUrl;
        videoContainer.classList.remove('hidden');
        // Hide canvas to prevent interference? Not strictly necessary as z-index covers it, but good practice.
    } else {
        showToast('動画URLが無効です');
    }
});

document.getElementById('closeVideoBtn')?.addEventListener('click', closeVideoPlayer);

function closeVideoPlayer() {
    if (!videoContainer) return;
    videoContainer.classList.add('hidden');
    videoPlayer.src = ''; // Stop playback
}

function getEmbedUrl(url) {
    try {
        let videoId = '';
        if (url.includes('youtube.com/watch?v=')) {
            videoId = url.split('v=')[1].split('&')[0];
        } else if (url.includes('youtu.be/')) {
            videoId = url.split('youtu.be/')[1].split('?')[0];
        } else if (url.includes('youtube.com/shorts/')) {
            videoId = url.split('shorts/')[1].split('?')[0];
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        }
    } catch (e) {
        console.error('Error parsing video URL:', e);
    }
    return null;
}

// ========================================
// Viewer Actions
// ========================================

// Share URL (using OGP-enabled HTML pages)
document.getElementById('shareUrlBtn').addEventListener('click', () => {
    if (!currentPdf) return;

    // Track share event
    trackEvent(currentPdf.id, 'shares');

    // Use individual HTML page for proper OGP on SNS
    const basePath = window.location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
    const url = `${window.location.origin}${basePath}/${currentPdf.id}.html`;
    copyToClipboard(url);
    showToast('URLをコピーしました！');
});

// Embed code
document.getElementById('embedCodeBtn').addEventListener('click', () => {
    if (!currentPdf) return;

    const embedUrl = `${window.location.origin}${window.location.pathname.replace('index.html', '')}embed.html?pdf=${currentPdf.id}`;
    const embedCode = `<iframe src="${embedUrl}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`;
    copyToClipboard(embedCode);
    showToast('埋め込みコードをコピーしました！');
});

// Download (no login required)
document.getElementById('downloadBtn').addEventListener('click', () => {
    if (!currentPdf) return;

    // Track download event
    trackEvent(currentPdf.id, 'downloads');

    const link = document.createElement('a');
    link.href = `ComicPDF/${currentPdf.filename}`;
    link.download = currentPdf.filename;
    link.click();
    showToast('ダウンロードを開始しました');
});

// Fullscreen with orientation lock for mobile
document.getElementById('fullscreenBtn').addEventListener('click', async () => {
    const container = document.querySelector('.viewer-container');
    if (document.fullscreenElement) {
        // Exit fullscreen
        await document.exitFullscreen();
        // Unlock orientation when exiting fullscreen
        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }
    } else {
        // Enter fullscreen
        await container.requestFullscreen();
        // Lock to landscape on mobile
        if (screen.orientation && screen.orientation.lock) {
            try {
                await screen.orientation.lock('landscape');
            } catch (e) {
                // Orientation lock not supported or failed
                console.log('Orientation lock not supported');
            }
        }
    }
});

// Auto-fullscreen when device rotates to landscape (mobile only)
let wasPortrait = window.innerHeight > window.innerWidth;

function handleOrientationChange() {
    if (!viewerModal.classList.contains('active')) return;

    const isLandscape = window.innerWidth > window.innerHeight;
    const container = document.querySelector('.viewer-container');

    if (isLandscape && wasPortrait && !document.fullscreenElement) {
        // Rotated to landscape - enter fullscreen
        container.requestFullscreen().catch(() => { });
    }

    wasPortrait = !isLandscape;

    // Re-render page to fit new dimensions
    if (pdfDoc && currentPage) {
        setTimeout(() => renderPage(currentPage), 100);
    }
}

window.addEventListener('resize', handleOrientationChange);
if (screen.orientation) {
    screen.orientation.addEventListener('change', handleOrientationChange);
}

// Re-render page when fullscreen changes
document.addEventListener('fullscreenchange', () => {
    if (pdfDoc && currentPage) {
        setTimeout(() => renderPage(currentPage), 100);
    }
});


// ========================================
// Admin Panel
// ========================================

document.getElementById('adminBtn').addEventListener('click', () => {
    if (!isAdminAllowed()) {
        showToast('アクセス権限がありません');
        return;
    }

    adminModal.classList.add('active');
    renderAdminList();
});

document.getElementById('closeAdminBtn').addEventListener('click', () => {
    adminModal.classList.remove('active');
});

adminModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    adminModal.classList.remove('active');
});

// PDF file selection
let selectedFile = null;

document.getElementById('newPdfInput')?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) {
        selectedFile = null;
        document.getElementById('selectedFileName').textContent = '';
        document.getElementById('uploadPdfBtn').style.display = 'none';
        return;
    }

    if (!file.name.endsWith('.pdf')) {
        showToast('PDFファイルのみアップロード可能です');
        e.target.value = '';
        return;
    }

    selectedFile = file;
    document.getElementById('selectedFileName').textContent = `📄 ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    document.getElementById('uploadPdfBtn').style.display = 'block';
});

// PDF upload
document.getElementById('uploadPdfBtn')?.addEventListener('click', async () => {
    if (!selectedFile) return;

    const uploadBtn = document.getElementById('uploadPdfBtn');
    const progressDiv = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    uploadBtn.style.display = 'none';
    progressDiv.style.display = 'flex';

    const formData = new FormData();
    formData.append('pdf', selectedFile);

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                progressFill.style.width = percent + '%';
                progressText.textContent = percent + '%';
            }
        });

        xhr.addEventListener('load', async () => {
            if (xhr.status === 200) {
                try {
                    const result = JSON.parse(xhr.responseText);
                    if (result.success) {
                        showToast('アップロード完了！');

                        // Add new PDF to data
                        const pdfs = await getPdfData();
                        // Generate unique ID using timestamp to avoid collisions
                        const newId = 'pdf_' + Date.now();
                        const newPdf = {
                            id: newId,
                            filename: result.data.filename,
                            title: result.data.filename.replace('.pdf', ''),
                            description: '',
                            relatedServices: [],
                            relatedPrograms: [],
                            notes: '',
                            ogpPage: 1
                        };

                        pdfs.push(newPdf);
                        await savePdfData(pdfs);

                        // Reset form
                        selectedFile = null;
                        document.getElementById('newPdfInput').value = '';
                        document.getElementById('selectedFileName').textContent = '';
                        progressDiv.style.display = 'none';
                        progressFill.style.width = '0%';

                        // Refresh admin list and library
                        renderAdminList();
                        renderLibrary();

                        // Auto-generate AI content for new PDF
                        showToast('AI要約を生成中...');
                        const summary = await autoGenerateSummary(newPdf);
                        if (summary) {
                            await updatePdf(newId, { description: summary });
                            renderLibrary();
                        }

                        // Generate OGP HTML file for the new PDF
                        try {
                            const updatedPdf = await getPdfById(newId);
                            await generateOgpHtml(updatedPdf || newPdf);
                            showToast('OGP設定を生成しました');
                        } catch (e) {
                            console.log('OGP generation skipped (local mode)');
                        }
                    } else {
                        showToast('エラー: ' + result.message);
                        uploadBtn.style.display = 'block';
                        progressDiv.style.display = 'none';
                    }
                } catch (e) {
                    showToast('サーバーエラー: レスポンスの形式が正しくありません');
                    console.error('Server response error:', e, xhr.responseText);
                    uploadBtn.style.display = 'block';
                    progressDiv.style.display = 'none';
                }
            } else {
                showToast('アップロード失敗: ' + xhr.status + ' ' + xhr.statusText);
                console.error('Upload failed:', xhr.status, xhr.statusText, xhr.responseText);
                uploadBtn.style.display = 'block';
                progressDiv.style.display = 'none';
            }
        });

        xhr.addEventListener('error', () => {
            showToast('ネットワークエラー');
            uploadBtn.style.display = 'block';
            progressDiv.style.display = 'none';
        });

        xhr.open('POST', 'upload-pdf.php');
        xhr.send(formData);

    } catch (error) {
        console.error('Upload error:', error);
        showToast('アップロードエラー');
        uploadBtn.style.display = 'block';
        progressDiv.style.display = 'none';
    }
});

// Regenerate OGP for all PDFs
document.getElementById('regenerateAllOgpBtn')?.addEventListener('click', async () => {
    const pdfs = await getPdfData();
    const btn = document.getElementById('regenerateAllOgpBtn');
    const originalText = btn.textContent;

    btn.textContent = '⏳ 生成中...';
    btn.disabled = true;

    let success = 0;
    let failed = 0;

    for (const pdf of pdfs) {
        try {
            await generateOgpHtml(pdf);
            success++;
            btn.textContent = `⏳ ${success}/${pdfs.length}`;
        } catch (e) {
            failed++;
            console.error('OGP generation failed for:', pdf.id, e);
        }
    }

    btn.textContent = originalText;
    btn.disabled = false;

    if (failed > 0) {
        showToast(`OGP生成完了: ${success}件成功, ${failed}件失敗`);
    } else {
        showToast(`全${success}件のOGPを生成しました！`);
    }
});

async function renderAdminList() {
    const pdfs = await getPdfData();
    const sortedPdfs = [...pdfs].reverse(); // Sort newest first
    const list = document.getElementById('adminPdfList');
    list.innerHTML = '';

    for (const pdf of sortedPdfs) {
        const stats = getStats(pdf.id);
        const item = document.createElement('div');
        item.className = 'admin-pdf-item';
        item.innerHTML = `
            <canvas width="60" height="45"></canvas>
            <div class="admin-pdf-info">
                <div class="admin-pdf-title">${escapeHtml(pdf.title)}</div>
                <div class="admin-pdf-meta">${escapeHtml(pdf.filename)}</div>
                <div class="admin-pdf-stats">
                    <span title="閲覧数">👁️ ${stats.views}</span>
                    <span title="いいね">❤️ ${stats.likes}</span>
                    <span title="シェア">🔗 ${stats.shares}</span>
                    <span title="ダウンロード">📥 ${stats.downloads}</span>
                </div>
            </div>
            <div class="admin-pdf-actions">
                <button class="edit-btn" data-id="${pdf.id}">編集</button>
                <button class="delete-btn" data-id="${pdf.id}">削除</button>
            </div>
        `;

        // Load thumbnail
        const canvas = item.querySelector('canvas');
        try {
            const pdfPath = `ComicPDF/${pdf.filename}`;
            const doc = await pdfjsLib.getDocument(pdfPath).promise;
            const page = await doc.getPage(1);
            const viewport = page.getViewport({ scale: 0.15 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;
        } catch (e) { }

        // Edit button
        item.querySelector('.edit-btn').addEventListener('click', () => openEditModal(pdf.id));

        // Delete button
        item.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm(`「${pdf.title}」を削除しますか？`)) {
                deletePdf(pdf.id);
            }
        });

        list.appendChild(item);
    }
}

async function deletePdf(id) {
    let pdfs = await getPdfData();
    pdfs = pdfs.filter(p => p.id !== id);
    await savePdfData(pdfs);
    renderAdminList();
    renderLibrary();
    showToast('PDFを削除しました');
}

// ========================================
// Edit Modal
// ========================================

let editingPdfId = null;

async function openEditModal(pdfId) {
    if (!isAdminAllowed()) {
        showToast('編集権限がありません');
        return;
    }

    const pdf = await getPdfById(pdfId);
    if (!pdf) return;

    editingPdfId = pdfId;
    editModal.classList.add('active');

    document.getElementById('editTitle').value = pdf.title;
    document.getElementById('editDescription').value = pdf.description || '';
    document.getElementById('editVideoUrl').value = pdf.videoUrl || '';
    document.getElementById('editServices').value = (pdf.services || []).join('\n');
    document.getElementById('editPrograms').value = (pdf.programs || []).join('\n');
    document.getElementById('editNotes').value = pdf.notes || '';

    // Load OGP page selector
    await loadOgpPageSelector(pdf);
}

async function loadOgpPageSelector(pdf) {
    const selector = document.getElementById('ogpPageSelector');
    selector.innerHTML = '';

    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const doc = await pdfjsLib.getDocument(pdfPath).promise;

        for (let i = 1; i <= doc.numPages; i++) {
            const thumb = document.createElement('div');
            thumb.className = 'ogp-page-thumb' + (i === (pdf.ogpPage || 1) ? ' selected' : '');
            thumb.dataset.page = i;
            thumb.innerHTML = `
                <canvas></canvas>
                <span class="ogp-page-number">${i}</span>
            `;

            thumb.addEventListener('click', () => {
                selector.querySelectorAll('.ogp-page-thumb').forEach(t => t.classList.remove('selected'));
                thumb.classList.add('selected');
            });

            selector.appendChild(thumb);

            // Render thumbnail
            const page = await doc.getPage(i);
            const canvas = thumb.querySelector('canvas');
            const viewport = page.getViewport({ scale: 0.2 });
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({
                canvasContext: canvas.getContext('2d'),
                viewport
            }).promise;
        }
    } catch (error) {
        console.error('Error loading OGP page selector:', error);
    }
}

// AI Summary generation button
document.getElementById('generateAiSummaryBtn')?.addEventListener('click', async () => {
    if (!editingPdfId) return;

    const pdf = await getPdfById(editingPdfId);
    if (!pdf) return;

    const btn = document.getElementById('generateAiSummaryBtn');
    const originalText = btn.textContent;

    // Show loading state
    btn.classList.add('loading');
    btn.textContent = '生成中...';

    const startTime = Date.now();
    const updateTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        btn.textContent = `生成中... ${elapsed}秒`;
    }, 1000);

    try {
        const summary = await autoGenerateSummary(pdf);
        if (summary) {
            document.getElementById('editDescription').value = summary;
        }
    } finally {
        clearInterval(updateTimer);
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
});

// AI Title generation button
document.getElementById('generateAiTitleBtn')?.addEventListener('click', async () => {
    console.log('Title generation button clicked');

    if (!editingPdfId) {
        console.error('No editingPdfId');
        showToast('PDFが選択されていません');
        return;
    }

    const pdf = await getPdfById(editingPdfId);
    if (!pdf) {
        console.error('PDF not found:', editingPdfId);
        showToast('PDFが見つかりません');
        return;
    }

    console.log('Generating title for:', pdf.title);

    const btn = document.getElementById('generateAiTitleBtn');
    const originalText = btn.textContent;

    btn.classList.add('loading');
    btn.textContent = '生成中...';

    const startTime = Date.now();
    const updateTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        btn.textContent = `生成中... ${elapsed}秒`;
    }, 1000);

    try {
        const title = await autoGenerateTitle(pdf);
        console.log('Generated title:', title);
        if (title) {
            document.getElementById('editTitle').value = title;
        }
    } catch (error) {
        console.error('Title generation failed:', error);
        showToast('タイトル生成中にエラーが発生しました');
    } finally {
        clearInterval(updateTimer);
        btn.classList.remove('loading');
        btn.textContent = originalText;
    }
});

document.getElementById('closeEditBtn').addEventListener('click', () => {
    editModal.classList.remove('active');
    editingPdfId = null;
});

document.getElementById('cancelEditBtn').addEventListener('click', () => {
    editModal.classList.remove('active');
    editingPdfId = null;
});

editModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    editModal.classList.remove('active');
    editingPdfId = null;
});

// Download OGP image for selected page
document.getElementById('downloadOgpBtn')?.addEventListener('click', async () => {
    if (!editingPdfId) return;

    const pdf = await getPdfById(editingPdfId);
    if (!pdf) return;

    const selectedOgpThumb = document.querySelector('.ogp-page-thumb.selected');
    const ogpPage = selectedOgpThumb ? parseInt(selectedOgpThumb.dataset.page) : 1;

    showToast(`OGP画像を生成中... (${ogpPage}ページ目)`);

    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(ogpPage);

        // OGP recommended size: 1200x630
        const OGP_WIDTH = 1200;
        const OGP_HEIGHT = 630;

        const defaultViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(OGP_WIDTH / defaultViewport.width, OGP_HEIGHT / defaultViewport.height);
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = OGP_WIDTH;
        canvas.height = OGP_HEIGHT;
        const ctx = canvas.getContext('2d');

        // Fill with white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OGP_WIDTH, OGP_HEIGHT);

        // Center the PDF page
        const offsetX = (OGP_WIDTH - viewport.width) / 2;
        const offsetY = (OGP_HEIGHT - viewport.height) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        ctx.restore();

        // Download as PNG
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${pdf.id}.png`;
        link.click();

        showToast(`OGP画像をダウンロードしました！ ogp/${pdf.id}.png としてアップロードしてください。`);

    } catch (error) {
        console.error('Error generating OGP image:', error);
        showToast('OGP画像の生成に失敗しました');
    }
});

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    if (!editingPdfId) return;

    const pdf = await getPdfById(editingPdfId);
    if (!pdf) return;

    const selectedOgpThumb = document.querySelector('.ogp-page-thumb.selected');
    const ogpPage = selectedOgpThumb ? parseInt(selectedOgpThumb.dataset.page) : 1;

    const updates = {
        title: document.getElementById('editTitle').value.trim(),
        description: document.getElementById('editDescription').value.trim(),
        services: document.getElementById('editServices').value.split('\n').filter(s => s.trim()),
        programs: document.getElementById('editPrograms').value.split('\n').filter(s => s.trim()),
        notes: document.getElementById('editNotes').value.trim(),
        ogpPage,
        videoUrl: document.getElementById('editVideoUrl').value.trim()
    };

    // メタデータを保存
    await updatePdf(editingPdfId, updates);

    // OGP画像を生成してサーバーに保存
    showToast('OGP画像を生成中...');

    try {
        const pdfPath = `ComicPDF/${pdf.filename}`;
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(ogpPage);

        // OGP recommended size: 1200x630
        const OGP_WIDTH = 1200;
        const OGP_HEIGHT = 630;

        const defaultViewport = page.getViewport({ scale: 1 });
        const scale = Math.min(OGP_WIDTH / defaultViewport.width, OGP_HEIGHT / defaultViewport.height);
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width = OGP_WIDTH;
        canvas.height = OGP_HEIGHT;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, OGP_WIDTH, OGP_HEIGHT);

        const offsetX = (OGP_WIDTH - viewport.width) / 2;
        const offsetY = (OGP_HEIGHT - viewport.height) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        ctx.restore();

        // サーバーに送信
        const imageData = canvas.toDataURL('image/png');
        const response = await fetch('save-ogp.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdfId: editingPdfId,
                imageData: imageData
            })
        });

        if (response.ok) {
            showToast('保存しました！OGP画像も更新されました。');
        } else {
            showToast('保存しました (OGP画像の保存に失敗しました)');
        }

    } catch (error) {
        console.error('Error generating OGP:', error);
        showToast('保存しました (OGP画像の生成に失敗しました)');
    }

    editModal.classList.remove('active');
    editingPdfId = null;

    renderAdminList();
    renderLibrary();
});

// ========================================
// URL Hash Routing
// ========================================

function updateUrlHash(pdfId) {
    window.location.hash = `pdf=${pdfId}`;
}

async function handleUrlHash() {
    const hash = window.location.hash;
    if (hash.startsWith('#pdf=')) {
        const pdfId = hash.replace('#pdf=', '');
        const pdf = await getPdfById(pdfId);
        if (pdf) {
            setTimeout(() => openViewer(pdfId), 100);
        }
    }
}

window.addEventListener('hashchange', handleUrlHash);

// ========================================
// Utilities
// ========================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    });
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ========================================
// Initialization
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Google Auth
    initGoogleAuth();

    // Render Library
    renderLibrary();

    handleUrlHash();
});

// ========================================
// OGP Image Generation
// ========================================

document.getElementById('generateOgpBtn')?.addEventListener('click', async () => {
    const pdfs = await getPdfData();
    const progress = document.getElementById('ogpProgress');
    const progressText = document.getElementById('ogpProgressText');

    progress.style.display = 'block';

    for (let i = 0; i < pdfs.length; i++) {
        const pdf = pdfs[i];
        progressText.textContent = `${i + 1}/${pdfs.length}`;

        try {
            await generateAndDownloadOgpImage(pdf);
            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Error generating OGP for ${pdf.id}:`, error);
        }
    }

    progress.style.display = 'none';
    showToast('全OGP画像の生成が完了しました！ogp/フォルダにアップロードしてください。');
});

async function generateAndDownloadOgpImage(pdf) {
    const pdfPath = `ComicPDF/${pdf.filename}`;
    const ogpPage = pdf.ogpPage || 1;

    try {
        const loadingTask = pdfjsLib.getDocument(pdfPath);
        const doc = await loadingTask.promise;
        const page = await doc.getPage(ogpPage);

        // OGP recommended size: 1200x630
        const OGP_WIDTH = 1200;
        const OGP_HEIGHT = 630;

        const defaultViewport = page.getViewport({ scale: 1 });
        const scale = Math.max(OGP_WIDTH / defaultViewport.width, OGP_HEIGHT / defaultViewport.height);
        const viewport = page.getViewport({ scale });

        // Create canvas
        const canvas = document.createElement('canvas');
        canvas.width = OGP_WIDTH;
        canvas.height = OGP_HEIGHT;
        const ctx = canvas.getContext('2d');

        // Fill background
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, OGP_WIDTH, OGP_HEIGHT);

        // Render PDF page centered
        const offsetX = (OGP_WIDTH - viewport.width) / 2;
        const offsetY = (OGP_HEIGHT - viewport.height) / 2;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        await page.render({
            canvasContext: ctx,
            viewport: viewport
        }).promise;

        ctx.restore();

        // Download as PNG
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${pdf.id}.png`;
        link.click();

    } catch (error) {
        console.error('Error generating OGP image:', error);
        throw error;
    }
}
