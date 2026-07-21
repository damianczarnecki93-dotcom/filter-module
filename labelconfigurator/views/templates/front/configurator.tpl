<div id="configurator-app" data-instant="{$filters_instant|intval}" data-ajax-url="{$ajax_url|escape:'html':'UTF-8'}" data-id-category="{$id_category|intval}">
    <!-- Preloaded Data for Client-Side Engine -->
    <div id="json-data" style="display:none;">{$products_json|escape:'html':'UTF-8'}</div>
    <div id="config-data" style="display:none;">{$filters_config_json|escape:'html':'UTF-8'}</div>

    <!-- Main Configurator Layout -->
    <div class="config-layout">

        <!-- Left Sidebar: Dynamic Filters Panel -->
        <div class="config-sidebar" id="sidebar">
            <div class="sidebar-header">
                <h3>FILTRY <span class="badge-count header-badge">0</span></h3>
                <button class="close-sidebar-btn" id="close-sidebar">&times;</button>
            </div>

            <!-- Dynamic Filters Placeholder -->
            <div id="dynamic-filters-container">
                <!-- Built dynamically via Javascript -->
            </div>

            <!-- Action Buttons (Apply / Reset) -->
            <div class="sidebar-actions">
                <button class="btn-apply" id="btn-apply-filters" style="display: none;">Zastosuj filtry</button>
                <button class="btn-reset" id="btn-reset-all">Wyczyść filtry</button>
            </div>
        </div>

        <!-- Main Content Area: Products List (Only visible when standalone, hidden if live-filtering theme cards) -->
        <div class="config-main">
            <div class="results-toolbar">
                <button class="toggle-sidebar-btn" id="toggle-sidebar">
                    <i class="material-icons">filter_list</i> Filtry
                </button>
                <h3 class="results-header">
                    Znalezione etykiety: <span class="badge-count main-badge">0</span>
                </h3>
            </div>

            <div id="product-list" class="product-grid">
                <!-- Loaded dynamically via JS -->
            </div>

            <div id="no-results" class="no-results-msg" style="display: none;">
                <i class="material-icons">info_outline</i>
                <p>Brak produktów spełniających wybrane kryteria.</p>
            </div>
        </div>

    </div>
</div>

<!-- Load Google Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

<style>
    #configurator-app { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; max-width: 1200px; margin: 20px auto; padding: 0 15px; color: #1e293b; box-sizing: border-box; }

    .config-layout { display: flex; gap: 30px; align-items: flex-start; position: relative; }

    /* Left Sidebar */
    .config-sidebar { flex: 0 0 310px; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); box-sizing: border-box; }
    .sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px; }
    .sidebar-header h3 { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
    .close-sidebar-btn { display: none; background: none; border: none; font-size: 28px; color: #64748b; cursor: pointer; }

    /* Accordion / Collapsible Filter Group */
    .filter-group { border-bottom: 1px solid #f1f5f9; padding: 15px 5px; }
    .filter-group:last-of-type { border-bottom: none; }

    .filter-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .filter-header label { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; cursor: pointer; pointer-events: none; }
    .filter-header .chevron { color: #64748b; font-size: 22px; transition: transform 0.2s ease; transform: rotate(0deg); }
    .filter-header.collapsed .chevron { transform: rotate(180deg); }

    .filter-body { margin-top: 15px; transition: max-height 0.2s ease-out, opacity 0.2s ease-out; overflow: hidden; }
    .filter-header.collapsed + .filter-body { display: none; }

    /* In-Category Search Box inside filter lists */
    .in-category-search { position: relative; margin-bottom: 12px; }
    .in-category-search input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; box-sizing: border-box; background: #f8fafc; }
    .in-category-search input:focus { outline: none; border-color: #2c7da0; background: #fff; }
    .in-category-search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #94a3b8; }

    /* Modern Pill / Option buttons with Dynamic Parentheses counts */
    .pill-filter-list { display: flex; flex-direction: column; gap: 8px; }
    .pill-item {
        display: flex; align-items: center; justify-content: center; width: 100%; padding: 10px 14px;
        background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px;
        font-size: 13px; font-weight: 600; color: #334155; cursor: pointer; transition: all 0.2s ease;
        box-sizing: border-box; text-align: center;
    }
    .pill-item:hover { border-color: #2c7da0; background: #f0f7f9; }
    .pill-item.active { border-color: #2c7da0; background: #2c7da0; color: #ffffff; box-shadow: 0 4px 6px -1px rgba(44, 125, 160, 0.2); }

    /* Grid-based Color Swatch filter option styling */
    .swatch-grid { display: flex; flex-wrap: wrap; gap: 10px; padding: 5px 0; }
    .swatch-item {
        position: relative; width: 26px; height: 26px; border-radius: 4px;
        border: 1px solid #cbd5e1; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .swatch-item:hover { transform: scale(1.15); z-index: 10; }
    .swatch-item.active { border-color: #0f172a; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.4); transform: scale(1.1); }

    /* Range Slider Styling */
    .input-range-wrapper { display: flex; align-items: center; gap: 10px; margin-bottom: 15px; }
    .manual-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; text-align: center; font-size: 13px; font-weight: bold; color: #1e293b; box-sizing: border-box; }
    .manual-input:focus { outline: none; border-color: #2c7da0; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.15); }
    .manual-input::-webkit-outer-spin-button, .manual-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .manual-input[type=number] { -moz-appearance: textfield; }

    .dual-slider { position: relative; height: 16px; margin: 10px 0 15px; }
    .dual-slider input[type="range"] { position: absolute; width: 100%; top: -4px; left: 0; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: none; margin: 0; }
    .dual-slider::before { content: ''; position: absolute; top: 4px; left: 0; right: 0; height: 6px; background: #e2e8f0; border-radius: 3px; z-index: 1; }
    .dual-slider input[type="range"]::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 18px; height: 18px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; margin-top: -6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-webkit-slider-thumb:hover { background: #1f5d78; }
    .dual-slider input[type="range"]::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-moz-range-thumb:hover { background: #1f5d78; }

    /* Scrollable checkbox option style */
    .checkbox-filter-list { max-height: 180px; overflow-y: auto; padding-right: 5px; display: flex; flex-direction: column; gap: 6px; }
    .checkbox-filter-list::-webkit-scrollbar { width: 5px; }
    .checkbox-filter-list::-webkit-scrollbar-track { background: #f1f5f9; }
    .checkbox-filter-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    /* Action Buttons Area */
    .sidebar-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px; }

    /* Reset Button */
    .btn-reset { width: 100%; padding: 12px; background: #f1f5f9; border: none; border-radius: 6px; color: #475569; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-reset:hover { background: #e2e8f0; color: #0f172a; }

    /* Apply Button */
    .btn-apply { width: 100%; padding: 12px; background: #2c7da0; border: none; border-radius: 6px; color: #ffffff; font-weight: 700; cursor: pointer; transition: background 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-apply:hover { background: #1f5d78; }

    /* Main Product List Column */
    .config-main { flex: 1; }
    .results-toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .results-header { margin: 0; font-size: 20px; font-weight: 800; color: #0f172a; display: flex; align-items: center; gap: 10px; }
    .badge-count { background: #2c7da0; color: white; padding: 4px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; }
    .header-badge { font-size: 12px; padding: 2px 8px; }

    .toggle-sidebar-btn { display: none; background: #2c7da0; border: none; padding: 10px 16px; border-radius: 6px; color: #fff; font-weight: 600; font-size: 14px; cursor: pointer; display: none; align-items: center; gap: 6px; }
    .toggle-sidebar-btn:hover { background: #1f5d78; }

    /* Product Cards Grid */
    .product-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }

    /* Card Styling */
    .product-card {
        display: flex; flex-direction: column; justify-content: space-between;
        background: #fff; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 20px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02); transition: transform 0.2s, border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box; overflow: hidden;
    }
    .product-card:hover { border-color: #61b3d6; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.08); transform: translateY(-3px); }

    .card-img-wrapper { height: 180px; display: flex; align-items: center; justify-content: center; margin-bottom: 15px; border-radius: 8px; overflow: hidden; background: #f8fafc; }
    .card-img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 0.3s; }
    .product-card:hover .card-img { transform: scale(1.05); }

    .card-title { font-weight: 700; font-size: 14px; color: #1e293b; margin: 0 0 10px; line-height: 1.4; height: 40px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; text-align: left; }

    .card-price { font-size: 17px; font-weight: 800; color: #2c7da0; margin-bottom: 12px; text-align: left; }

    .card-details { margin-bottom: 18px; border-top: 1px solid #f1f5f9; padding-top: 12px; }
    .card-details p { margin: 6px 0; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
    .card-details p span { font-weight: 600; color: #334155; }

    /* CTA button */
    .card-btn {
        display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px;
        background: #2c7da0; color: #fff; text-decoration: none; border-radius: 6px;
        font-weight: 700; font-size: 13px; transition: background 0.2s; box-sizing: border-box; border: none; cursor: pointer;
    }
    .card-btn:hover { background: #1f5d78; color: #fff; text-decoration: none; }
    .card-btn i { font-size: 18px; }

    /* Empty state */
    .no-results-msg { padding: 40px 20px; text-align: center; color: #64748b; background: #f8fafc; border-radius: 12px; border: 1px dashed #cbd5e1; margin-top: 20px; }
    .no-results-msg i { font-size: 48px; color: #94a3b8; margin-bottom: 10px; }
    .no-results-msg p { font-size: 16px; font-weight: 500; margin: 0; }

    /* Media queries for Responsiveness */
    @media (max-width: 991px) {
        .toggle-sidebar-btn { display: flex; }
        .config-sidebar {
            position: fixed; top: 0; left: -350px; width: 310px; height: 100%;
            z-index: 9999; overflow-y: auto; transition: left 0.3s ease; box-shadow: 4px 0 15px rgba(0,0,0,0.1);
        }
        .config-sidebar.open { left: 0; }
        .close-sidebar-btn { display: block; }
    }
</style>