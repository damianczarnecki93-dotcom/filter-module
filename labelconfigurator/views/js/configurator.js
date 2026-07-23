document.addEventListener('DOMContentLoaded', () => {
    const rawDataEl = document.getElementById('json-data');
    const rawConfigEl = document.getElementById('config-data');
    const appEl = document.getElementById('configurator-app');

    if (!rawDataEl || !rawConfigEl || !appEl) return;

    // Helper: decode HTML entities (handles &quot;, &amp;, etc. safely)
    function decodeHtml(html) {
        const txt = document.createElement("textarea");
        txt.innerHTML = html;
        return txt.value;
    }

    // Helper: Try multiple formats to parse JSON (direct, HTML decoded, or Base64)
    function tryParse(rawStr) {
        if (!rawStr) return [];
        const str = rawStr.trim();

        try {
            return JSON.parse(str);
        } catch (e) {}

        try {
            const decoded = decodeHtml(str);
            return JSON.parse(decoded);
        } catch (e) {}

        try {
            const decodedBase64 = atob(str);
            return JSON.parse(decodedBase64);
        } catch (e) {}

        console.error("Failed to parse JSON string:", str);
        return [];
    }

    let products = [];
    let filtersConfig = [];

    products = tryParse(rawDataEl.textContent || rawDataEl.innerHTML);
    filtersConfig = tryParse(rawConfigEl.textContent || rawConfigEl.innerHTML);

    console.log("LabelConfigurator Raw Products Parsed:", products);
    console.log("LabelConfigurator Raw Filters Config Parsed:", filtersConfig);

    // Bulletproof conversion to Array in case of PHP JSON associative array / object serialization
    if (products && !Array.isArray(products)) {
        products = Object.values(products);
    }
    if (filtersConfig && !Array.isArray(filtersConfig)) {
        filtersConfig = Object.values(filtersConfig);
    }

    if (!products) products = [];
    if (!filtersConfig) filtersConfig = [];

    const dynamicFiltersContainer = document.getElementById('dynamic-filters-container');
    const btnResetAll = document.getElementById('btn-reset-all');
    const btnApplyFilters = document.getElementById('btn-apply-filters');

    // Configuration settings
    const isInstant = false; // Always force Apply button as per user's explicit request
    const ajaxUrl = appEl.getAttribute('data-ajax-url') || '';
    const idCategory = parseInt(appEl.getAttribute('data-id-category')) || 0;

    // Show/hide Apply Button based on configuration
    if (btnApplyFilters) {
        btnApplyFilters.style.display = 'block';
        btnApplyFilters.addEventListener('click', () => {
            applyFiltersByRedirect();
        });
    }

    // Sidebar references for mobile view
    const sidebar = document.getElementById('sidebar');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');

    // Dynamic state trackers
    let filterStates = {};
    let isCategoryLiveFilter = false;
    let mappedThemeCards = [];

    // Helper: Get Shape Pictogram SVG string based on shape category names
    function getShapePictogram(name) {
        if (!name) return '';
        const clean = name.toLowerCase().trim();

        // SVG Styling definitions for sleek UI icons
        const svgStart = '<svg class="lc-shape-icon" viewBox="0 0 24 24" width="20" height="20" style="vertical-align: middle; margin-right: 8px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; min-width: 20px;">';

        // 1. Owalny / Owalne
        if (clean === 'owalny' || clean === 'owalne') {
            return svgStart + '<ellipse cx="12" cy="12" rx="9" ry="5"></ellipse></svg>';
        }

        // 2. Okrągłe / Okrągły
        if (clean === 'okrągłe' || clean === 'okrągły' || clean === 'okragle' || clean === 'okragly') {
            return svgStart + '<circle cx="12" cy="12" r="8"></circle></svg>';
        }

        // 3. Kwadratowe / Kwadratowy
        if (clean === 'kwadratowe' || clean === 'kwadratowy' || clean === 'kwadrat') {
            return svgStart + '<rect x="4" y="4" width="16" height="16" rx="1"></rect></svg>';
        }

        // 4. Prostokątne / Prostokątny
        if (clean === 'prostokątne' || clean === 'prostokątny' || clean === 'prostokatne' || clean === 'prostokatny') {
            return svgStart + '<rect x="3" y="6" width="18" height="12" rx="0"></rect></svg>';
        }

        // 5. Prostokątne zaokrąglone / Prostokątny zaokrąglony
        if (clean.includes('zaokrąglone') || clean.includes('zaokraglone') || clean.includes('zaokrąglony') || clean.includes('zaokraglony')) {
            return svgStart + '<rect x="3" y="6" width="18" height="12" rx="3"></rect></svg>';
        }

        // 6. Cenowe / Cenowy
        if (clean === 'cenowe' || clean === 'cenowy') {
            return svgStart + '<path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>';
        }

        // 7. Jubilerskie / Jubilerski
        if (clean === 'jubilerskie' || clean === 'jubilerski') {
            return svgStart + '<path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path></svg>';
        }

        // Default: general label tag shape pictogram icon
        return svgStart + '<rect x="3" y="5" width="18" height="14" rx="2"></rect><line x1="3" y1="12" x2="21" y2="12"></line></svg>';
    }

    // Helper: Safely retrieve feature values without any null pointer exceptions
    function getFeatureValues(product, fid) {
        if (!product || !product.features) return [];
        const features = product.features;
        const key = 'f_' + fid;
        if (typeof features === 'object' && features !== null) {
            const val = features[key];
            if (Array.isArray(val)) {
                return val.map(v => String(v).trim());
            } else if (val !== undefined && val !== null) {
                const strVal = String(val).trim();
                if (strVal.startsWith('[') && strVal.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(strVal);
                        if (Array.isArray(parsed)) {
                            return parsed.map(v => String(v).trim());
                        }
                    } catch (e) {}
                }
                return [strVal];
            }
        }
        return [];
    }

    function getFeatureValue(product, fid) {
        const vals = getFeatureValues(product, fid);
        return vals.length > 0 ? vals[0] : '';
    }

    // Helper: Count products that have a specific option for a feature
    function countProductsForOption(fid, opt) {
        if (!products) return 0;
        return products.filter(p => {
            const vals = getFeatureValues(p, fid);
            return vals.includes(opt);
        }).length;
    }

    // Helper: parse numbers from string
    function parseNumber(val) {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const str = String(val);
        const match = str.replace(',', '.').match(/(\d+(?:[.,]\d+)?)/);
        return match ? parseFloat(match[1]) : 0;
    }

    // Helper: parse dimension pair (e.g. "99,1 x 42,3 mm" or "fi 40 mm")
    function parseSizeSplit(val) {
        if (!val) return { w: 0, h: 0 };
        // Normalize commas to dots, spaces, lowercases
        const str = String(val).replace(/,/g, '.').toLowerCase().trim();

        // 1. Check for circle diameter (e.g. fi 40, fi40, fi 40 mm, ø 40, średnica 40)
        const matchFi = str.match(/(?:fi|ø|średnica|srednica)\s*(\d+(?:\.\d+)?)/i);
        if (matchFi) {
            const dia = parseFloat(matchFi[1]);
            return { w: dia, h: dia };
        }

        // 2. Regular 2D dimension width x height (e.g. "99.1 x 42.3 mm" or "99.1x42.3")
        const match2D = str.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
        if (match2D) {
            return { w: parseFloat(match2D[1]), h: parseFloat(match2D[2]) };
        }

        // 3. Fallback: single number
        const single = parseNumber(val);
        return { w: single, h: single };
    }

    // Keep track of the initial cards per page limit to estimate real pagination
    let initialCardsCount = 12;
    const initialCards = document.querySelectorAll('.product-miniature, .js-product-miniature');
    if (initialCards && initialCards.length > 0) {
        initialCardsCount = initialCards.length;
    }

    // Custom Swatch style generator (returns CSS string for element background / border)
    function getSwatchStyle(name) {
        if (!name) return 'background: #e2e8f0;';
        const clean = name.toLowerCase().replace(/\s\s+/g, ' ').trim();

        // Accurate user request custom color swatches assignments
        if (clean === 'transparentny matowy' || clean === 'transparentny mat' || clean === 'matowy transparentny') {
            return 'background-color: #f1f5f9; background-image: linear-gradient(45deg, #e2e8f0 25%, transparent 25%, transparent 75%, #e2e8f0 75%, #e2e8f0), linear-gradient(45deg, #e2e8f0 25%, #f1f5f9 25%, #f1f5f9 75%, #e2e8f0 75%, #e2e8f0); background-size: 8px 8px; background-position: 0 0, 4px 4px; border: 1px solid #cbd5e1;';
        }

        if (clean === 'transparentny błyszczący' || clean === 'transparentny blyszczacy' || clean === 'transparentny błysk') {
            return 'background-color: #ffffff; background-image: linear-gradient(45deg, #cbd5e1 25%, transparent 25%, transparent 75%, #cbd5e1 75%, #cbd5e1), linear-gradient(45deg, #cbd5e1 25%, #ffffff 25%, #ffffff 75%, #cbd5e1 75%, #cbd5e1); background-size: 8px 8px; background-position: 0 0, 4px 4px; border: 1px solid #94a3b8; box-shadow: inset 0 0 4px rgba(255,255,255,0.8);';
        }

        if (clean === 'biały matowy' || clean === 'biały mat' || clean === 'bialy matowy') {
            return 'background: #ffffff; border: 1px solid #cbd5e1;';
        }

        if (clean === 'biały błyszczący' || clean === 'biały błysk' || clean === 'bialy blyszczacy') {
            return 'background: linear-gradient(135deg, #fffdf0 50%, #ffffff 50%); border: 1px solid #cbd5e1;';
        }

        if (clean === 'żółty' || clean === 'zolty') {
            return 'background: #facc15;';
        }

        if (clean === 'czerwony neonowy' || clean === 'czerwony neon' || clean === 'neonowy czerwony') {
            return 'background: #ff0055; box-shadow: 0 0 8px #ff0055;';
        }

        if (clean === 'żółty neonowy' || clean === 'neonowy zolty' || clean === 'żółty neon') {
            return 'background: #ccff00; box-shadow: 0 0 8px #ccff00;';
        }

        if (clean === 'pomarańczowy neonowy' || clean === 'pomarańczowy neon' || clean === 'neonowy pomaranczowy') {
            return 'background: #ff5500; box-shadow: 0 0 8px #ff5500;';
        }

        if (clean === 'zielony neonowy' || clean === 'zielony neon' || clean === 'neonowy zielony') {
            return 'background: #00ff66; box-shadow: 0 0 8px #00ff66;';
        }

        if (clean === 'zielony') {
            return 'background: #16a34a;';
        }

        if (clean === 'niebieski') {
            return 'background: #2563eb;';
        }

        if (clean === 'czerwony') {
            return 'background: #dc2626;';
        }

        if (clean === 'różowy' || clean === 'rozowy') {
            return 'background: #db2777;';
        }

        if (clean === 'ciemnoniebieski' || clean === 'ciemny niebieski') {
            return 'background: #1e3a8a;';
        }

        if (clean === 'ciemnozielony' || clean === 'ciemny zielony') {
            return 'background: #14532d;';
        }

        if (clean === 'popielaty' || clean === 'popiel') {
            return 'background: #94a3b8;';
        }

        if (clean === 'czarny' || clean === 'czarna') {
            return 'background: #111827;';
        }

        if (clean === 'złoty błyszczący' || clean === 'zloty blyszczacy' || clean === 'złoty') {
            return 'background: linear-gradient(135deg, #fef08a 0%, #ca8a04 50%, #fef08a 100%); border: 1px solid #a16207;';
        }

        if (clean === 'srebrny błyszczący' || clean === 'srebrny blyszczacy' || clean === 'srebrny') {
            return 'background: linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 50%, #f1f5f9 100%); border: 1px solid #94a3b8;';
        }

        if (clean === 'srebrny matowy' || clean === 'srebrny mat') {
            return 'background: #94a3b8; border: 1px solid #475569;';
        }

        if (clean === 'mix kolorów' || clean === 'mix' || clean === 'wielokolorowy') {
            return 'background: linear-gradient(45deg, #f43f5e, #3b82f6, #10b981, #eab308);';
        }

        if (clean === 'jasnobrązowy' || clean === 'jasny brazowy') {
            return 'background: #b45309;';
        }

        if (clean === 'granatowy') {
            return 'background: #0f172a;';
        }

        if (clean === 'błękitny' || clean === 'blekitny') {
            return 'background: #38bdf8;';
        }

        if (clean === 'jasnozielony' || clean === 'jasny zielony') {
            return 'background: #4ade80;';
        }

        if (clean === 'naturalny brązowy' || clean === 'naturalny brazowy') {
            return 'background: #78350f;';
        }

        // Generic color mapping fallbacks
        const colorMap = {
            'czarny': '#111827', 'czarna': '#111827', 'black': '#111827',
            'szary': '#6b7280', 'szara': '#6b7280', 'gray': '#6b7280', 'grey': '#6b7280',
            'czerwony': '#dc2626', 'czerwona': '#dc2626', 'red': '#dc2626',
            'niebieski': '#2563eb', 'niebieska': '#2563eb', 'blue': '#2563eb',
            'zielony': '#16a34a', 'zielona': '#16a34a', 'green': '#16a34a',
            'żółty': '#facc15', 'żółta': '#facc15', 'yellow': '#facc15',
            'pomarańczowy': '#ea580c', 'pomarańczowa': '#ea580c', 'orange': '#ea580c',
            'różowy': '#db2777', 'różowa': '#db2777', 'pink': '#db2777',
            'brązowy': '#78350f', 'brązowa': '#78350f', 'brown': '#78350f',
            'złoty': '#ca8a04', 'gold': '#ca8a04',
            'srebrny': '#cbd5e1', 'silver': '#cbd5e1'
        };

        if (colorMap[clean]) {
            return `background: ${colorMap[clean]};`;
        }

        let hash = 0;
        for (let i = 0; i < clean.length; i++) {
            hash = clean.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return `background: ${color};`;
    }

    // Helper: Normalize URL pathname to match reliably (stripping language slugs like /pl/)
    function getUrlPathname(urlStr) {
        if (!urlStr) return '';
        try {
            let path = '';
            if (urlStr.startsWith('/') || !urlStr.includes('://')) {
                path = urlStr.split('?')[0].split('#')[0];
            } else {
                const u = new URL(urlStr, window.location.origin);
                path = u.pathname;
            }
            // Strip language slug if present (e.g. /pl/ or /en/ or /de/)
            path = path.replace(/^\/[a-z]{2}\//i, '/');
            return path;
        } catch(e) {
            return urlStr;
        }
    }

    // Helper: Extract Product ID from theme miniature card with extreme robustness
    function getProductIdFromCard(cardEl) {
        // 1. Check data-id-product or data-id attributes
        let id = cardEl.getAttribute('data-id-product') || cardEl.getAttribute('data-id') || cardEl.getAttribute('data-product-id');
        if (id && !isNaN(id)) return parseInt(id);

        // 2. Search inside class list (e.g. id-product-123 or product-123)
        for (const cls of cardEl.classList) {
            const match = cls.match(/(?:id_product|id-product|product-id|product)-(\d+)/i);
            if (match) return parseInt(match[1]);
        }

        // 3. Search inside input fields or forms
        const idInput = cardEl.querySelector('input[name="id_product"]') || cardEl.querySelector('input[name="id"]');
        if (idInput && idInput.value && !isNaN(idInput.value)) return parseInt(idInput.value);

        const form = cardEl.querySelector('form[action*="cart"]');
        if (form) {
            const action = form.getAttribute('action');
            const matchAction = action.match(/id_product=(\d+)/i) || action.match(/id=(\d+)/i);
            if (matchAction) return parseInt(matchAction[1]);
        }

        // 4. Search inside anchor links (e.g. href="/123-product-name")
        const anchors = cardEl.querySelectorAll('a[href]');
        for (const a of anchors) {
            const href = a.getAttribute('href');
            if (href) {
                const matchId = href.match(/id_product=(\d+)/i) ||
                                href.match(/\/(\d+)-/i) ||
                                href.match(/-(\d+)\.html/i) ||
                                href.match(/-(\d+)$/i);
                if (matchId) return parseInt(matchId[1]);
            }
        }

        // 5. Check if the element itself has an ID or classes that can identify it
        if (cardEl.id) {
            const matchId = cardEl.id.match(/(?:id_product|id-product|product-id|product)-(\d+)/i);
            if (matchId) return parseInt(matchId[1]);
        }
        return null;
    }

    // Attempt to detect and map theme product cards for Live Category Filtering
    function detectThemeProducts() {
        const cardSelectors = [
            '.product-miniature',
            '.js-product-miniature',
            '.product-miniature-wrapper',
            '.product-preview',
            'article.product-miniature',
            '.products .product',
            '.products article'
        ];

        let foundCards = [];
        for (const selector of cardSelectors) {
            const els = document.querySelectorAll(selector);
            if (els && els.length > 0) {
                foundCards = Array.from(els);
                break;
            }
        }

        console.log("LabelConfigurator: Found card elements on page:", foundCards.length);

        if (foundCards.length === 0) {
            isCategoryLiveFilter = false;
            return;
        }

        mappedThemeCards = [];
        foundCards.forEach(cardEl => {
            let productId = getProductIdFromCard(cardEl);
            const anchors = cardEl.querySelectorAll('a[href]');
            let hrefs = Array.from(anchors).map(a => getUrlPathname(a.getAttribute('href'))).filter(Boolean);

            let matchedProduct = null;
            if (productId) {
                matchedProduct = products.find(p => p.id_product == productId);
            }
            if (!matchedProduct && hrefs.length > 0) {
                matchedProduct = products.find(p => {
                    const pPath = getUrlPathname(p.url);
                    return hrefs.some(href => href === pPath || href.endsWith(pPath) || pPath.endsWith(href));
                });
            }

            if (matchedProduct) {
                mappedThemeCards.push({
                    el: cardEl,
                    product: matchedProduct
                });
            } else {
                console.warn("LabelConfigurator: Card element has no matching product in JSON. ID:", productId, "Hrefs:", hrefs);
            }
        });

        console.log("LabelConfigurator: Successfully mapped theme cards:", mappedThemeCards.length);

        if (mappedThemeCards.length > 0) {
            isCategoryLiveFilter = true;

            // ADAPT SIDEBAR LAYOUT TO NATIVE LEFT COLUMN
            // Prevents overflow / squishing issues
            const app = document.getElementById('configurator-app');
            const layout = document.querySelector('.config-layout');
            const sidebar = document.getElementById('sidebar');

            if (app) app.style.maxWidth = '100%';
            if (layout) {
                layout.style.display = 'block';
                layout.style.gap = '0';
            }
            if (sidebar) {
                sidebar.style.width = '100%';
                sidebar.style.flex = 'none';
                sidebar.style.boxSizing = 'border-box';
            }
        }
    }

    // Helper: Build dynamic filters based on configuration
    function buildDynamicFilters() {
        console.log("LabelConfigurator: Building dynamic filters. Products available:", products.length);
        console.log("Filters configuration active:", filtersConfig);

        dynamicFiltersContainer.innerHTML = '';
        filterStates = {};

        const activeFilters = filtersConfig.filter(f => f && f.active);

        activeFilters.forEach(filter => {
            const fid = filter.id;
            const label = filter.label || 'Filtr';
            const type = filter.type;

            const groupDiv = document.createElement('div');
            groupDiv.className = 'filter-group';

            // Append groupDiv immediately to DOM so lookups succeed
            dynamicFiltersContainer.appendChild(groupDiv);

            // Create Accordion Header
            const header = document.createElement('div');
            header.className = 'filter-header';
            header.innerHTML = `
                <label>${label}</label>
                <i class="material-icons">expand_more</i>
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
                setupSliderEvents(body, 'price', filterStates[fid], true);

            } else if (type === 'slider') {
                const values = products.map(p => {
                    const featVal = getFeatureValue(p, fid);
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
                setupSliderEvents(body, fid, filterStates[fid], false);

            } else if (type === 'size_split') {
                const widthsSet = new Set();
                const heightsSet = new Set();

                products.forEach(p => {
                    const featVals = getFeatureValues(p, fid);
                    featVals.forEach(featVal => {
                        if (featVal) {
                            const parsed = parseSizeSplit(featVal);
                            if (parsed.w > 0) widthsSet.add(parsed.w);
                            if (parsed.h > 0) heightsSet.add(parsed.h);
                        }
                    });
                });

                const uniqueWidths = Array.from(widthsSet).sort((a, b) => a - b);
                const uniqueHeights = Array.from(heightsSet).sort((a, b) => a - b);

                filterStates[fid] = {
                    type: 'size_split',
                    selectedW: null,
                    selectedH: null,
                    shape: 'rectangle',
                    featureId: fid,
                    allWidths: uniqueWidths,
                    allHeights: uniqueHeights
                };

                body.innerHTML = `
                    <div class="lc-size-visualizer-section">
                        <!-- Shape selector toggle -->
                        <div class="lc-shape-toggle-buttons">
                            <button class="lc-shape-toggle-btn active" id="btn-shape-rect-${fid}" data-shape="rectangle">Prostokąt</button>
                            <button class="lc-shape-toggle-btn" id="btn-shape-circle-${fid}" data-shape="circle">Koło</button>
                        </div>

                        <!-- Shape preview visualizer -->
                        <div class="lc-size-visualizer-container">
                            <div class="lc-visualizer-shape rectangle" id="visualizer-shape-${fid}">
                                <span class="lc-shape-label" id="visualizer-text-${fid}">Wpisz wymiary</span>
                                <span class="lc-dimension-indicator-w" id="indicator-w-${fid}">-</span>
                                <span class="lc-dimension-indicator-h" id="indicator-h-${fid}">-</span>
                            </div>
                        </div>

                        <!-- Width input with combo box -->
                        <div class="lc-combo-box" id="combo-w-container-${fid}">
                            <span class="lc-combo-label" id="combo-w-label-${fid}">Szerokość (mm):</span>
                            <div class="lc-combo-input-wrapper">
                                <input type="text" class="lc-combo-input" id="combo-w-input-${fid}" placeholder="Wpisz lub wybierz..." autocomplete="off">
                                <span class="lc-combo-toggle" id="combo-w-toggle-${fid}">▼</span>
                                <div class="lc-combo-dropdown" id="combo-w-dropdown-${fid}">
                                    ${uniqueWidths.map(w => `<div class="lc-combo-option" data-value="${w}">${w} mm</div>`).join('')}
                                </div>
                            </div>
                            <div class="lc-size-suggestions" id="combo-w-suggestions-${fid}"></div>
                        </div>

                        <!-- Height input with combo box -->
                        <div class="lc-combo-box" id="combo-h-container-${fid}">
                            <span class="lc-combo-label" id="combo-h-label-${fid}">Wysokość (mm):</span>
                            <div class="lc-combo-input-wrapper">
                                <input type="text" class="lc-combo-input" id="combo-h-input-${fid}" placeholder="Wpisz lub wybierz..." autocomplete="off">
                                <span class="lc-combo-toggle" id="combo-h-toggle-${fid}">▼</span>
                                <div class="lc-combo-dropdown" id="combo-h-dropdown-${fid}">
                                    ${uniqueHeights.map(h => `<div class="lc-combo-option" data-value="${h}">${h} mm</div>`).join('')}
                                </div>
                            </div>
                            <div class="lc-size-suggestions" id="combo-h-suggestions-${fid}"></div>
                        </div>
                    </div>
                `;

                setupGraphicalSizeEvents(body, fid, filterStates[fid]);

            } else if (type === 'checkboxes') {
                const allVals = [];
                products.forEach(p => {
                    getFeatureValues(p, fid).forEach(v => {
                        if (v && !allVals.includes(v)) {
                            allVals.push(v);
                        }
                    });
                });
                const uniqueValues = allVals.sort();

                filterStates[fid] = {
                    type: 'checkboxes',
                    selected: [],
                    allOptions: uniqueValues,
                    featureId: fid
                };

                const isColor = /kolor|color|barwa/i.test(label);

                if (isColor) {
                    const swatchesHtml = uniqueValues.map(val => {
                        const swatchStyle = getSwatchStyle(val);
                        return `
                            <div class="swatch-item" data-val="${val}" style="${swatchStyle}" title="${val}"></div>
                        `;
                    }).join('');

                    body.innerHTML = `<div class="swatch-grid" id="grid-${fid}">${swatchesHtml}</div>`;
                    setupSwatchEvents(body, fid, filterStates[fid]);

                } else {
                    const inCategorySearchId = `search-cat-${fid}`;
                    const itemsContainerId = `list-${fid}`;
                    const dropdownTriggerId = `trigger-${fid}`;
                    const dropdownMenuId = `menu-${fid}`;

                    body.innerHTML = `
                        <div class="lc-custom-dropdown" id="dropdown-${fid}">
                            <div class="lc-dropdown-trigger" id="${dropdownTriggerId}">
                                <span class="lc-trigger-text">Wybierz opcje...</span>
                                <i class="material-icons lc-chevron">expand_more</i>
                            </div>
                            <div class="lc-dropdown-menu" id="${dropdownMenuId}" style="display: none;">
                                <div class="lc-in-category-search">
                                    <i class="material-icons">search</i>
                                    <input type="text" id="${inCategorySearchId}" placeholder="Wyszukaj wartości...">
                                </div>
                                <div class="lc-select-options" id="${itemsContainerId}">
                                </div>
                            </div>
                        </div>
                    `;

                    // Handle custom dropdown open/close click event
                    const trigger = body.querySelector(`#${dropdownTriggerId}`);
                    const menu = body.querySelector(`#${dropdownMenuId}`);

                    trigger.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Close all other open dropdowns first
                        document.querySelectorAll('.lc-dropdown-menu').forEach(m => {
                            if (m !== menu) m.style.display = 'none';
                        });
                        document.querySelectorAll('.lc-dropdown-trigger').forEach(t => {
                            if (t !== trigger) t.classList.remove('open');
                        });

                        const isOpen = menu.style.display === 'flex';
                        menu.style.display = isOpen ? 'none' : 'flex';
                        trigger.classList.toggle('open', !isOpen);
                    });

                    // Prevent click inside menu from closing the dropdown
                    menu.addEventListener('click', (e) => {
                        e.stopPropagation();
                    });

                    setupPillsEvents(body, fid, filterStates[fid], inCategorySearchId, itemsContainerId, trigger);
                }
            }
        });
    }

    function onFilterInput() {
        updateAllCheckboxesPills();
        if (isInstant) {
            applyFiltersByRedirect();
        }
    }

    function setupSliderEvents(parentEl, id, state, isDecimal) {
        const minRange = parentEl.querySelector(`#min-${id}`);
        const maxRange = parentEl.querySelector(`#max-${id}`);
        const minValInput = parentEl.querySelector(`#val-${id}-min`);
        const maxValInput = parentEl.querySelector(`#val-${id}-max`);

        if (!minRange || !maxRange || !minValInput || !maxValInput) return;

        function updateRangeOverlap(e) {
            if (e.target === minRange) {
                minRange.style.zIndex = "10";
                maxRange.style.zIndex = "9";
            } else {
                minRange.style.zIndex = "9";
                maxRange.style.zIndex = "10";
            }
        }

        const stepFormatter = (val) => isDecimal ? val.toFixed(2) : Math.round(val);

        minRange.addEventListener('input', (e) => {
            updateRangeOverlap(e);
            let val = parseFloat(minRange.value);
            if (val > parseFloat(maxRange.value)) {
                val = parseFloat(maxRange.value);
                minRange.value = val;
            }
            state.currentMin = val;
            minValInput.value = stepFormatter(val);
            onFilterInput();
        });

        maxRange.addEventListener('input', (e) => {
            updateRangeOverlap(e);
            let val = parseFloat(maxRange.value);
            if (val < parseFloat(minRange.value)) {
                val = parseFloat(minRange.value);
                maxRange.value = val;
            }
            state.currentMax = val;
            maxValInput.value = stepFormatter(val);
            onFilterInput();
        });

        minValInput.addEventListener('change', () => {
            let val = parseFloat(minValInput.value) || state.min;
            if (val < state.min) val = state.min;
            if (val > state.currentMax) val = state.currentMax;
            minValInput.value = stepFormatter(val);
            minRange.value = val;
            state.currentMin = val;
            onFilterInput();
        });

        maxValInput.addEventListener('change', () => {
            let val = parseFloat(maxValInput.value) || state.max;
            if (val > state.max) val = state.max;
            if (val < state.currentMin) val = state.currentMin;
            maxValInput.value = stepFormatter(val);
            maxRange.value = val;
            state.currentMax = val;
            onFilterInput();
        });
    }

    function setupGraphicalSizeEvents(parentEl, id, state) {
        const btnRect = parentEl.querySelector(`#btn-shape-rect-${id}`);
        const btnCircle = parentEl.querySelector(`#btn-shape-circle-${id}`);
        const shapeEl = parentEl.querySelector(`#visualizer-shape-${id}`);
        const textEl = parentEl.querySelector(`#visualizer-text-${id}`);
        const indW = parentEl.querySelector(`#indicator-w-${id}`);
        const indH = parentEl.querySelector(`#indicator-h-${id}`);

        const comboWInput = parentEl.querySelector(`#combo-w-input-${id}`);
        const comboWToggle = parentEl.querySelector(`#combo-w-toggle-${id}`);
        const comboWDropdown = parentEl.querySelector(`#combo-w-dropdown-${id}`);
        const labelW = parentEl.querySelector(`#combo-w-label-${id}`);
        const suggestionsWContainer = parentEl.querySelector(`#combo-w-suggestions-${id}`);

        const comboHContainer = parentEl.querySelector(`#combo-h-container-${id}`);
        const comboHInput = parentEl.querySelector(`#combo-h-input-${id}`);
        const comboHToggle = parentEl.querySelector(`#combo-h-toggle-${id}`);
        const comboHDropdown = parentEl.querySelector(`#combo-h-dropdown-${id}`);
        const suggestionsHContainer = parentEl.querySelector(`#combo-h-suggestions-${id}`);

        function getClosestValues(targetVal, allAvailable) {
            if (!targetVal || isNaN(targetVal) || targetVal <= 0) {
                // Return first 6 available values as general suggestions
                return {
                    smaller: [],
                    larger: allAvailable.slice(0, 6),
                    exact: null
                };
            }

            const sorted = [...allAvailable].sort((a, b) => a - b);
            const exact = sorted.find(v => Math.abs(v - targetVal) < 0.01) || null;

            const smallerPool = sorted.filter(v => v < targetVal - 0.01);
            const smaller = smallerPool.slice(-3);

            const largerPool = sorted.filter(v => v > targetVal + 0.01);
            const larger = largerPool.slice(0, 3);

            return { smaller, larger, exact };
        }

        function updateSuggestionsUI(inputElement, suggestionsContainer, allValues) {
            const currentVal = parseFloat(inputElement.value) || 0;
            const { smaller, larger, exact } = getClosestValues(currentVal, allValues);

            suggestionsContainer.innerHTML = '';

            if (smaller.length === 0 && larger.length === 0 && !exact) {
                return;
            }

            const title = document.createElement('div');
            title.className = 'lc-suggestions-title';
            title.textContent = 'Dostępne zbliżone (wybierz):';
            suggestionsContainer.appendChild(title);

            smaller.forEach(v => {
                const badge = document.createElement('div');
                badge.className = 'lc-suggestion-badge';
                badge.textContent = `${v} mm`;
                badge.addEventListener('click', (e) => {
                    e.preventDefault();
                    inputElement.value = v;
                    updateVisualizer();
                });
                suggestionsContainer.appendChild(badge);
            });

            if (exact) {
                const badge = document.createElement('div');
                badge.className = 'lc-suggestion-badge exact active';
                badge.textContent = `${exact} mm`;
                suggestionsContainer.appendChild(badge);
            }

            larger.forEach(v => {
                const badge = document.createElement('div');
                badge.className = 'lc-suggestion-badge';
                badge.textContent = `${v} mm`;
                badge.addEventListener('click', (e) => {
                    e.preventDefault();
                    inputElement.value = v;
                    updateVisualizer();
                });
                suggestionsContainer.appendChild(badge);
            });
        }

        function updateVisualizer() {
            const w = parseFloat(comboWInput.value) || 0;
            const h = state.shape === 'circle' ? w : (parseFloat(comboHInput.value) || 0);

            // Update State
            state.selectedW = w > 0 ? w : null;
            state.selectedH = state.shape === 'circle' ? null : (h > 0 ? h : null);

            // Update dimension indicators
            if (state.shape === 'circle') {
                shapeEl.className = 'lc-visualizer-shape circle';
                indH.style.display = 'none';
                if (w > 0) {
                    textEl.textContent = `Ø ${w} mm`;
                    indW.textContent = `Ø ${w} mm`;
                } else {
                    textEl.textContent = 'Średnica';
                    indW.textContent = '-';
                }
            } else {
                shapeEl.className = 'lc-visualizer-shape rectangle';
                indH.style.display = 'block';
                if (w > 0 || h > 0) {
                    textEl.textContent = `${w || '?'} x ${h || '?'} mm`;
                    indW.textContent = w ? `${w} mm` : '-';
                    indH.textContent = h ? `${h} mm` : '-';
                } else {
                    textEl.textContent = 'Wpisz wymiary';
                    indW.textContent = '-';
                    indH.textContent = '-';
                }
            }

            // Animate / scale the element proportionally
            const maxDim = 100;
            let displayW = maxDim;
            let displayH = maxDim;

            const activeW = w > 0 ? w : 50;
            const activeH = h > 0 ? h : (state.shape === 'circle' ? 50 : 30);

            if (activeW >= activeH) {
                displayH = (activeH / activeW) * maxDim;
                if (displayH < 30) displayH = 30;
            } else {
                displayW = (activeW / activeH) * maxDim;
                if (displayW < 30) displayW = 30;
            }

            shapeEl.style.width = displayW + 'px';
            shapeEl.style.height = displayH + 'px';

            // Update nearest dynamic suggestions
            updateSuggestionsUI(comboWInput, suggestionsWContainer, state.allWidths);
            if (state.shape !== 'circle') {
                updateSuggestionsUI(comboHInput, suggestionsHContainer, state.allHeights);
            }

            onFilterInput();
        }

        // Toggle buttons logic
        btnRect.addEventListener('click', (e) => {
            e.preventDefault();
            btnRect.classList.add('active');
            btnCircle.classList.remove('active');
            state.shape = 'rectangle';
            comboHContainer.style.display = 'block';
            labelW.textContent = 'Szerokość (mm):';
            updateVisualizer();
        });

        btnCircle.addEventListener('click', (e) => {
            e.preventDefault();
            btnCircle.classList.add('active');
            btnRect.classList.remove('active');
            state.shape = 'circle';
            comboHContainer.style.display = 'none';
            labelW.textContent = 'Średnica (mm):';
            updateVisualizer();
        });

        // Setup combo box
        function setupComboHandlers(input, toggle, dropdown, onSelect) {
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                toggle.classList.toggle('open');
                dropdown.classList.toggle('open');
            });

            input.addEventListener('focus', () => {
                toggle.classList.add('open');
                dropdown.classList.add('open');
            });

            input.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            input.addEventListener('input', () => {
                const searchVal = input.value.trim().toLowerCase();
                const options = dropdown.querySelectorAll('.lc-combo-option');
                options.forEach(opt => {
                    const txt = opt.textContent.toLowerCase();
                    if (txt.includes(searchVal)) {
                        opt.style.display = 'block';
                    } else {
                        opt.style.display = 'none';
                    }
                });
                updateVisualizer();
            });

            dropdown.addEventListener('click', (e) => {
                const opt = e.target.closest('.lc-combo-option');
                if (opt) {
                    const val = opt.getAttribute('data-value');
                    input.value = val;
                    dropdown.classList.remove('remove');
                    dropdown.classList.remove('open');
                    toggle.classList.remove('open');
                    onSelect(val);
                }
            });

            document.addEventListener('click', () => {
                dropdown.classList.remove('open');
                toggle.classList.remove('open');
            });
        }

        setupComboHandlers(comboWInput, comboWToggle, comboWDropdown, (val) => {
            updateVisualizer();
        });

        setupComboHandlers(comboHInput, comboHToggle, comboHDropdown, (val) => {
            updateVisualizer();
        });

        comboWInput.addEventListener('change', updateVisualizer);
        comboHInput.addEventListener('change', updateVisualizer);

        // Pre-fill / Restore state if page loaded with existing selections
        if (state.selectedW) {
            comboWInput.value = state.selectedW;
        }
        if (state.selectedH) {
            comboHInput.value = state.selectedH;
        }
        if (state.shape === 'circle') {
            btnCircle.click();
        } else {
            updateVisualizer();
        }
    }

    function setupSwatchEvents(parentEl, id, state) {
        const grid = parentEl.querySelector(`#grid-${id}`);
        if (!grid) return;

        grid.addEventListener('click', (e) => {
            const item = e.target.closest('.swatch-item');
            if (!item) return;

            const val = item.getAttribute('data-val');
            item.classList.toggle('active');

            if (item.classList.contains('active')) {
                if (!state.selected.includes(val)) {
                    state.selected.push(val);
                }
            } else {
                const idx = state.selected.indexOf(val);
                if (idx > -1) state.selected.splice(idx, 1);
            }
            state.selected = [...new Set(state.selected)];
            onFilterInput();
        });
    }

    // Redirect Filtering Strategy building native URL parameters (PrestaShop Faceted Search structure)
    function applyFiltersByRedirect() {
        const queryParts = [];

        // Parse already active query parameter q to preserve other active filters if desired
        const urlParams = new URLSearchParams(window.location.search);
        let existingQ = urlParams.get('q') || '';

        for (const [fid, state] of Object.entries(filterStates)) {
            // Find filter configuration original name
            const config = filtersConfig.find(f => f.id == fid || f.id === fid);
            if (!config) continue;

            const filterLabel = config.original_name || config.label;

            if (state.type === 'checkboxes') {
                if (state.selected && state.selected.length > 0) {
                    // For multiple values in PrestaShop faceted search: "Rodzaj+drukarki-kopiarka-laserowa" or separate parts
                    // We join options with '-'
                    const valuesJoined = state.selected.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                    queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                }
            } else if (state.type === 'slider') {
                // Check if slider range has been changed from initial limits
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    // Find all product features values that match this range to pass them as exact option values
                    const matchedValues = [];
                    products.forEach(p => {
                        const featVal = getFeatureValue(p, fid);
                        if (featVal) {
                            const num = parseNumber(featVal);
                            if (num >= state.currentMin && num <= state.currentMax) {
                                if (!matchedValues.includes(featVal)) {
                                    matchedValues.push(featVal);
                                }
                            }
                        }
                    });

                    if (matchedValues.length > 0) {
                        const valuesJoined = matchedValues.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                        queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                    }
                }
            } else if (state.type === 'size_split') {
                const hasW = state.selectedW !== null && state.selectedW > 0;
                const hasH = state.selectedH !== null && state.selectedH > 0;

                if (hasW || hasH) {
                    const matchedValues = [];
                    products.forEach(p => {
                        const featVals = getFeatureValues(p, fid);
                        featVals.forEach(featVal => {
                            if (featVal) {
                                const size = parseSizeSplit(featVal);

                                let matchW = true;
                                if (hasW) {
                                    const diffW = Math.abs(size.w - state.selectedW);
                                    const toleranceW = state.selectedW * 0.15;
                                    matchW = diffW <= toleranceW;
                                }

                                let matchH = true;
                                if (state.shape === 'circle') {
                                    const diffH = Math.abs(size.h - size.w);
                                    matchH = diffH <= (size.w * 0.2);
                                } else {
                                    if (hasH) {
                                        const diffH = Math.abs(size.h - state.selectedH);
                                        const toleranceH = state.selectedH * 0.15;
                                        matchH = diffH <= toleranceH;
                                    }
                                }

                                if (matchW && matchH) {
                                    if (!matchedValues.includes(featVal)) {
                                        matchedValues.push(featVal);
                                    }
                                }
                            }
                        });
                    });

                    if (matchedValues.length > 0) {
                        const valuesJoined = matchedValues.map(val => val.replace(/[\s\t]+/g, '+')).join('-');
                        queryParts.push(`${filterLabel.replace(/[\s\t]+/g, '+')}-${valuesJoined}`);
                    }
                }
            } else if (fid === 'price') {
                // Check if price range has been changed from initial limits
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    // PrestaShop handles price with: "Cena-PLN-10-50"
                    queryParts.push(`Cena-${state.currentMin.toFixed(2)}-${state.currentMax.toFixed(2)}`);
                }
            }
        }

        const newUrl = new URL(window.location.href);
        if (queryParts.length > 0) {
            // Native format: ?q=FeatureName-Value1-Value2/AnotherFeature-Value3
            const qValue = queryParts.join('/');
            newUrl.searchParams.set('q', qValue);
        } else {
            newUrl.searchParams.delete('q');
        }

        console.log("LabelConfigurator Redirecting to URL:", newUrl.toString());
        window.location.href = newUrl.toString();
    }

    // Dynamic Server-Side AJAX Filtering
    function applyFilters() {
        // Since we are forcing applyFiltersByRedirect, let's keep applyFilters as a fallback local w/o redirect for counting
        applyFiltersLocally();
    }

    function applyFiltersLocally() {
        const filtered = products.filter(p => {
            for (const [fid, state] of Object.entries(filterStates)) {
                if (fid === 'price') {
                    if (p.price < state.currentMin || p.price > state.currentMax) {
                        return false;
                    }
                } else if (state.type === 'slider') {
                    const featVals = getFeatureValues(p, fid);
                    if (featVals.length === 0) return false;
                    const hasMatch = featVals.some(v => {
                        const num = parseNumber(v);
                        return num >= state.currentMin && num <= state.currentMax;
                    });
                    if (!hasMatch) return false;
                } else if (state.type === 'size_split') {
                    const featVals = getFeatureValues(p, fid);
                    if (featVals.length === 0) return false;
                    const hasMatch = featVals.some(v => {
                        const size = parseSizeSplit(v);

                        let matchW = true;
                        if (state.selectedW !== null && state.selectedW > 0) {
                            const diffW = Math.abs(size.w - state.selectedW);
                            const toleranceW = state.selectedW * 0.15;
                            matchW = diffW <= toleranceW;
                        }

                        let matchH = true;
                        if (state.shape === 'circle') {
                            const diffH = Math.abs(size.h - size.w);
                            matchH = diffH <= (size.w * 0.2);
                        } else {
                            if (state.selectedH !== null && state.selectedH > 0) {
                                const diffH = Math.abs(size.h - state.selectedH);
                                const toleranceH = state.selectedH * 0.15;
                                matchH = diffH <= toleranceH;
                            }
                        }

                        return matchW && matchH;
                    });
                    if (!hasMatch) return false;
                } else if (state.type === 'checkboxes') {
                    if (state.selected.length > 0) {
                        const featVals = getFeatureValues(p, fid);
                        const hasMatch = featVals.some(v => state.selected.includes(v));
                        if (!hasMatch) {
                            return false;
                        }
                    }
                }
            }
            return true;
        });

        updateUIWithFilteredProducts(filtered);
    }

    function updateUIWithFilteredProducts(filtered) {
        console.log("LabelConfigurator: Updating UI with filtered products count:", filtered.length);

        const urlParams = new URLSearchParams(window.location.search);
        const hasQ = urlParams.has('q');

        const cardSelectors = [
            '.product-miniature',
            '.js-product-miniature',
            '.product-miniature-wrapper',
            '.product-preview',
            'article.product-miniature',
            '.products .product',
            '.products article'
        ];

        let foundCards = [];
        for (const selector of cardSelectors) {
            const els = document.querySelectorAll(selector);
            if (els && els.length > 0) {
                foundCards = Array.from(els);
                break;
            }
        }

        if (foundCards.length > 0) {
            let visibleCount = 0;
            foundCards.forEach(cardEl => {
                let productId = getProductIdFromCard(cardEl);
                let matchedProduct = null;

                if (productId) {
                    matchedProduct = products.find(p => p.id_product == productId);
                }
                if (!matchedProduct) {
                    const anchors = cardEl.querySelectorAll('a[href]');
                    const hrefs = Array.from(anchors).map(a => getUrlPathname(a.getAttribute('href'))).filter(Boolean);
                    matchedProduct = products.find(p => {
                        const pPath = getUrlPathname(p.url);
                        return hrefs.some(href => href === pPath || href.endsWith(pPath) || pPath.endsWith(href));
                    });
                }

                // If matchedProduct is found, check if it's in the filtered list.
                // If it is NOT matched, and filters are active (hasQ), hide it because it doesn't belong to the category's filtered set.
                let isMatched = !hasQ;
                if (hasQ && matchedProduct) {
                    isMatched = filtered.some(fp => fp.id_product == matchedProduct.id_product);
                }

                // Find the grid column wrapper element (bootstrap col-)
                let displayElement = cardEl;
                let parent = cardEl.parentElement;
                if (parent) {
                    const classes = Array.from(parent.classList);
                    const isCol = classes.some(c => c.startsWith('col-') || c === 'product-miniature-wrapper' || c.includes('product-miniature-wrapper'));
                    if (isCol) {
                        displayElement = parent;
                    } else {
                        let grandParent = parent.parentElement;
                        if (grandParent) {
                            const gpClasses = Array.from(grandParent.classList);
                            if (gpClasses.some(c => c.startsWith('col-'))) {
                                displayElement = grandParent;
                            }
                        }
                    }
                }

                if (isMatched) {
                    displayElement.style.setProperty('display', '', 'important');
                    if (matchedProduct) {
                        visibleCount++;
                    }
                } else {
                    displayElement.style.setProperty('display', 'none', 'important');
                }
            });

            // Update all badge counts (both sidebar and main toolbar)
            document.querySelectorAll('.badge-count').forEach(el => {
                el.textContent = hasQ ? visibleCount : products.length;
            });

            // Update real pagination visible page items
            if (hasQ) {
                updatePaginationUI(visibleCount);
            }
        }
    }

    function updatePaginationUI(visibleCount) {
        const paginationContainer = document.querySelector('.pagination') || document.querySelector('.pagination-wrapper') || document.querySelector('.page-list');
        if (!paginationContainer) return;

        const totalPages = Math.ceil(visibleCount / initialCardsCount) || 1;

        const pageItems = paginationContainer.querySelectorAll('li');
        if (pageItems && pageItems.length > 0) {
            pageItems.forEach(li => {
                const link = li.querySelector('a');
                if (!link) return;

                const text = link.textContent.trim();
                const pageNum = parseInt(text);

                if (!isNaN(pageNum)) {
                    if (pageNum > totalPages) {
                        li.style.display = 'none';
                    } else {
                        li.style.display = '';
                    }
                } else {
                    // Next/Prev arrows
                    if (text.includes('Następny') || text.includes('Next') || link.getAttribute('rel') === 'next') {
                        if (totalPages <= 1) {
                            li.style.display = 'none';
                        } else {
                            li.style.display = '';
                        }
                    }
                    if (text.includes('Poprzedni') || text.includes('Prev') || link.getAttribute('rel') === 'prev') {
                        li.style.display = '';
                    }
                }
            });
        }

        // If only 1 page remains, we hide the whole pagination container for elegance
        if (totalPages <= 1) {
            paginationContainer.style.setProperty('display', 'none', 'important');
        } else {
            paginationContainer.style.setProperty('display', '', 'important');
        }
    }

    function setupPillsEvents(parentEl, id, state, searchInputId, containerId, trigger) {
        const searchInput = parentEl.querySelector(`#${searchInputId}`);
        const container = parentEl.querySelector(`#${containerId}`);

        if (!searchInput || !container) return;

        state.searchTerm = '';

        searchInput.addEventListener('input', () => {
            state.searchTerm = searchInput.value.toLowerCase().trim();
            updatePillsRender(id, state, container, trigger);
        });

        updatePillsRender(id, state, container, trigger);
    }

    function updatePillsRender(id, state, container, trigger) {
        if (!container) return;
        container.innerHTML = '';

        const visibleOptions = state.allOptions.filter(opt => {
            return opt.toLowerCase().includes(state.searchTerm);
        });

        if (visibleOptions.length === 0) {
            container.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:10px 0;">Brak pasujących opcji</div>';
            return;
        }

        visibleOptions.forEach(opt => {
            const pill = document.createElement('div');
            pill.className = 'lc-pill-item';
            if (state.selected.includes(opt)) {
                pill.classList.add('active');
            }

            const count = countProductsForOption(id, opt);

            // Check if this filter is for Shape (Kształt) to show svg pictogram
            const label = filtersConfig.find(f => f.id == id || f.id === id)?.label || '';
            const isShape = /kształt|ksztalt|shape/i.test(label);
            const shapeIcon = isShape ? getShapePictogram(opt) : '';

            pill.innerHTML = `${shapeIcon}${opt} <span style="font-weight:400;margin-left:4px;opacity:0.75;">(${count})</span>`;

            pill.addEventListener('click', () => {
                pill.classList.toggle('active');
                if (pill.classList.contains('active')) {
                    if (!state.selected.includes(opt)) {
                        state.selected.push(opt);
                    }
                } else {
                    const idx = state.selected.indexOf(opt);
                    if (idx > -1) state.selected.splice(idx, 1);
                }

                // Keep selected list unique
                state.selected = [...new Set(state.selected)];

                // Update Trigger Text dynamically
                if (trigger) {
                    const triggerText = trigger.querySelector('.lc-trigger-text');
                    if (triggerText) {
                        if (state.selected.length === 0) {
                            triggerText.textContent = 'Wybierz opcje...';
                        } else {
                            triggerText.textContent = state.selected.join(', ');
                        }
                    }
                }

                onFilterInput();
            });

            container.appendChild(pill);
        });
    }

    function updateAllCheckboxesPills() {
        for (const [fid, state] of Object.entries(filterStates)) {
            if (state.type === 'checkboxes') {
                const label = filtersConfig.find(f => f.id == fid || f.id === fid)?.label || '';
                const isColor = /kolor|color|barwa/i.test(label);
                if (!isColor) {
                    const container = dynamicFiltersContainer.querySelector(`#list-${fid}`);
                    const trigger = dynamicFiltersContainer.querySelector(`#trigger-${fid}`);
                    if (container) {
                        updatePillsRender(fid, state, container, trigger);
                    }
                }
            }
        }
    }

    btnResetAll.addEventListener('click', () => {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('q');
        window.location.href = newUrl.toString();
    });

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

    // Close open custom dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.lc-dropdown-menu').forEach(m => {
            m.style.display = 'none';
        });
        document.querySelectorAll('.lc-dropdown-trigger').forEach(t => {
            t.classList.remove('open');
        });
    });

    // Try to detect theme products on the category page first
    detectThemeProducts();

    // Initial builder execution
    buildDynamicFilters();
    applyFilters();

    // Hide entire configurator sidebar if there are no filters rendered (e.g. no products have active config features in this category)
    function hideConfiguratorIfEmpty() {
        const filters = dynamicFiltersContainer.querySelectorAll('.filter-group');
        if (!filters || filters.length === 0) {
            console.log("LabelConfigurator: No active filters rendered, hiding sidebar entirely.");
            const sidebarEl = document.getElementById('sidebar') || appEl.querySelector('#sidebar');
            if (sidebarEl) {
                sidebarEl.style.setProperty('display', 'none', 'important');
            }
            if (appEl) {
                appEl.style.setProperty('display', 'none', 'important');
            }
        }
    }

    hideConfiguratorIfEmpty();

    // Dynamic Active Tags builder
    function renderActiveFiltersTags() {
        const tagsContainer = document.getElementById('active-filters-tags');
        if (!tagsContainer) return;
        tagsContainer.innerHTML = '';

        let hasActiveTags = false;

        for (const [fid, state] of Object.entries(filterStates)) {
            const config = filtersConfig.find(f => f.id == fid || f.id === fid);
            if (!config) continue;

            const filterLabel = config.label;

            if (state.type === 'checkboxes') {
                state.selected.forEach(val => {
                    hasActiveTags = true;
                    const tag = document.createElement('div');
                    tag.className = 'lc-active-tag';
                    tag.title = `Usuń filtr: ${val}`;
                    tag.innerHTML = `${filterLabel}: ${val} <span class="lc-tag-close">&times;</span>`;

                    tag.addEventListener('click', () => {
                        const idx = state.selected.indexOf(val);
                        if (idx > -1) state.selected.splice(idx, 1);
                        applyFiltersByRedirect();
                    });

                    tagsContainer.appendChild(tag);
                });
            } else if (state.type === 'slider' && fid !== 'price') {
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    hasActiveTags = true;
                    const tag = document.createElement('div');
                    tag.className = 'lc-active-tag';
                    tag.title = 'Zresetuj suwak';
                    tag.innerHTML = `${filterLabel}: ${state.currentMin} - ${state.currentMax} <span class="lc-tag-close">&times;</span>`;

                    tag.addEventListener('click', () => {
                        state.currentMin = state.min;
                        state.currentMax = state.max;
                        applyFiltersByRedirect();
                    });

                    tagsContainer.appendChild(tag);
                }
            } else if (state.type === 'size_split') {
                if (state.selectedW !== null || state.selectedH !== null) {
                    hasActiveTags = true;
                    const tag = document.createElement('div');
                    tag.className = 'lc-active-tag';
                    tag.title = 'Zresetuj wymiary';

                    let text = '';
                    if (state.shape === 'circle') {
                        text = `Ø ${state.selectedW || '?'} mm`;
                    } else {
                        text = `${state.selectedW || '?'} x ${state.selectedH || '?'} mm`;
                    }

                    tag.innerHTML = `${filterLabel}: ${text} <span class="lc-tag-close">&times;</span>`;

                    tag.addEventListener('click', () => {
                        state.selectedW = null;
                        state.selectedH = null;
                        applyFiltersByRedirect();
                    });

                    tagsContainer.appendChild(tag);
                }
            } else if (fid === 'price') {
                if (state.currentMin > state.min || state.currentMax < state.max) {
                    hasActiveTags = true;
                    const tag = document.createElement('div');
                    tag.className = 'lc-active-tag';
                    tag.title = 'Zresetuj cenę';
                    tag.innerHTML = `${filterLabel}: ${state.currentMin.toFixed(2)} - ${state.currentMax.toFixed(2)} <span class="lc-tag-close">&times;</span>`;

                    tag.addEventListener('click', () => {
                        state.currentMin = state.min;
                        state.currentMax = state.max;
                        applyFiltersByRedirect();
                    });

                    tagsContainer.appendChild(tag);
                }
            }
        }

        if (!hasActiveTags) {
            tagsContainer.style.display = 'none';
        } else {
            tagsContainer.style.display = 'flex';
        }
    }

    // Parse current URL 'q' parameter to populate selected filters on load
    function parseActiveFiltersFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const qVal = urlParams.get('q');
        if (!qVal) return;

        const parts = qVal.split('/');
        parts.forEach(part => {
            const separatorIndex = part.indexOf('-');
            if (separatorIndex === -1) return;

            const paramName = part.substring(0, separatorIndex).replace(/\+/g, ' ').trim();
            const paramValuesJoined = part.substring(separatorIndex + 1).replace(/\+/g, ' ');

            // Find matching filter config by label or original_name (case-insensitive)
            const config = filtersConfig.find(f =>
                (f.original_name && f.original_name.toLowerCase().trim() === paramName.toLowerCase().trim()) ||
                (f.label && f.label.toLowerCase().trim() === paramName.toLowerCase().trim())
            );
            if (!config) return;

            const fid = config.id;
            const state = filterStates[fid];
            if (!state) return;

            if (state.type === 'checkboxes') {
                const values = paramValuesJoined.split('-');
                // Map each lowercase value from URL back to its exact case-sensitive value in state.allOptions
                const mappedValues = values.map(val => {
                    const matched = state.allOptions.find(opt => opt.toLowerCase().trim() === val.toLowerCase().trim());
                    return matched || val;
                });
                state.selected = [...new Set(mappedValues)];

                // Update Trigger Text dynamically
                const trigger = dynamicFiltersContainer.querySelector(`#trigger-${fid}`);
                if (trigger) {
                    const triggerText = trigger.querySelector('.lc-trigger-text');
                    if (triggerText) {
                        triggerText.textContent = state.selected.join(', ');
                    }
                }

                // Synchronize and activate rendered color swatches if applicable
                const swatchGrid = dynamicFiltersContainer.querySelector(`#grid-${fid}`);
                if (swatchGrid) {
                    swatchGrid.querySelectorAll('.swatch-item').forEach(item => {
                        const val = item.getAttribute('data-val');
                        if (state.selected.includes(val)) {
                            item.classList.add('active');
                        } else {
                            item.classList.remove('active');
                        }
                    });
                }
            } else if (state.type === 'slider' && fid !== 'price') {
                // Handle slider range min/max estimation based on matched values if any
                const values = paramValuesJoined.split('-');
                if (values.length > 0) {
                    const parsedNums = values.map(v => parseNumber(v));
                    state.currentMin = Math.min(...parsedNums);
                    state.currentMax = Math.max(...parsedNums);

                    const minRange = dynamicFiltersContainer.querySelector(`#min-${fid}`);
                    const maxRange = dynamicFiltersContainer.querySelector(`#max-${fid}`);
                    const minValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-min`);
                    const maxValInput = dynamicFiltersContainer.querySelector(`#val-${fid}-max`);

                    if (minRange) minRange.value = state.currentMin;
                    if (maxRange) maxRange.value = state.currentMax;
                    if (minValInput) minValInput.value = state.currentMin;
                    if (maxValInput) maxValInput.value = state.currentMax;
                }
            } else if (state.type === 'size_split') {
                const values = paramValuesJoined.split('-');
                if (values.length > 0) {
                    const parsedSizes = values.map(v => parseSizeSplit(v));
                    const widths = parsedSizes.map(s => s.w).filter(w => w > 0);
                    const heights = parsedSizes.map(s => s.h).filter(h => h > 0);

                    if (widths.length > 0) {
                        state.selectedW = widths[0];
                        const comboWInput = dynamicFiltersContainer.querySelector(`#combo-w-input-${fid}`);
                        if (comboWInput) {
                            comboWInput.value = state.selectedW;
                            comboWInput.dispatchEvent(new Event('change'));
                        }
                    }
                    if (heights.length > 0) {
                        state.selectedH = heights[0];
                        const comboHInput = dynamicFiltersContainer.querySelector(`#combo-h-input-${fid}`);
                        if (comboHInput) {
                            comboHInput.value = state.selectedH;
                            comboHInput.dispatchEvent(new Event('change'));
                        }
                    }

                    const isCircle = values.some(valStr => {
                        const raw = String(valStr).toLowerCase();
                        return raw.includes('fi') || raw.includes('ø') || raw.includes('okrąg');
                    });

                    const btnCircle = dynamicFiltersContainer.querySelector(`#btn-shape-circle-${fid}`);
                    const btnRect = dynamicFiltersContainer.querySelector(`#btn-shape-rect-${fid}`);

                    if (isCircle) {
                        state.shape = 'circle';
                        if (btnCircle) {
                            btnCircle.classList.add('active');
                            if (btnRect) btnRect.classList.remove('active');
                            btnCircle.click();
                        }
                    } else {
                        state.shape = 'rectangle';
                        if (btnRect) {
                            btnRect.classList.add('active');
                            if (btnCircle) btnCircle.classList.remove('active');
                            btnRect.click();
                        }
                    }
                }
            } else if (fid === 'price') {
                // PrestaShop format: Cena-PLN-10.00-50.00 or similar
                const values = paramValuesJoined.split('-');
                if (values.length >= 2) {
                    state.currentMin = parseFloat(values[0]) || state.min;
                    state.currentMax = parseFloat(values[1]) || state.max;

                    const minRange = dynamicFiltersContainer.querySelector(`#min-price`);
                    const maxRange = dynamicFiltersContainer.querySelector(`#max-price`);
                    const minValInput = dynamicFiltersContainer.querySelector(`#val-price-min`);
                    const maxValInput = dynamicFiltersContainer.querySelector(`#val-price-max`);

                    if (minRange) minRange.value = state.currentMin;
                    if (maxRange) maxRange.value = state.currentMax;
                    if (minValInput) minValInput.value = state.currentMin.toFixed(2);
                    if (maxValInput) maxValInput.value = state.currentMax.toFixed(2);
                }
            }
        });
    }

    parseActiveFiltersFromUrl();
    updateAllCheckboxesPills();
    renderActiveFiltersTags();

    // Preserve 'q' parameter when clicking on pagination links or sort order links
    function preserveQueryParamOnNavigation() {
        document.addEventListener('click', (e) => {
            const anchor = e.target.closest('a[href]');
            if (!anchor) return;

            const href = anchor.getAttribute('href');
            if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

            const urlParams = new URLSearchParams(window.location.search);
            const qVal = urlParams.get('q');
            if (!qVal) return;

            try {
                // If it looks like a pagination link (has page=, class pagination or page-link) or sort link
                const isPagination = href.includes('page=') || anchor.classList.contains('page-link') || anchor.closest('.pagination') || anchor.closest('.js-search-link');
                const isSort = href.includes('order=') || anchor.classList.contains('select-list') || anchor.closest('.products-sort-order');

                if (isPagination || isSort) {
                    e.preventDefault();

                    let targetUrl;
                    if (href.startsWith('/') || !href.includes('://')) {
                        targetUrl = new URL(href, window.location.origin);
                    } else {
                        targetUrl = new URL(href);
                    }

                    targetUrl.searchParams.set('q', qVal);
                    console.log("LabelConfigurator: Preserving 'q' on navigation to:", targetUrl.toString());
                    window.location.href = targetUrl.toString();
                }
            } catch (err) {
                console.error("LabelConfigurator: Failed to append q param to link:", err);
            }
        });
    }

    preserveQueryParamOnNavigation();

    // Since products might be loaded asynchronously or theme cards rendered via other scripts, execute map retry after a short delay
    setTimeout(() => {
        console.log("LabelConfigurator: Retrying theme products detection...");
        detectThemeProducts();
        applyFiltersLocally(); // Local apply only for count badge update on page load
    }, 1500);
});