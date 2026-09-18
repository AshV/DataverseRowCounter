/**
 * Dataverse Row Counter Studio
 * Compatible with FetchXmlTester, webapi-tester, and QDV
 * Author: Ashish Vishwakarma (AshV)
 */

// =========================================================================
// Global Toast System
// =========================================================================
function showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
    } else {
        iconSvg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b4dca" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px) scale(0.95)';
        setTimeout(() => toast.remove(), 200);
    }, 3200);
}

// =========================================================================
// Environment Context Studio (Interoperable with QDV, FetchXmlTester & webapi-tester)
// =========================================================================
const Env = {
    orgURLs: {},
    activeOrg: null,

    cleanUrl: function (raw) {
        if (!raw || typeof raw !== 'string') return '';
        let val = raw.trim().replace(/^["'<(\[]+|[>"')\]]+$/g, '').trim();
        if (!val) return '';

        const hasProtocol = /^https?:\/\//i.test(val);
        const hasDomainPattern = /[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/i.test(val) || /^localhost(:\d+)?/i.test(val);

        if (!hasProtocol && !hasDomainPattern) {
            return val;
        }

        if (!hasProtocol) {
            val = 'https://' + val;
        }

        try {
            const url = new URL(val);
            if (url.hostname && (url.hostname.includes('.') || url.hostname === 'localhost')) {
                return url.origin;
            }
        } catch (e) {
            const match = val.match(/^(https?:\/\/[^\/?#]+)/i);
            if (match) return match[1];
        }

        return val.replace(/[?#].*$/, '').replace(/\/+$/, '');
    },

    isValidURL: function (str) {
        if (!str || typeof str !== 'string') return false;
        const cleaned = this.cleanUrl(str);
        try {
            const url = new URL(cleaned);
            return url.hostname.length > 3 && (url.hostname.includes('.') || url.hostname === 'localhost');
        } catch (e) {
            return false;
        }
    },

    bindPasteCleaner: function (input) {
        if (!input) return;

        input.addEventListener('paste', (e) => {
            const clipboardData = e.clipboardData || window.clipboardData;
            const pastedText = clipboardData ? clipboardData.getData('text') : '';
            if (pastedText) {
                const cleaned = Env.cleanUrl(pastedText);
                if (cleaned) {
                    e.preventDefault();
                    input.value = cleaned;
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    showToast('URL sanitized (path and query stripped)', 'info');
                }
            }
        });

        input.addEventListener('input', () => {
            const cur = input.value;
            if (cur && (cur.includes('?') || cur.includes('#') || cur.includes('/main.aspx') || cur.includes('/api/'))) {
                const cleaned = Env.cleanUrl(cur);
                if (cleaned && cleaned !== cur) {
                    input.value = cleaned;
                }
            }
        });
    },

    init: function () {
        try {
            // Load from shared lsOrgURLs (QDV, FetchXmlTester, webapi-tester parity)
            const stored = localStorage.getItem('lsOrgURLs');
            if (stored) {
                this.orgURLs = JSON.parse(stored);
            }

            // Fallback to legacy orgURL
            const legacyOrg = localStorage.getItem('orgURL');
            if (legacyOrg && (!this.orgURLs || Object.keys(this.orgURLs).length === 0)) {
                const cleaned = this.cleanUrl(legacyOrg);
                if (cleaned) {
                    try {
                        const u = new URL(cleaned);
                        const name = u.hostname.split('.')[0] || 'default';
                        this.orgURLs[name] = cleaned;
                    } catch (e) { }
                }
            }

            // Set active organization
            const storedActive = localStorage.getItem('qdv_active_env') || localStorage.getItem('fx_active_env');
            if (storedActive && this.orgURLs[storedActive]) {
                this.activeOrg = storedActive;
            } else {
                const keys = Object.keys(this.orgURLs);
                if (keys.length > 0) {
                    this.activeOrg = keys[0];
                }
            }
        } catch (e) {
            console.error('Error loading environments', e);
        }

        // Check deep link query parameters (?env= or ?org=)
        const params = new URLSearchParams(window.location.search);
        const envParam = params.get('env') || params.get('org');
        if (envParam && this.isValidURL(envParam)) {
            this.add(envParam);
        }

        const modalInput = document.getElementById('txtModalEnv');
        if (modalInput) {
            this.bindPasteCleaner(modalInput);
            modalInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.handleAddFromModal();
                }
            });
        }

        this.syncHiddenInput();
        this.render();
    },

    syncHiddenInput: function () {
        const orgInput = document.getElementById('orgURL');
        if (orgInput) {
            orgInput.value = this.getActiveUrl() || '';
        }
    },

    getActiveUrl: function () {
        if (this.activeOrg && this.orgURLs[this.activeOrg]) {
            return this.orgURLs[this.activeOrg];
        }
        return '';
    },

    save: function () {
        localStorage.setItem('lsOrgURLs', JSON.stringify(this.orgURLs));
        if (this.activeOrg) {
            localStorage.setItem('qdv_active_env', this.activeOrg);
            localStorage.setItem('fx_active_env', this.activeOrg);
            if (this.orgURLs[this.activeOrg]) {
                localStorage.setItem('orgURL', this.orgURLs[this.activeOrg]);
            }
        }
        this.syncHiddenInput();
    },

    select: function (key) {
        if (this.orgURLs[key]) {
            this.activeOrg = key;
            this.save();
            this.render();
            showToast(`Connected to environment "${key}"`, 'success');
        }
    },

    add: function (rawUrl, customName) {
        const cleaned = this.cleanUrl(rawUrl);
        if (!this.isValidURL(cleaned)) {
            showToast('Please enter a valid Dataverse URL (e.g. https://org.crm.dynamics.com)', 'error');
            return false;
        }

        try {
            let name = (customName || '').trim();
            if (!name) {
                const url = new URL(cleaned);
                name = url.hostname.split('.')[0];
                if (name.toLowerCase() === 'www' || name.length <= 1) {
                    name = url.hostname;
                }
            }

            let uniqueName = name;
            let counter = 1;
            while (this.orgURLs[uniqueName] && this.orgURLs[uniqueName] !== cleaned) {
                uniqueName = `${name}-${counter++}`;
            }

            this.orgURLs[uniqueName] = cleaned;
            this.activeOrg = uniqueName;
            this.save();
            this.render();
            showToast(`Environment "${uniqueName}" added & activated!`, 'success');
            return true;
        } catch (e) {
            showToast('Invalid URL format', 'error');
            return false;
        }
    },

    remove: function (key, event) {
        if (event) event.stopPropagation();
        if (!this.orgURLs[key]) return;

        delete this.orgURLs[key];
        if (this.activeOrg === key) {
            const keys = Object.keys(this.orgURLs);
            this.activeOrg = keys.length > 0 ? keys[0] : null;
        }

        this.save();
        this.render();
        showToast(`Removed environment "${key}"`, 'info');
    },

    copyUrl: function (key, event) {
        if (event) event.stopPropagation();
        const url = this.orgURLs[key];
        if (!url) return;

        navigator.clipboard.writeText(url).then(() => {
            showToast(`Copied URL for ${key}`, 'success');
        });
    },

    render: function () {
        const keys = Object.keys(this.orgURLs);
        const pillsContainer = document.getElementById('envPillsRow');
        const modalList = document.getElementById('modalEnvList');
        const activeLabel = document.getElementById('envActiveLabel');
        const statusDot = document.getElementById('envStatusDot');
        const countLabel = document.getElementById('modalEnvCount');

        if (countLabel) {
            countLabel.textContent = `${keys.length} saved`;
        }

        if (this.activeOrg && this.orgURLs[this.activeOrg]) {
            if (activeLabel) {
                activeLabel.textContent = this.activeOrg;
                activeLabel.title = `${this.activeOrg} (${this.orgURLs[this.activeOrg]})`;
            }
            if (statusDot) {
                statusDot.className = 'status-dot';
            }
        } else {
            if (activeLabel) {
                activeLabel.textContent = 'No environment selected';
                activeLabel.title = 'Click to connect a Dataverse environment';
            }
            if (statusDot) {
                statusDot.className = 'status-dot offline';
            }
        }

        // Render Pills in Toolbar Strip
        if (pillsContainer) {
            if (keys.length === 0) {
                pillsContainer.innerHTML = `<span style="color: var(--text-subtle); font-size: 0.8rem;">No saved environments</span>`;
            } else {
                let pillsHtml = '';
                keys.forEach(key => {
                    const isSelected = key === this.activeOrg;
                    const url = this.orgURLs[key];
                    pillsHtml += `
                        <div class="env-pill ${isSelected ? 'selected' : ''}" 
                             onclick="Env.select('${key}')" 
                             title="${url}">
                            <span class="env-pill-status"></span>
                            <span>${key}</span>
                        </div>
                    `;
                });
                pillsContainer.innerHTML = pillsHtml;
            }
        }

        // Render Modal List with Actions
        if (modalList) {
            if (keys.length === 0) {
                modalList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 1.5rem 0; font-size: 0.85rem;">No environments added yet. Enter your Dynamics 365 / Dataverse URL above to connect.</div>`;
            } else {
                let listHtml = '';
                keys.forEach(key => {
                    const isSelected = key === this.activeOrg;
                    const url = this.orgURLs[key];
                    listHtml += `
                        <div class="env-item-row ${isSelected ? 'active' : ''}">
                            <div class="env-item-info" onclick="Env.select('${key}'); Env.closeModal();">
                                <span class="env-item-name">${key} ${isSelected ? '· Active' : ''}</span>
                                <span class="env-item-url">${url}</span>
                            </div>
                            <div class="env-item-actions">
                                ${isSelected ? '<span class="badge-active">Active</span>' : `<button class="btn-secondary" style="padding: 0.2rem 0.5rem; font-size: 0.75rem;" onclick="Env.select('${key}')">Select</button>`}
                                <button class="btn-action-icon" onclick="Env.copyUrl('${key}', event)" title="Copy URL">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                </button>
                                <button class="btn-action-icon delete" onclick="Env.remove('${key}', event)" title="Remove environment">
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                </button>
                            </div>
                        </div>
                    `;
                });
                modalList.innerHTML = listHtml;
            }
        }
    },

    openModal: function () {
        const modal = document.getElementById('envModal');
        if (modal) {
            modal.classList.add('active');
            this.render();
            const input = document.getElementById('txtModalEnv');
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 80);
            }
        }
    },

    closeModal: function () {
        const modal = document.getElementById('envModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    handleAddFromModal: function () {
        const input = document.getElementById('txtModalEnv');
        if (!input) return;

        const val = input.value.trim();
        if (!val) return;

        if (this.add(val)) {
            input.value = '';
            this.closeModal();
        }
    }
};

// =========================================================================
// Table Management & Studio Workspace State
// =========================================================================
let entities = new Set();
let entityCategories = {}; // { [entity]: 'common' | 'sales' | etc. }
let defaultEntities = [];
let favoriteTables = new Set();
try {
    const savedFavs = typeof localStorage !== 'undefined' ? localStorage.getItem('drc_favorites') : null;
    if (savedFavs) favoriteTables = new Set(JSON.parse(savedFavs));
} catch (e) {
    console.warn('Could not load favorites from localStorage', e);
}
let activeCategory = 'all';
let tableSearchQuery = '';

function toggleFavorite(entityName, event) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }
    const isFav = favoriteTables.has(entityName);
    if (isFav) {
        favoriteTables.delete(entityName);
        showToast(`Removed ${entityName} from favorites`, 'info');
    } else {
        favoriteTables.add(entityName);
        showToast(`Added ${entityName} to favorites`, 'success');
    }
    localStorage.setItem('drc_favorites', JSON.stringify(Array.from(favoriteTables)));

    if (activeCategory === 'favorites') {
        renderTags();
    } else {
        const card = document.querySelector(`.table-card[data-entity="${entityName}"]`);
        if (card) {
            const btn = card.querySelector('.table-fav-btn');
            if (btn) {
                const nowFav = favoriteTables.has(entityName);
                btn.className = `table-fav-btn ${nowFav ? 'active' : ''}`;
                btn.title = nowFav ? 'Remove from favorites' : 'Mark as favorite';
                btn.setAttribute('aria-label', nowFav ? 'Remove from favorites' : 'Mark as favorite');
                const svg = btn.querySelector('svg');
                if (svg) {
                    svg.setAttribute('fill', nowFav ? 'currentColor' : 'none');
                }
            }
        }
    }
    renderCategoryPills();
}

// Core String & Plural Helpers (Preserving Existing Logic)
function getPlural(entityName) {
    if (entityName.endsWith("s") || entityName.endsWith("x")) {
        return entityName + "es";
    } else if (entityName.endsWith("y")) {
        return entityName.slice(0, -1) + "ies";
    } else {
        return entityName + "s";
    }
}

function getSubdomain(url) {
    let domain = url;
    if (url.includes("://")) {
        domain = url.split('://')[1];
    }
    let subdomain = domain.split('.')[0];
    return subdomain.replaceAll('-', '_');
}

function getCountColumn(entityName) {
    if (["email", "letter", "fax", "phonecall", "appointment"].includes(entityName))
        return "createdon";
    return entityName + "id";
}

// Execution Handlers (Preserving Query Logic & Endpoints)
function runCount(entityName) {
    const activeUrl = Env.getActiveUrl();
    if (!activeUrl || !Env.isValidURL(activeUrl)) {
        showToast("Please connect or select a Dataverse environment first.", "error");
        Env.openModal();
        return;
    }

    const pluralName = getPlural(entityName);
    const countColumn = getCountColumn(entityName);
    const orgName = getSubdomain(activeUrl);

    const query = `/api/data/v9.2/${pluralName}?fetchXml=<fetch mapping="logical" distinct="false" aggregate="true"><entity name="${entityName}"><attribute name="${countColumn}" alias="${pluralName}_count_in_${orgName}_instance" aggregate="count"/></entity></fetch>`;

    window.open(activeUrl + query, '_blank');
    showToast(`Running aggregate count for ${entityName}...`, 'info');
}

function runSnapshotCount(entityName) {
    const activeUrl = Env.getActiveUrl();
    if (!activeUrl || !Env.isValidURL(activeUrl)) {
        showToast("Please connect or select a Dataverse environment first.", "error");
        Env.openModal();
        return;
    }

    const query = `/api/data/v9.2//RetrieveTotalRecordCount(EntityNames=['${entityName}'])`;
    window.open(activeUrl + query, '_blank');
    showToast(`Retrieving snapshot record count for ${entityName}...`, 'info');
}

function runExtendedQuery(entityName, action) {
    const activeUrl = Env.getActiveUrl();
    if (!activeUrl || !Env.isValidURL(activeUrl)) {
        showToast("Please connect or select a Dataverse environment first.", "error");
        Env.openModal();
        return;
    }

    const pluralName = getPlural(entityName);
    const countColumn = getCountColumn(entityName);
    let filter = "";
    const filterName = action;

    switch (action) {
        case "active":
            filter = `<attribute name="statecode" operator="eq" value="0" />`;
            break;
        case "inactive":
            filter = `<attribute name="statecode" operator="eq" value="1" />`;
            break;
        case "today":
            filter = `<attribute name="createdon" operator="today" />`;
            break;
        case "last7":
            filter = `<attribute name="createdon" operator="last-x-days" value="7" />`;
            break;
        case "last30":
            filter = `<attribute name="createdon" operator="last-x-days" value="30" />`;
            break;
    }

    const xml = `
<fetch mapping="logical" distinct="false" aggregate="true">
    <entity name="${entityName}">
        <attribute name="${countColumn}" alias="${pluralName}_${filterName}_count" aggregate="count"/>
        <filter>
            ${filter}
        </filter>
    </entity>
</fetch>`;

    const query = `/api/data/v9.2/${pluralName}?fetchXml=${encodeURIComponent(xml.replace(/\s+/g, ' ').trim())}`;
    window.open(activeUrl + query, '_blank');
    showToast(`Running ${action} count for ${entityName}...`, 'info');
}

// Table Rendering & Filtering
function renderTags() {
    const tagsContainer = document.getElementById('tags');
    const statsBadge = document.getElementById('tableStatsBadge');
    if (!tagsContainer) return;

    tagsContainer.innerHTML = '';
    const allEntities = Array.from(entities);

    const filtered = allEntities.filter(entity => {
        // Category Filter
        if (activeCategory !== 'all') {
            if (activeCategory === 'favorites') {
                if (!favoriteTables.has(entity)) return false;
            } else {
                const cat = entityCategories[entity] || 'custom';
                if (activeCategory === 'custom' && cat !== 'custom') return false;
                if (activeCategory !== 'custom' && cat !== activeCategory) return false;
            }
        }

        // Search Filter
        if (tableSearchQuery) {
            if (!entity.toLowerCase().includes(tableSearchQuery)) {
                return false;
            }
        }

        return true;
    });

    if (statsBadge) {
        statsBadge.textContent = `${filtered.length} of ${allEntities.length} tables`;
    }

    if (filtered.length === 0) {
        const emptyMsg = activeCategory === 'favorites'
            ? 'No favorite tables marked yet. Click the star icon (☆) on any table card to mark it as favorite.'
            : `No tables match "${tableSearchQuery || activeCategory}"`;

        tagsContainer.innerHTML = `
            <li class="empty-tables-message">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--text-subtle)" stroke-width="1.8">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <span>${emptyMsg}</span>
                <button class="btn-secondary" onclick="resetFilters()" style="margin-top: 0.5rem;">Reset Filter</button>
            </li>
        `;
        return;
    }

    filtered.forEach(entity => {
        const card = createTableCard(entity);
        tagsContainer.appendChild(card);
    });
}

function createTableCard(entityName) {
    const li = document.createElement('li');
    li.className = 'table-card';
    li.dataset.entity = entityName;

    const isFav = favoriteTables.has(entityName);

    li.innerHTML = `
        <div class="table-card-main">
            <div class="table-card-left">
                <button class="table-fav-btn ${isFav ? 'active' : ''}" 
                    onclick="toggleFavorite('${entityName}', event)" 
                    title="${isFav ? 'Remove from favorites' : 'Mark as favorite'}" 
                    aria-label="${isFav ? 'Remove from favorites' : 'Mark as favorite'}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                </button>
                <button class="btn-table-action" onclick="runCount('${entityName}')" title="Click to run Aggregate Count FetchXML">
                    <span class="table-name-text">${entityName}</span>
                </button>
            </div>
            <div class="table-card-actions">
                <button class="card-icon-btn" onclick="runCount('${entityName}')" 
                    title="Aggregate Count (FetchXML)" aria-label="Aggregate Count">🧮</button>
                <button class="card-icon-btn" onclick="runSnapshotCount('${entityName}')" 
                    title="Snapshot Count (RetrieveTotalRecordCount - fast for 50k+ rows)" aria-label="Snapshot Count">📷</button>
                <button class="card-icon-btn peacock-btn" onclick="toggleCardOptions('${entityName}', event)" 
                    title="More Query Options (Active, Inactive, Date Filters)" aria-label="More Options">🦚</button>
                <button class="card-icon-btn delete" onclick="deleteEntity('${entityName}', event)" 
                    title="Remove from list" aria-label="Remove">✖</button>
            </div>
        </div>
        <div class="options-dropdown" onclick="event.stopPropagation()">
            <div class="dropdown-header">Filter by Status &amp; Time</div>
            <div class="option-item" onclick="runExtendedQuery('${entityName}', 'active')">
                <span>Active</span> <span class="option-badge">statecode=0</span>
            </div>
            <div class="option-item" onclick="runExtendedQuery('${entityName}', 'inactive')">
                <span>Inactive</span> <span class="option-badge">statecode=1</span>
            </div>
            <div class="option-item" onclick="runExtendedQuery('${entityName}', 'today')">
                <span>Today</span> <span class="option-badge">created today</span>
            </div>
            <div class="option-item" onclick="runExtendedQuery('${entityName}', 'last7')">
                <span>Last 7 Days</span> <span class="option-badge">past 7d</span>
            </div>
            <div class="option-item" onclick="runExtendedQuery('${entityName}', 'last30')">
                <span>Last 30 Days</span> <span class="option-badge">past 30d</span>
            </div>
        </div>
    `;

    return li;
}

function toggleCardOptions(entityName, event) {
    if (event) event.stopPropagation();
    const card = document.querySelector(`.table-card[data-entity="${entityName}"]`);
    if (!card) return;

    const wasActive = card.classList.contains('active');

    // Close any other open dropdowns
    document.querySelectorAll('.table-card.active').forEach(c => c.classList.remove('active'));

    if (!wasActive) {
        card.classList.add('active');
    }
}

function renderCategoryPills() {
    const container = document.getElementById('categoryPillsRow');
    if (!container) return;

    const standardCategories = ['all', 'favorites', 'common', 'sales', 'service', 'activity', 'system', 'marketing'];
    const hasCustom = Array.from(entities).some(e => !entityCategories[e] || entityCategories[e] === 'custom');
    if (hasCustom) standardCategories.push('custom');

    container.innerHTML = '';
    standardCategories.forEach(cat => {
        const pill = document.createElement('button');
        pill.type = 'button';
        pill.className = `category-pill ${activeCategory === cat ? 'active' : ''}`;
        if (cat === 'favorites') {
            const count = favoriteTables.size;
            pill.innerHTML = `⭐ Favorites ${count > 0 ? `<span class="pill-count">(${count})</span>` : ''}`;
        } else {
            pill.textContent = cat.charAt(0).toUpperCase() + cat.slice(1);
        }
        pill.onclick = () => {
            activeCategory = cat;
            renderCategoryPills();
            renderTags();
        };
        container.appendChild(pill);
    });
}

function resetFilters() {
    activeCategory = 'all';
    tableSearchQuery = '';
    const searchInput = document.getElementById('tableSearchInput');
    const clearBtn = document.getElementById('btnClearSearch');
    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    renderCategoryPills();
    renderTags();
}

function addEntity(rawName) {
    const name = rawName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!name) return;

    if (entities.has(name)) {
        showToast(`Table "${name}" is already in the list`, 'info');
        return;
    }

    entities.add(name);
    if (!entityCategories[name]) {
        entityCategories[name] = 'custom';
    }

    updateStorage();
    renderCategoryPills();
    renderTags();
    showToast(`Added table "${name}"`, 'success');
}

function deleteEntity(entityName, event) {
    if (event) event.stopPropagation();
    if (entities.has(entityName)) {
        entities.delete(entityName);
        if (favoriteTables.has(entityName)) {
            favoriteTables.delete(entityName);
            localStorage.setItem('drc_favorites', JSON.stringify(Array.from(favoriteTables)));
        }
        updateStorage();
        renderCategoryPills();
        renderTags();
        showToast(`Removed table "${entityName}"`, 'info');
    }
}

function updateStorage() {
    localStorage.setItem("counterEntities", JSON.stringify(Array.from(entities)));
}

function resetDefaultTables() {
    if (confirm("Reset all tables back to the standard Dataverse tables?")) {
        entities = new Set(defaultEntities);
        updateStorage();
        resetFilters();
        showToast("Reset tables to default catalog", "success");
    }
}

function clearAllTables() {
    if (confirm("Clear all tables from your workspace?")) {
        entities.clear();
        updateStorage();
        renderTags();
        showToast("Cleared all tables", "info");
    }
}

// Shareable studio link
function shareEnvLink() {
    const activeUrl = Env.getActiveUrl();
    const url = new URL(window.location.href);
    url.searchParams.delete('env');
    url.searchParams.delete('org');

    if (activeUrl) {
        url.searchParams.set('env', activeUrl);
    }

    navigator.clipboard.writeText(url.toString()).then(() => {
        showToast('Sharable studio link copied to clipboard!', 'success');
    }).catch(() => {
        showToast('Failed to copy link to clipboard', 'error');
    });
}

// Dark/Light Theme Support
function initTheme() {
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;

    if (theme === 'dark') {
        // Sun icon
        icon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
    } else {
        // Moon icon
        icon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
    }
}

function closeNotice() {
    const notice = document.getElementById('quickInfoNotice');
    if (notice) {
        notice.style.display = 'none';
        localStorage.setItem('hideHelpNotice', 'true');
    }
}

function toggleHelpNotice() {
    const notice = document.getElementById('quickInfoNotice');
    if (!notice) return;

    if (notice.style.display === 'none' || window.getComputedStyle(notice).display === 'none') {
        notice.style.display = 'flex';
        localStorage.removeItem('hideHelpNotice');
        showToast('Help guide opened', 'info');
    } else {
        notice.style.display = 'none';
        localStorage.setItem('hideHelpNotice', 'true');
    }
}

// =========================================================================
// Initialization
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    Env.init();

    if (localStorage.getItem('hideHelpNotice') === 'true') {
        const notice = document.getElementById('quickInfoNotice');
        if (notice) notice.style.display = 'none';
    }

    // Load Default Catalog from tables.json
    try {
        const response = await fetch('tables.json');
        const data = await response.json();

        const defaultList = [];
        Object.entries(data).forEach(([category, tableList]) => {
            tableList.forEach(table => {
                defaultList.push(table);
                entityCategories[table] = category;
            });
        });

        defaultEntities = defaultList;

        if (localStorage.getItem("counterEntities") !== null) {
            const stored = JSON.parse(localStorage.getItem("counterEntities"));
            entities = new Set(stored);
        } else {
            entities = new Set(defaultEntities);
            updateStorage();
        }
    } catch (err) {
        console.error("Failed to load tables.json", err);
        const fallback = [
            "account", "contact", "email", "annotation", "team",
            "systemuser", "opportunity", "lead", "incident"
        ];
        defaultEntities = fallback;
        entities = new Set(fallback);
    }

    renderCategoryPills();
    renderTags();

    // Search input listener
    const searchInput = document.getElementById('tableSearchInput');
    const clearSearchBtn = document.getElementById('btnClearSearch');

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            tableSearchQuery = searchInput.value.trim().toLowerCase();
            if (clearSearchBtn) {
                clearSearchBtn.style.display = tableSearchQuery ? 'block' : 'none';
            }
            renderTags();
        });
    }

    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            tableSearchQuery = '';
            clearSearchBtn.style.display = 'none';
            renderTags();
            searchInput.focus();
        });
    }

    // Add table input listeners
    const inputTag = document.getElementById('input-tag');
    const btnAddTable = document.getElementById('btnAddTable');

    if (inputTag) {
        inputTag.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addEntity(inputTag.value);
                inputTag.value = '';
            }
        });
    }

    if (btnAddTable && inputTag) {
        btnAddTable.addEventListener('click', () => {
            addEntity(inputTag.value);
            inputTag.value = '';
        });
    }

    // Close any open options dropdowns on outside click
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.table-card')) {
            document.querySelectorAll('.table-card.active').forEach(item => {
                item.classList.remove('active');
            });
        }
    });

    // Keyboard Shortcuts:
    // Ctrl/Cmd + K: Environment Context Studio
    // Ctrl/Cmd + Shift + S: Share Link
    // Esc: Close Modal
    document.addEventListener('keydown', (e) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modKey = isMac ? e.metaKey : e.ctrlKey;

        if (modKey && (e.key === 'k' || e.key === 'K')) {
            e.preventDefault();
            Env.openModal();
            return;
        }

        if (modKey && e.shiftKey && (e.key === 's' || e.key === 'S')) {
            e.preventDefault();
            shareEnvLink();
            return;
        }

        if (e.key === 'Escape') {
            Env.closeModal();
            document.querySelectorAll('.table-card.active').forEach(c => c.classList.remove('active'));
        }
    });
});
