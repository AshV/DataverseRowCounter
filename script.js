document.addEventListener('DOMContentLoaded', () => {
    const orgURL = document.querySelector("#orgURL");
    const tagsContainer = document.getElementById('tags');
    const inputTag = document.getElementById('input-tag');
    const themeToggle = document.getElementById('theme-toggle');
    const body = document.body;
    let entities = new Set();
    // Removed currentContextEntity as we can derive it from the DOM element

    // Initialize
    (async function init() {
        // Theme Init
        const savedTheme = localStorage.getItem('theme') || 'light';
        body.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);

        // Restore from LocalStorage
        if (localStorage.getItem("orgURL") !== null) {
            orgURL.value = localStorage.getItem("orgURL");
        }

        if (localStorage.getItem("counterEntities") !== null) {
            // Restore from storage
            const storedEntities = JSON.parse(localStorage.getItem("counterEntities"));
            entities = new Set(storedEntities);
            renderTags();
        } else {
            // Load from tables.json
            try {
                const response = await fetch('tables.json');
                const data = await response.json();

                // Flatten all arrays from the json into one set
                Object.values(data).forEach(categoryList => {
                    categoryList.forEach(e => entities.add(e));
                });

                updateStorage();
                renderTags();
            } catch (err) {
                console.error("Failed to load tables.json", err);
                // Fallback hardcoded list
                [
                    "account", "contact", "email", "annotation", "team",
                    "systemuser", "opportunity", "lead", "incident"
                ].forEach(e => entities.add(e));
                renderTags();
            }
        }
    })();

    // Event Listeners
    inputTag.addEventListener('keydown', function (event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            const tagContent = inputTag.value.trim();
            inputTag.value = '';
            if (tagContent !== '') {
                addEntity(tagContent);
            }
        }
    });

    tagsContainer.addEventListener('click', function (event) {
        const target = event.target;

        // Handle Delete
        if (target.classList.contains('delete-button')) {
            const entityName = target.dataset.entity;
            deleteEntity(entityName);
            return;
        }

        // Handle Snapshot
        if (target.classList.contains('snapshot-icon')) {
            const button = target.closest('.button-tag');
            if (button) {
                runSnapshotCount(button.dataset.name);
            }
            return;
        }

        // Handle Peacock (Expand)
        if (target.classList.contains('peacock-icon')) {
            event.stopPropagation(); // Prevent main button click
            const tagItem = target.closest('.tag-item');
            if (tagItem) {
                // Close others
                document.querySelectorAll('.tag-item.active').forEach(item => {
                    if (item !== tagItem) item.classList.remove('active');
                });
                // Toggle current
                tagItem.classList.toggle('active');
            }
            return;
        }

        // Handle Option Click
        if (target.classList.contains('option-item')) {
            event.stopPropagation();
            const action = target.dataset.action;
            const entity = target.dataset.entity;
            runExtendedQuery(entity, action);
            // Close after click
            target.closest('.tag-item').classList.remove('active');
            return;
        }

        // Handle Main Button Click (Run Count)
        const button = target.closest('.button-tag');
        if (button) {
            runCount(button.dataset.name);
        }
    });

    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    function updateThemeIcon(theme) {
        themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    // Close options on outside click
    document.addEventListener('click', (event) => {
        if (!event.target.closest('.tag-item')) {
            document.querySelectorAll('.tag-item.active').forEach(item => item.classList.remove('active'));
        }
    });

    // Removed context menu event listener as logic is now delegated above

    const validationMsg = document.getElementById('url-validation-msg');

    function showValidation(msg) {
        validationMsg.textContent = msg;
        validationMsg.classList.add('show');
        orgURL.classList.add('error'); // Assuming we add .error style to input
    }

    function clearValidation() {
        validationMsg.classList.remove('show');
        orgURL.classList.remove('error');
    }

    orgURL.addEventListener('input', clearValidation);

    orgURL.addEventListener('change', function () {
        if (orgURL.value.length === 0) return;

        if (isValidURL(orgURL.value)) {
            try {
                const url = new URL(orgURL.value);
                orgURL.value = url.origin;
                localStorage.setItem("orgURL", orgURL.value);
                clearValidation();
            } catch (e) {
                localStorage.setItem("orgURL", orgURL.value);
            }
        } else {
            showValidation("Please enter a valid organization URL.");
        }
    });

    // --- Core Functions ---

    function renderTags() {
        tagsContainer.innerHTML = '';
        entities.forEach(entity => {
            const tag = createTagElement(entity);
            tagsContainer.appendChild(tag);
        });
    }

    function createTagElement(entityName) {
        const li = document.createElement('li');
        li.className = 'tag-item';
        // Note: Added options-panel inside the list item
        li.innerHTML = `
            <button class="button-tag" data-name="${entityName}">
                <span class="delete-button" data-entity="${entityName}" title="Remove">✖</span>
                ${entityName}
                <span class="snapshot-icon" title="Snapshot Count (for 50k+ rows)" aria-label="Snapshot Count">📷</span>
                <span class="peacock-icon" title="More Options">🦚</span>
            </button>
            <div class="options-panel">
                <div class="option-item" data-action="active" data-entity="${entityName}">Active</div>
                <div class="option-item" data-action="inactive" data-entity="${entityName}">Inactive</div>
                <div class="option-item" data-action="today" data-entity="${entityName}">Today</div>
                <div class="option-item" data-action="last7" data-entity="${entityName}">Last 7 Days</div>
                <div class="option-item" data-action="last30" data-entity="${entityName}">Last 30 Days</div>
            </div>
        `;
        return li;
    }

    function addEntity(entityName) {
        if (!entities.has(entityName)) {
            entities.add(entityName);
            updateStorage();

            // Append single instead of re-render all for performance/animation
            const tag = createTagElement(entityName);
            tagsContainer.appendChild(tag);
        }
    }

    function deleteEntity(entityName) {
        if (entities.has(entityName)) {
            entities.delete(entityName);
            updateStorage();
            renderTags(); // Re-render to ensure order/clean state or just remove element
        }
    }

    function updateStorage() {
        localStorage.setItem("counterEntities", JSON.stringify(Array.from(entities)));
    }

    function isValidURL(str) {
        const regexp = /^(?:(?:https?|ftp):\/\/)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/;
        return regexp.test(str);
    }

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

    function runCount(entityName) {
        if (!orgURL.value || !isValidURL(orgURL.value)) {
            showValidation("Please enter a valid organization URL then retry.");
            return;
        }

        let pluralName = getPlural(entityName);
        let countColumn = getCountColumn(entityName);
        let orgName = getSubdomain(orgURL.value);

        let query = `/api/data/v9.2/${pluralName}?fetchXml=<fetch mapping="logical" distinct="false" aggregate="true"><entity name="${entityName}"><attribute name="${countColumn}" alias="${pluralName}_count_in_${orgName}_instance" aggregate="count"/></entity></fetch>`;

        window.open(orgURL.value + query, '_blank');
    }

    function runSnapshotCount(entityName) {
        if (!orgURL.value || !isValidURL(orgURL.value)) {
            showValidation("Please enter a valid organization URL then retry.");
            return;
        }

        let query = `/api/data/v9.2//RetrieveTotalRecordCount(EntityNames=['${entityName}'])`;
        window.open(orgURL.value + query, '_blank');
    }

    // Removed showContextMenu function

    function runExtendedQuery(entityName, action) {
        if (!orgURL.value || !isValidURL(orgURL.value)) {
            showValidation("Please enter a valid organization URL.");
            return;
        }

        let pluralName = getPlural(entityName);
        let countColumn = getCountColumn(entityName);
        let orgName = getSubdomain(orgURL.value);
        let filter = "";
        let filterName = action;

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

        // Simplified fetchXML construction
        let xml = `
<fetch mapping="logical" distinct="false" aggregate="true">
    <entity name="${entityName}">
        <attribute name="${countColumn}" alias="${pluralName}_${filterName}_count" aggregate="count"/>
        <filter>
            ${filter}
        </filter>
    </entity>
</fetch>`;

        let query = `/api/data/v9.2/${pluralName}?fetchXml=${encodeURIComponent(xml.replace(/\s+/g, ' ').trim())}`;
        window.open(orgURL.value + query, '_blank');
    }
});
