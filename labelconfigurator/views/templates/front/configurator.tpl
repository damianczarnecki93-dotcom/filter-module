<div id="configurator-app" data-instant="{$filters_instant|intval}" data-ajax-url="{$ajax_url|escape:'html':'UTF-8'}" data-id-category="{$id_category|intval}">
    <!-- Preloaded Data for Client-Side Engine encoded as Base64 to prevent HTML corruption -->
    <div id="json-data" style="display:none;">{$products_base64}</div>
    <div id="config-data" style="display:none;">{$config_base64}</div>

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
</div>

<!-- Load Google Material Icons -->
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">

<!-- Inject Configurator Javascript with Timestamp Parameter to Force Cache Busting -->
<script src="/modules/labelconfigurator/views/js/configurator.js?v={$smarty.now}" defer></script>

<style>
    #configurator-app { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; width: 100%; box-sizing: border-box; }

    /* Left Sidebar */
    .config-sidebar { width: 100%; background: #ffffff; padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); box-sizing: border-box; }
    .sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 0 5px; }
    .sidebar-header h3 { margin: 0; font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; }
    .close-sidebar-btn { display: none; background: none; border: none; font-size: 28px; color: #64748b; cursor: pointer; }

    /* Accordion / Collapsible Filter Group */
    .filter-group { border-bottom: 1px solid #f1f5f9; padding: 15px 5px; }
    .filter-group:last-of-type { border-bottom: none; }

    .filter-header { display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none; }
    .filter-header label { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0; cursor: pointer; pointer-events: none; }
    .filter-header .chevron { color: #64748b; font-size: 22px; transition: transform 0.2s ease; transform: rotate(0deg); }
    .filter-header.collapsed .chevron { transform: rotate(180deg); }

    .filter-body { margin-top: 15px; transition: opacity 0.2s ease-out; }
    .filter-header.collapsed + .filter-body { display: none; }

    /* Custom Dropdown select-with-search styling (prefixed with lc- to prevent leaks) */
    .lc-custom-dropdown { position: relative; width: 100%; box-sizing: border-box; }

    .lc-dropdown-trigger {
        display: flex; justify-content: space-between; align-items: center;
        padding: 10px 14px; background: #ffffff; border: 1px solid #cbd5e1;
        border-radius: 6px; cursor: pointer; transition: border-color 0.2s, box-shadow 0.2s;
        font-size: 13px; font-weight: 600; color: #334155; user-select: none;
    }
    .lc-dropdown-trigger:hover { border-color: #2c7da0; }
    .lc-dropdown-trigger.open { border-color: #2c7da0; box-shadow: 0 0 0 3px rgba(44, 125, 160, 0.15); }
    .lc-dropdown-trigger .chevron { font-size: 18px; color: #64748b; transition: transform 0.2s; }
    .lc-dropdown-trigger.open .chevron { transform: rotate(180deg); }
    .lc-dropdown-trigger .lc-trigger-text { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90%; }

    .lc-dropdown-menu {
        position: absolute; top: 100%; left: 0; right: 0; z-index: 1000;
        margin-top: 4px; background: #ffffff; border: 1px solid #cbd5e1;
        border-radius: 6px; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        padding: 10px; display: flex; flex-direction: column; gap: 8px; max-height: 250px;
    }

    .lc-select-options { max-height: 150px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
    .lc-select-options::-webkit-scrollbar { width: 5px; }
    .lc-select-options::-webkit-scrollbar-track { background: #f1f5f9; }
    .lc-select-options::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }

    /* Custom options inside dropdown */
    .lc-select-options .lc-pill-item {
        padding: 8px 12px; border: 1px solid transparent; border-radius: 4px;
        text-align: left; justify-content: flex-start; background: #f8fafc; font-weight: 500;
        cursor: pointer; box-sizing: border-box; width: 100%; display: flex; align-items: center;
    }
    .lc-select-options .lc-pill-item:hover { background: #f1f5f9; border-color: #cbd5e1; }
    .lc-select-options .lc-pill-item.active { background: #2c7da0; color: #ffffff; }

    /* In-Category Search Box inside filter lists */
    .in-category-search { position: relative; width: 100%; box-sizing: border-box; }
    .in-category-search input { width: 100%; padding: 8px 12px 8px 32px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; color: #334155; box-sizing: border-box; background: #f8fafc; }
    .in-category-search input:focus { outline: none; border-color: #2c7da0; background: #fff; }
    .in-category-search i { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); font-size: 16px; color: #94a3b8; }

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
    .dual-slider input[type="range"] { position: absolute; width: 100%; top: -4px; left: 0; -webkit-appearance: none; appearance: none; background: transparent; pointer-events: auto; margin: 0; }
    .dual-slider::before { content: ''; position: absolute; top: 4px; left: 0; right: 0; height: 6px; background: #e2e8f0; border-radius: 3px; z-index: 1; }
    .dual-slider input[type="range"]::-webkit-slider-thumb { pointer-events: auto; -webkit-appearance: none; width: 18px; height: 18px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; margin-top: -6px; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-webkit-slider-thumb:hover { background: #1f5d78; }
    .dual-slider input[type="range"]::-moz-range-thumb { pointer-events: auto; width: 14px; height: 14px; background: #2c7da0; border-radius: 50%; cursor: pointer; position: relative; z-index: 2; box-shadow: 0 2px 4px rgba(0,0,0,0.15); border: 2px solid #fff; transition: background 0.15s; }
    .dual-slider input[type="range"]::-moz-range-thumb:hover { background: #1f5d78; }

    /* Action Buttons Area */
    .sidebar-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; border-top: 1px solid #f1f5f9; padding-top: 20px; }

    /* Reset Button */
    .btn-reset { width: 100%; padding: 12px; background: #f1f5f9; border: none; border-radius: 6px; color: #475569; font-weight: 700; cursor: pointer; transition: background 0.2s, color 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-reset:hover { background: #e2e8f0; color: #0f172a; }

    /* Apply Button */
    .btn-apply { width: 100%; padding: 12px; background: #2c7da0; border: none; border-radius: 6px; color: #ffffff; font-weight: 700; cursor: pointer; transition: background 0.2s; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; box-sizing: border-box; text-align: center; }
    .btn-apply:hover { background: #1f5d78; }

    .badge-count { background: #2c7da0; color: white; padding: 4px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; }
    .header-badge { font-size: 12px; padding: 2px 8px; }

    /* Media queries for Responsiveness */
    @media (max-width: 991px) {
        .config-sidebar {
            position: fixed; top: 0; left: -350px; width: 310px; height: 100%;
            z-index: 9999; overflow-y: auto; transition: left 0.3s ease; box-shadow: 4px 0 15px rgba(0,0,0,0.1);
        }
        .config-sidebar.open { left: 0; }
        .close-sidebar-btn { display: block; }
    }
</style>