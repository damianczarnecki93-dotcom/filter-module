document.addEventListener('DOMContentLoaded', () => {
    const rawDataEl = document.getElementById('json-data');
    if (!rawDataEl) return;

    let products = [];
    try {
        products = JSON.parse(rawDataEl.textContent);
    } catch (e) {
        console.error("Failed to parse product JSON:", e);
        return;
    }

    // Interactive element references
    const productListContainer = document.getElementById('product-list');
    const productCountBadge = document.getElementById('product-count');
    const noResultsMsg = document.getElementById('no-results');
    const btnResetAll = document.getElementById('btn-reset-all');
    const searchInput = document.getElementById('search-input');

    // Filter list references
    const materialListContainer = document.getElementById('material-filter-list');
    const shapeListContainer = document.getElementById('shape-filter-list');
    const labelsListContainer = document.getElementById('labels-filter-list');

    // Sidebar references for mobile view
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    // Dynamic state trackers
    let activeMaterials = [];
    let activeShapes = [];
    let activeLabels = [];

    // Filter limit configurations
    let limits = {
        price: { min: 0, max: 0, currentMin: 0, currentMax: 0 },
        width: { min: 0, max: 0, currentMin: 0, currentMax: 0 },
        height: { min: 0, max: 0, currentMin: 0, currentMax: 0 }
    };

    // Helper: Initialize sliders min/max values based on products
    function initializeRanges() {
        if (products.length === 0) return;

        const prices = products.map(p => p.price || 0);
        const widths = products.map(p => p.width || 0);
        const heights = products.map(p => p.height || 0);

        limits.price.min = Math.min(...prices);
        limits.price.max = Math.max(...prices);
        limits.width.min = Math.min(...widths);
        limits.width.max = Math.max(...widths);
        limits.height.min = Math.min(...heights);
        limits.height.max = Math.max(...heights);

        // Reset currents
        limits.price.currentMin = limits.price.min;
        limits.price.currentMax = limits.price.max;
        limits.width.currentMin = limits.width.min;
        limits.width.currentMax = limits.width.max;
        limits.height.currentMin = limits.height.min;
        limits.height.currentMax = limits.height.max;

        // Apply to UI elements
        setupSlider('p', limits.price, 0.01);
        setupSlider('w', limits.width, 1);
        setupSlider('h', limits.height, 1);
    }

    function setupSlider(prefix, limit, step) {
        const minRange = document.getElementById(`min-${prefix}`);
        const maxRange = document.getElementById(`max-${prefix}`);
        const minValInput = document.getElementById(`val-${prefix}-min`);
        const maxValInput = document.getElementById(`val-${prefix}-max`);

        minRange.min = limit.min;
        minRange.max = limit.max;
        minRange.value = limit.min;
        minRange.step = step;

        maxRange.min = limit.min;
        maxRange.max = limit.max;
        maxRange.value = limit.max;
        maxRange.step = step;

        minValInput.value = limit.min.toFixed(prefix === 'p' ? 2 : 0);
        maxValInput.value = limit.max.toFixed(prefix === 'p' ? 2 : 0);

        // Bind events
        minRange.addEventListener('input', () => {
            let val = parseFloat(minRange.value);
            if (val > parseFloat(maxRange.value)) {
                val = parseFloat(maxRange.value);
                minRange.value = val;
            }
            limit.currentMin = val;
            minValInput.value = val.toFixed(prefix === 'p' ? 2 : 0);
            applyFilters();
        });

        maxRange.addEventListener('input', () => {
            let val = parseFloat(maxRange.value);
            if (val < parseFloat(minRange.value)) {
                val = parseFloat(minRange.value);
                maxRange.value = val;
            }
            limit.currentMax = val;
            maxValInput.value = val.toFixed(prefix === 'p' ? 2 : 0);
            applyFilters();
        });

        minValInput.addEventListener('change', () => {
            let val = parseFloat(minValInput.value) || limit.min;
            if (val < limit.min) val = limit.min;
            if (val > limit.currentMax) val = limit.currentMax;
            minValInput.value = val.toFixed(prefix === 'p' ? 2 : 0);
            minRange.value = val;
            limit.currentMin = val;
            applyFilters();
        });

        maxValInput.addEventListener('change', () => {
            let val = parseFloat(maxValInput.value) || limit.max;
            if (val > limit.max) val = limit.max;
            if (val < limit.currentMin) val = limit.currentMin;
            maxValInput.value = val.toFixed(prefix === 'p' ? 2 : 0);
            maxRange.value = val;
            limit.currentMax = val;
            applyFilters();
        });
    }

    // Helper: Dynamically build checkboxes lists based on products
    function populateCheckboxes() {
        const materials = [...new Set(products.map(p => p.material).filter(Boolean))].sort();
        const shapes = [...new Set(products.map(p => p.shape).filter(Boolean))].sort();
        const labels = [...new Set(products.map(p => p.labelsPerSheet).filter(Boolean))].sort((a,b) => parseInt(a)-parseInt(b));

        buildCheckboxList(materialListContainer, materials, 'material', activeMaterials);
        buildCheckboxList(shapeListContainer, shapes, 'shape', activeShapes);
        buildCheckboxList(labelsListContainer, labels, 'labels', activeLabels);
    }

    function buildCheckboxList(container, items, groupName, activeArray) {
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<div style="font-size:12px;color:#94a3b8;padding: 5px 0;">Brak opcji</div>';
            return;
        }

        items.forEach(item => {
            const wrapper = document.createElement('label');
            wrapper.className = 'filter-item';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = item;

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    activeArray.push(item);
                } else {
                    const idx = activeArray.indexOf(item);
                    if (idx > -1) activeArray.splice(idx, 1);
                }
                applyFilters();
            });

            const labelText = document.createTextNode(item);
            wrapper.appendChild(checkbox);
            wrapper.appendChild(labelText);
            container.appendChild(wrapper);
        });
    }

    // Filtering logic
    function applyFilters() {
        const query = searchInput.value.toLowerCase().trim();

        const filtered = products.filter(p => {
            // Text Search
            if (query && !p.name.toLowerCase().includes(query)) {
                return false;
            }

            // Price filter
            if (p.price < limits.price.currentMin || p.price > limits.price.currentMax) {
                return false;
            }

            // Width filter
            if (p.width < limits.width.currentMin || p.width > limits.width.currentMax) {
                return false;
            }

            // Height filter
            if (p.height < limits.height.currentMin || p.height > limits.height.currentMax) {
                return false;
            }

            // Material filter
            if (activeMaterials.length > 0 && !activeMaterials.includes(p.material)) {
                return false;
            }

            // Shape filter
            if (activeShapes.length > 0 && !activeShapes.includes(p.shape)) {
                return false;
            }

            // Labels per Sheet filter
            if (activeLabels.length > 0 && !activeLabels.includes(p.labelsPerSheet)) {
                return false;
            }

            return true;
        });

        renderProducts(filtered);
    }

    // Render logic
    function renderProducts(items) {
        productCountBadge.textContent = items.length;
        productListContainer.innerHTML = '';

        if (items.length === 0) {
            noResultsMsg.style.display = 'block';
            return;
        }
        noResultsMsg.style.display = 'none';

        items.forEach(p => {
            const card = document.createElement('div');
            card.className = 'product-card';

            const imgUrl = p.image || '/img/p/pl-default-home_default.jpg';

            card.innerHTML = `
                <div>
                    <div class="card-img-wrapper">
                        <img src="${imgUrl}" alt="${p.name}" class="card-img">
                    </div>
                    <h4 class="card-title" title="${p.name}">${p.name}</h4>
                    <div class="card-price">${p.formatted_price}</div>
                    <div class="card-details">
                        <p>Rozmiar: <span>${p.width} x ${p.height} mm</span></p>
                        ${p.material ? `<p>Materiał: <span>${p.material}</span></p>` : ''}
                        ${p.shape ? `<p>Kształt: <span>${p.shape}</span></p>` : ''}
                        ${p.labelsPerSheet ? `<p>Etykiet na ark.: <span>${p.labelsPerSheet}</span></p>` : ''}
                    </div>
                </div>
                <a href="${p.url}" class="card-btn">
                    <i class="material-icons">shopping_bag</i> Zobacz produkt
                </a>
            `;
            productListContainer.appendChild(card);
        });
    }

    // Reset All Filters
    btnResetAll.addEventListener('click', () => {
        searchInput.value = '';
        activeMaterials.length = 0;
        activeShapes.length = 0;
        activeLabels.length = 0;

        // Reset check boxes
        document.querySelectorAll('.checkbox-filter-list input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        // Reset ranges
        initializeRanges();
        applyFilters();
    });

    // Sidebar Toggles for responsive design
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }

    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // Search Input keyup trigger
    searchInput.addEventListener('input', applyFilters);

    // Initial load
    initializeRanges();
    populateCheckboxes();
    applyFilters();
});
