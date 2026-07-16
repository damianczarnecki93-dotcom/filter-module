document.addEventListener('DOMContentLoaded', () => {
    const rawDataEl = document.getElementById('json-data');
    const rawConfigEl = document.getElementById('config-data');
    if (!rawDataEl || !rawConfigEl) return;

    let products = [];
    let filtersConfig = [];

    try {
        products = JSON.parse(rawDataEl.textContent);
        filtersConfig = JSON.parse(rawConfigEl.textContent);
    } catch (e) {
        console.error("Failed to parse product or config JSON:", e);
        return;
    }

    const dynamicFiltersContainer = document.getElementById('dynamic-filters-container');
    const productListContainer = document.getElementById('product-list');
    const productCountBadge = document.getElementById('product-count');
    const noResultsMsg = document.getElementById('no-results');
    const btnResetAll = document.getElementById('btn-reset-all');

    // Sidebar references for mobile view
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    // Dynamic state trackers
    let filterStates = {};

    // Helper: parse numbers from string
    function parseNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const match = val.replace(',', '.').match(/(\d+(?:[.,]\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // Helper: parse dimension pair (e.g. "70x37" or "105 x 148 mm")
    function parseSizeSplit(val) {
        if (!val) return { w: 0, h: 0 };
        const match = val.replace(',', '.').match(/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i);
        if (match) {
            return { w: parseFloat(match[1]), h: parseFloat(match[2]) };
        }
        const single = parseNumber(val);
        return { w: single, h: single };
    }

    // Color swatches dictionary mapping Polish/English names to hex colors
    const colorMap = {
        'czarny': '#111827', 'czarna': '#111827', 'black': '#111827',
        'biały': '#ffffff', 'biała': '#ffffff', 'white': '#ffffff',
        'szary': '#6b7280', 'szara': '#6b7280', 'gray': '#6b7280', 'grey': '#6b7280',
        'czerwony': '#dc2626', 'czerwona': '#dc2626', 'red': '#dc2626',
        'niebieski': '#2563eb', 'niebieska': '#2563eb', 'blue': '#2563eb',
        'zielony': '#16a34a', 'zielona': '#16a34a', 'green': '#16a34a',
        'żółty': '#facc15', 'żółta': '#facc15', 'yellow': '#facc15',
        'pomarańczowy': '#ea580c', 'pomarańczowa': '#ea580c', 'orange': '#ea580c',
        'różowy': '#db2777', 'różowa': '#db2777', 'pink': '#db2777',
        'brązowy': '#78350f', 'brązowa': '#78350f', 'brown': '#78350f',
        'złoty': '#ca8a04', 'gold': '#ca8a04',
        'srebrny': '#cbd5e1', 'silver': '#cbd5e1',
        'przezroczysty': 'rgba(255, 255, 255, 0.2)', 'transparent': 'rgba(255, 255, 255, 0.2)'
    };

    function getSwatchColor(name) {
        if (!name) return '#e2e8f0';
        const cleanName = name.toLowerCase().trim();
        if (colorMap[cleanName]) return colorMap[cleanName];

        // Simple hash fallback for unmapped colors so they have beautiful swatches
        let hash = 0;
        for (let i = 0; i < cleanName.length; i++) {
            hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    // Helper: Build dynamic filters based on active backoffice configurations
    function buildDynamicFilters() {
        dynamicFiltersContainer.innerHTML = '';
        filterStates = {};

        const activeFilters = filtersConfig.filter(f => f.active);

        activeFilters.forEach(filter => {
            const fid = filter.id;
            const label = filter.label || 'Filtr';
            const type = filter.type;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';

            // Create Accordion Header
            const header = document.createElement('div');
            header.className = 'filter-header';
            header.innerHTML = `
                <label>${label}</label>
                <i class="material-icons chevron">expand_more</i>
            `;
            groupDiv.appendChild(header);

            // Create Accordion Body Container
            const body = document.createElement('div');
            body.className = 'filter-body';
            groupDiv.appendChild(body);

            // Register toggle event on header click
            header.addEventListener('click', () => {
                header.classList.toggle('collapsed');
            });

            if (fid === 'price') {
                // Price range slider
                const prices = products.map(p => p.price || 0);
                const min = prices.length ? Math.min(...prices) : 0;
                const max = prices.length ? Math.max(...prices) : 0;

                filterStates[fid] = {
                    type: 'slider',
                    min: min,
                    max: max,
                    currentMin: min,
                    currentMax: max
                };

                body.innerHTML = `
                    <div class="input-range-wrapper">
                        <input type="number" class="manual-input" id="val-price-min" value="${min.toFixed(2)}" min="${min}" step="0.01">
                        <span>-</span>
                        <input type="number" class="manual-input" id="val-price-max" value="${max.toFixed(2)}" min="${min}" step="0.01">
                    </div>
                    <div class="dual-slider">
                        <input type="range" id="min-price" value="${min}" min="${min}" max="${max}" step="0.01">
                        <input type="range" id="max-price" value="${max}" min="${min}" max="${max}" step="0.01">
                    </div>
                `;
                setupSliderEvents('price', filterStates[fid], true);

            } else if (type === 'slider') {
                // General numeric single slider
                const values = products.map(p => {
                    const featVal = p.features && p.features['f_' + fid];
                    return parseNumber(featVal);
                }).filter(v => v > 0);

                const min = values.length ? Math.min(...values) : 0;
                const max = values.length ? Math.max(...values) : 0;

                filterStates[fid] = {
                    type: 'slider',
                    min: min,
                    max: max,
                    currentMin: min,
                    currentMax: max,
                    featureId: fid
                };

                body.innerHTML = `
                    <div class="input-range-wrapper">
                        <input type="number" class="manual-input" id="val-${fid}-min" value="${min}" min="${min}" step="1">
                        <span>-</span>
                        <input type="number" class="manual-input" id="val-${fid}-max" value="${max}" min="${min}" step="1">
                    </div>
                    <div class="dual-slider">
                        <input type="range" id="min-${fid}" value="${min}" min="${min}" max="${max}" step="1">
                        <input type="range" id="max-${fid}" value="${max}" min="${min}" max="${max}" step="1">
                    </div>
                `;
                setupSliderEvents(fid, filterStates[fid], false);

            } else if (type === 'size_split') {
                // Width & Height double dual range slider split
                const widths = [];
                const heights = [];

                products.forEach(p => {
                    const featVal = p.features && p.features['f_' + fid];
                    if (featVal) {
                        const parsed = parseSizeSplit(featVal);
                        if (parsed.w > 0) widths.push(parsed.w);
                        if (parsed.h > 0) heights.push(parsed.h);
                    }
                });

                const minW = widths.length ? Math.min(...widths) : 0;
                const maxW = widths.length ? Math.max(...widths) : 0;
                const minH = heights.length ? Math.min(...heights) : 0;
                const maxH = heights.length ? Math.max(...heights) : 0;

                filterStates[fid] = {
                    type: 'size_split',
                    minW: minW,
                    maxW: maxW,
                    currentMinW: minW,
                    currentMaxW: maxW,
                    minH: minH,
                    maxH: maxH,
                    currentMinH: minH,
                    currentMaxH: maxH,
                    featureId: fid
                };

                body.innerHTML = `
                    <div style="margin-bottom: 20px;">
                        <span style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Szerokość (mm):</span>
                        <div class="input-range-wrapper">
                            <input type="number" class="manual-input" id="val-${fid}-w-min" value="${minW}" min="${minW}">
                            <span>-</span>
                            <input type="number" class="manual-input" id="val-${fid}-w-max" value="${maxW}" min="${minW}">
                        </div>
                        <div class="dual-slider">
                            <input type="range" id="min-${fid}-w" value="${minW}" min="${minW}" max="${maxW}">
                            <input type="range" id="max-${fid}-w" value="${maxW}" min="${minW}" max="${maxW}">
                        </div>
                    </div>
                    <div>
                        <span style="font-size:12px;font-weight:600;color:#64748b;display:block;margin-bottom:8px;">Wysokość (mm):</span>
                        <div class="input-range-wrapper">
                            <input type="number" class="manual-input" id="val-${fid}-h-min" value="${minH}" min="${minH}">
                            <span>-</span>
                            <input type="number" class="manual-input" id="val-${fid}-h-max" value="${maxH}" min="${minH}">
                        </div>
                        <div class="dual-slider">
                            <input type="range" id="min-${fid}-h" value="${minH}" min="${minH}" max="${maxH}">
                            <input type="range" id="max-${fid}-h" value="${maxH}" min="${minH}" max="${maxH}">
                        </div>
                    </div>
                `;
                setupSizeSplitEvents(fid, filterStates[fid]);

            } else if (type === 'checkboxes') {
                // Multi-select option pills or circular color swatches
                const uniqueValues = [...new Set(products.map(p => {
                    return p.features && p.features['f_' + fid];
                }).filter(Boolean))].sort();

                filterStates[fid] = {
                    type: 'checkboxes',
                    selected: [],
                    allOptions: uniqueValues,
                    featureId: fid
                };

                // Detect if it is a color swatch filter
                const isColor = /kolor|color|barwa/i.test(label);

                if (isColor) {
                    // Render beautiful circular color swatch grid
                    const swatchesHtml = uniqueValues.map(val => {
                        const hex = getSwatchColor(val);
                        const lightBorder = hex.toLowerCase() === '#ffffff' ? 'border: 1px solid #cbd5e1;' : '';
                        return `
                            <div class="swatch-item" data-val="${val}" style="background-color: ${hex}; ${lightBorder}" title="${val}"></div>
                        `;
                    }).join('');

                    body.innerHTML = `<div class="swatch-grid" id="grid-${fid}">${swatchesHtml}</div>`;
                    setupSwatchEvents(fid, filterStates[fid]);

                } else {
                    // Render beautiful rectangular pills with dynamic option parentheses counts
                    const inCategorySearchId = `search-cat-${fid}`;
                    const itemsContainerId = `list-${fid}`;

                    body.innerHTML = `
                        <div class="in-category-search">
                            <i class="material-icons">search</i>
                            <input type="text" id="${inCategorySearchId}" placeholder="Wyszukaj wartości...">
                        </div>
                        <div class="pill-filter-list" id="${itemsContainerId}">
                            <!-- Populated dynamically to support reactive live counts update -->
                        </div>
                    `;

                    setupPillsEvents(fid, filterStates[fid], inCategorySearchId, itemsContainerId);
                }
            }

            dynamicFiltersContainer.appendChild(groupDiv);
        });
    }

    // Helper: setup dual range slider listeners
    function setupSliderEvents(id, state, isDecimal) {
        const minRange = document.getElementById(`min-${id}`);
        const maxRange = document.getElementById(`max-${id}`);
        const minValInput = document.getElementById(`val-${id}-min`);
        const maxValInput = document.getElementById(`val-${id}-max`);

        const stepFormatter = (val) => isDecimal ? val.toFixed(2) : Math.round(val);

        minRange.addEventListener('input', () => {
            let val = parseFloat(minRange.value);
            if (val > parseFloat(maxRange.value)) {
                val = parseFloat(maxRange.value);
                minRange.value = val;
            }
            state.currentMin = val;
            minValInput.value = stepFormatter(val);
            applyFilters();
        });

        maxRange.addEventListener('input', () => {
            let val = parseFloat(maxRange.value);
            if (val < parseFloat(minRange.value)) {
                val = parseFloat(minRange.value);
                maxRange.value = val;
            }
            state.currentMax = val;
            maxValInput.value = stepFormatter(val);
            applyFilters();
        });

        minValInput.addEventListener('change', () => {
            let val = parseFloat(minValInput.value) || state.min;
            if (val < state.min) val = state.min;
            if (val > state.currentMax) val = state.currentMax;
            minValInput.value = stepFormatter(val);
            minRange.value = val;
            state.currentMin = val;
            applyFilters();
        });

        maxValInput.addEventListener('change', () => {
            let val = parseFloat(maxValInput.value) || state.max;
            if (val > state.max) val = state.max;
            if (val < state.currentMin) val = state.currentMin;
            maxValInput.value = stepFormatter(val);
            maxRange.value = val;
            state.currentMax = val;
            applyFilters();
        });
    }

    // Helper: setup double range slider split (width x height)
    function setupSizeSplitEvents(id, state) {
        // Width
        const minWRange = document.getElementById(`min-${id}-w`);
        const maxWRange = document.getElementById(`max-${id}-w`);
        const minWValInput = document.getElementById(`val-${id}-w-min`);
        const maxWValInput = document.getElementById(`val-${id}-w-max`);

        minWRange.addEventListener('input', () => {
            let val = parseFloat(minWRange.value);
            if (val > parseFloat(maxWRange.value)) {
                val = parseFloat(maxWRange.value);
                minWRange.value = val;
            }
            state.currentMinW = val;
            minWValInput.value = Math.round(val);
            applyFilters();
        });

        maxWRange.addEventListener('input', () => {
            let val = parseFloat(maxWRange.value);
            if (val < parseFloat(minWRange.value)) {
                val = parseFloat(minWRange.value);
                maxWRange.value = val;
            }
            state.currentMaxW = val;
            maxWValInput.value = Math.round(val);
            applyFilters();
        });

        minWValInput.addEventListener('change', () => {
            let val = parseFloat(minWValInput.value) || state.minW;
            if (val < state.minW) val = state.minW;
            if (val > state.currentMaxW) val = state.currentMaxW;
            minWValInput.value = Math.round(val);
            minWRange.value = val;
            state.currentMinW = val;
            applyFilters();
        });

        maxWValInput.addEventListener('change', () => {
            let val = parseFloat(maxWValInput.value) || state.maxW;
            if (val > state.maxW) val = state.maxW;
            if (val < state.currentMinW) val = state.currentMinW;
            maxWValInput.value = Math.round(val);
            maxWRange.value = val;
            state.currentMaxW = val;
            applyFilters();
        });

        // Height
        const minHRange = document.getElementById(`min-${id}-h`);
        const maxHRange = document.getElementById(`max-${id}-h`);
        const minHValInput = document.getElementById(`val-${id}-h-min`);
        const maxHValInput = document.getElementById(`val-${id}-h-max`);

        minHRange.addEventListener('input', () => {
            let val = parseFloat(minHRange.value);
            if (val > parseFloat(maxHRange.value)) {
                val = parseFloat(maxHRange.value);
                minHRange.value = val;
            }
            state.currentMinH = val;
            minHValInput.value = Math.round(val);
            applyFilters();
        });

        maxHRange.addEventListener('input', () => {
            let val = parseFloat(maxHRange.value);
            if (val < parseFloat(minHRange.value)) {
                val = parseFloat(minHRange.value);
                maxHRange.value = val;
            }
            state.currentMaxH = val;
            maxHValInput.value = Math.round(val);
            applyFilters();
        });

        minHValInput.addEventListener('change', () => {
            let val = parseFloat(minHValInput.value) || state.minH;
            if (val < state.minH) val = state.minH;
            if (val > state.currentMaxH) val = state.currentMaxH;
            minHValInput.value = Math.round(val);
            minHRange.value = val;
            state.currentMinH = val;
            applyFilters();
        });

        maxHValInput.addEventListener('change', () => {
            let val = parseFloat(maxHValInput.value) || state.maxH;
            if (val > state.maxH) val = state.maxH;
            if (val < state.currentMinH) val = state.currentMinH;
            maxHValInput.value = Math.round(val);
            maxHRange.value = val;
            state.currentMaxH = val;
            applyFilters();
        });
    }

    // Helper: setup circular color swatch events
    function setupSwatchEvents(id, state) {
        const grid = document.getElementById(`grid-${id}`);
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.swatch-item');
            if (!item) return;

            const val = item.getAttribute('data-val');
            item.classList.toggle('active');

            if (item.classList.contains('active')) {
                state.selected.push(val);
            } else {
                const idx = state.selected.indexOf(val);
                if (idx > -1) state.selected.splice(idx, 1);
            }
            applyFilters();
        });
    }

    // Helper: setup rectangular button pills events with internal search filter
    function setupPillsEvents(id, state, searchInputId, containerId) {
        const searchInput = document.getElementById(searchInputId);
        const container = document.getElementById(containerId);

        // Track local search term for list filtration
        state.searchTerm = '';

        searchInput.addEventListener('input', () => {
            state.searchTerm = searchInput.value.toLowerCase().trim();
            updatePillsRender(id, state, container);
        });

        // Trigger initial rendering of pills list
        updatePillsRender(id, state, container);
    }

    // Renders pills with dynamic option parentheses counts
    function updatePillsRender(id, state, container) {
        container.innerHTML = '';

        // Filter options by local search keyword
        const visibleOptions = state.allOptions.filter(opt => {
            return opt.toLowerCase().includes(state.searchTerm);
        });

        if (visibleOptions.length === 0) {
            container.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:10px 0;">Brak pasujących opcji</div>';
            return;
        }

        visibleOptions.forEach(opt => {
            const pill = document.createElement('div');
            pill.className = 'pill-item';
            if (state.selected.includes(opt)) {
                pill.classList.add('active');
            }

            // Multi-facet counting: count matching products if we force this option on this field
            const count = countProductsForOption(id, opt);

            pill.innerHTML = `${opt} <span style="font-weight:400;margin-left:4px;opacity:0.75;">(${count})</span>`;

            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                if (pill.classList.contains('active')) {
                    state.selected.push(opt);
                } else {
                    const idx = state.selected.indexOf(opt);
                    if (idx > -1) state.selected.splice(idx, 1);
                }
                applyFilters();
                // Update counts reactively on all other pills lists
                updateAllCheckboxesPills();
            });

            container.appendChild(pill);
        });
    }

    // Helper: update all pills render lists reactively to refresh parentheses counts
    function updateAllCheckboxesPills() {
        for (const [fid, state] of Object.entries(filterStates)) {
            if (state.type === 'checkboxes') {
                const label = filtersConfig.find(f => f.id == fid || f.id === fid)?.label || '';
                const isColor = /kolor|color|barwa/i.test(label);
                if (!isColor) {
                    const container = document.getElementById(`list-${fid}`);
                    if (container) {
                        updatePillsRender(fid, state, container);
                    }
                }
            }
        }
    }

    // Multi-facet dynamic product counter helper
    function countProductsForOption(targetFid, optValue) {
        return products.filter(p => {
            for (const [fid, state] of Object.entries(filterStates)) {
                // If it is the filter we are counting options for, we check if product features match 'optValue'
                if (fid == targetFid) {
                    const featVal = p.features && p.features['f_' + fid];
                    if (featVal !== optValue) {
                        return false;
                    }
                } else {
                    // Otherwise, check regular active states of other filters
                    if (fid === 'price') {
                        if (p.price < state.currentMin || p.price > state.currentMax) return false;
                    } else if (state.type === 'slider') {
                        const featVal = p.features && p.features['f_' + fid];
                        const num = parseNumber(featVal);
                        if (num < state.currentMin || num > state.currentMax) return false;
                    } else if (state.type === 'size_split') {
                        const featVal = p.features && p.features['f_' + fid];
                        const size = parseSizeSplit(featVal);
                        if (size.w < state.currentMinW || size.w > state.currentMaxW ||
                            size.h < state.currentMinH || size.h > state.currentMaxH) return false;
                    } else if (state.type === 'checkboxes') {
                        if (state.selected.length > 0) {
                            const featVal = p.features && p.features['f_' + fid];
                            if (!featVal || !state.selected.includes(featVal)) return false;
                        }
                    }
                }
            }
            return true;
        }).length;
    }

    // Apply active filter logic and render product grid
    function applyFilters() {
        const filtered = products.filter(p => {
            for (const [fid, state] of Object.entries(filterStates)) {
                if (fid === 'price') {
                    if (p.price < state.currentMin || p.price > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'slider') {
                    const featVal = p.features && p.features['f_' + fid];
                    const num = parseNumber(featVal);
                    if (num < state.currentMin || num > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'size_split') {
                    const featVal = p.features && p.features['f_' + fid];
                    const size = parseSizeSplit(featVal);
                    if (size.w < state.currentMinW || size.w > state.currentMaxW ||
                        size.h < state.currentMinH || size.h > state.currentMaxH) {
                        return false;
                    }
                } else if (state.type === 'checkboxes') {
                    if (state.selected.length > 0) {
                        const featVal = p.features && p.features['f_' + fid];
                        if (!featVal || !state.selected.includes(featVal)) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });

        renderProducts(filtered);
    }

    // Render list of matching products
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

            // Gather dynamically mapped features description badges
            let detailsHtml = '';
            filtersConfig.forEach(f => {
                if (f.active && f.id !== 'price') {
                    const val = p.features && p.features['f_' + f.id];
                    if (val) {
                        detailsHtml += `<p>${f.label}: <span>${val}</span></p>`;
                    }
                }
            });

            card.innerHTML = `
                <div>
                    <div class="card-img-wrapper">
                        <img src="${imgUrl}" alt="${p.name}" class="card-img">
                    </div>
                    <h4 class="card-title" title="${p.name}">${p.name}</h4>
                    <div class="card-price">${p.formatted_price}</div>
                    <div class="card-details">
                        ${detailsHtml}
                    </div>
                </div>
                <a href="${p.url}" class="card-btn">
                    <i class="material-icons">shopping_bag</i> Zobacz produkt
                </a>
            `;
            productListContainer.appendChild(card);
        });
    }

    // Reset all triggers and UI elements to initial values
    btnResetAll.addEventListener('click', () => {
        buildDynamicFilters();
        applyFilters();
    });

    // Mobile Sidebar Toggles
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

    // Initial builder execution
    buildDynamicFilters();
    applyFilters();
});
