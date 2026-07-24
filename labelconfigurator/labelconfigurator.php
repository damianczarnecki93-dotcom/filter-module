<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

use PrestaShop\PrestaShop\Core\Module\WidgetInterface;

class LabelConfigurator extends Module implements WidgetInterface
{
    public function __construct()
    {
        $this->name = 'labelconfigurator';
        $this->tab = 'front_office_features';
        $this->version = '1.0.0';
        $this->author = 'Autor';
        $this->need_instance = 0;
        parent::__construct();
        $this->displayName = 'Konfigurator Etykiet';
        $this->description = 'Zaawansowany konfigurator etykiet z rozbudowanym panelem mapowania cech';
    }

    public function install()
    {
        $default_config = [
            [
                'id' => 'price',
                'active' => true,
                'label' => 'Cena (PLN)',
                'type' => 'slider'
            ],
            [
                'id' => 6,
                'active' => true,
                'label' => 'Rozmiar (Szer. x Wys.)',
                'type' => 'size_split'
            ],
            [
                'id' => 14,
                'active' => true,
                'label' => 'Średnica (mm)',
                'type' => 'slider'
            ],
            [
                'id' => 23,
                'active' => true,
                'label' => 'Materiał',
                'type' => 'checkboxes'
            ],
            [
                'id' => 27,
                'active' => true,
                'label' => 'Kształt',
                'type' => 'checkboxes'
            ],
            [
                'id' => 15,
                'active' => true,
                'label' => 'Etykiet na arkuszu',
                'type' => 'checkboxes'
            ]
        ];

        return parent::install()
            && $this->registerHook('displayLeftColumn')
            && $this->registerHook('actionFrontControllerSetMedia')
            && Configuration::updateValue('LC_FILTERS_CONFIG', json_encode($default_config))
            && Configuration::updateValue('LC_FILTERS_INSTANT', 1);
    }

    public function uninstall()
    {
        return parent::uninstall()
            && Configuration::deleteByName('LC_FILTERS_CONFIG')
            && Configuration::deleteByName('LC_FILTERS_INSTANT');
    }

    public function getContent()
    {
        $output = '';
        $context = Context::getContext();
        $id_lang = (int)$context->language->id;

        if (Tools::isSubmit('submitLabelConfigurator')) {
            $id_category_filter = (int)Tools::getValue('id_category_filter', 0);
            $features = Feature::getFeatures($id_lang);

            $config = [];

            // Special price config
            $config[] = [
                'id' => 'price',
                'active' => (bool)Tools::getValue('active_price'),
                'label' => Tools::getValue('label_price', 'Cena (PLN)'),
                'type' => 'slider'
            ];

            // Dynamic features config
            if ($features) {
                foreach ($features as $f) {
                    $fid = (int)$f['id_feature'];
                    $config[] = [
                        'id' => $fid,
                        'active' => (bool)Tools::getValue('active_' . $fid),
                        'label' => Tools::getValue('label_' . $fid, $f['name']),
                        'type' => Tools::getValue('type_' . $fid, 'checkboxes')
                    ];
                }
            }

            // Save configuration
            $config_key = $id_category_filter > 0 ? 'LC_FILTERS_CONFIG_' . $id_category_filter : 'LC_FILTERS_CONFIG';
            Configuration::updateValue($config_key, json_encode($config));

            // Save instant config
            $instant_key = $id_category_filter > 0 ? 'LC_FILTERS_INSTANT_' . $id_category_filter : 'LC_FILTERS_INSTANT';
            $instant_val = (int)Tools::getValue('lc_instant', 1);
            Configuration::updateValue($instant_key, $instant_val);

            $output .= $this->displayConfirmation($this->l('Ustawienia filtrów zostały zapisane pomyślnie.'));
        }

        return $output . $this->renderConfigForm();
    }

    protected function getCategoriesList($id_lang)
    {
        $categories = Db::getInstance()->executeS('
            SELECT c.id_category, c.id_parent, c.level_depth, cl.name
            FROM '._DB_PREFIX_.'category c
            LEFT JOIN '._DB_PREFIX_.'category_lang cl ON (c.id_category = cl.id_category AND cl.id_lang = '.(int)$id_lang.Shop::addSqlRestrictionOnLang('cl').')
            WHERE c.active = 1
            ORDER BY c.level_depth ASC, c.position ASC
        ');

        if (!$categories) {
            return [];
        }

        $tree = [];
        foreach ($categories as $cat) {
            $tree[$cat['id_parent']][] = $cat;
        }

        $list = [];
        $root_parent = isset($tree[0]) ? 0 : (isset($tree[1]) ? 1 : null);
        if ($root_parent !== null) {
            $this->buildCategoryTreeList($tree, $tree[$root_parent], 0, $list);
        } else {
            foreach ($categories as $cat) {
                $list[] = [
                    'id_category' => (int)$cat['id_category'],
                    'name' => $cat['name'],
                    'level_depth' => (int)$cat['level_depth']
                ];
            }
        }
        return $list;
    }

    protected function buildCategoryTreeList($tree, $current_level_cats, $depth, &$list)
    {
        foreach ($current_level_cats as $cat) {
            $indent = str_repeat('&nbsp;&nbsp;&nbsp;&nbsp;', $depth);
            $prefix = $depth > 0 ? '— ' : '';
            $list[] = [
                'id_category' => (int)$cat['id_category'],
                'name' => $indent . $prefix . $cat['name'],
                'level_depth' => (int)$cat['level_depth']
            ];
            if (isset($tree[$cat['id_category']])) {
                $this->buildCategoryTreeList($tree, $tree[$cat['id_category']], $depth + 1, $list);
            }
        }
    }

    protected function renderConfigForm()
    {
        $context = Context::getContext();
        $id_lang = (int)$context->language->id;
        $features = Feature::getFeatures($id_lang);

        // Get currently selected category filter
        $id_category_filter = (int)Tools::getValue('id_category_filter', 0);

        // Load correct config
        $config_key = $id_category_filter > 0 ? 'LC_FILTERS_CONFIG_' . $id_category_filter : 'LC_FILTERS_CONFIG';
        $current_config_raw = Configuration::get($config_key);
        if ($current_config_raw === '[]' || empty($current_config_raw)) {
            $current_config_raw = Configuration::get('LC_FILTERS_CONFIG');
        }
        $current_config = json_decode($current_config_raw, true);

        if (!is_array($current_config)) {
            $current_config = [];
        }

        // Index by ID for easier lookup
        $config_by_id = [];
        foreach ($current_config as $item) {
            $config_by_id[$item['id']] = $item;
        }

        // Load instant value
        $instant_key = $id_category_filter > 0 ? 'LC_FILTERS_INSTANT_' . $id_category_filter : 'LC_FILTERS_INSTANT';
        $instant_val = Configuration::get($instant_key);
        if ($instant_val === false && $id_category_filter > 0) {
            $instant_val = Configuration::get('LC_FILTERS_INSTANT');
        }
        if ($instant_val === false) {
            $instant_val = 1; // Default
        }
        $instant_val = (bool)$instant_val;

        $categories_list = $this->getCategoriesList($id_lang);

        // Start building custom HTML configuration panel
        $html = '<div class="panel">';
        $html .= '  <div class="panel-heading"><i class="icon-cogs"></i> ' . htmlspecialchars($this->l('Zaawansowana konfiguracja lewego paska filtrów'), ENT_QUOTES, 'UTF-8') . '</div>';

        // 1. Category Selector Form
        $html .= '  <form action="' . htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES, 'UTF-8') . '" method="get" class="form-horizontal" style="margin-bottom: 25px; background: #fdfdfd; padding: 15px; border: 1px solid #e2e8f0; border-radius: 6px;">';
        foreach ($_GET as $key => $val) {
            if ($key !== 'id_category_filter') {
                $html .= '    <input type="hidden" name="' . htmlspecialchars($key, ENT_QUOTES, 'UTF-8') . '" value="' . htmlspecialchars($val, ENT_QUOTES, 'UTF-8') . '" />';
            }
        }
        $html .= '    <div class="form-group" style="margin-bottom: 0;">';
        $html .= '      <label class="control-label col-lg-3" style="font-weight: bold; text-align: right; padding-top: 7px;">' . htmlspecialchars($this->l('Wybierz kategorię do konfiguracji'), ENT_QUOTES, 'UTF-8') . ':</label>';
        $html .= '      <div class="col-lg-6">';
        $html .= '        <select name="id_category_filter" class="form-control" onchange="this.form.submit()">';
        $html .= '          <option value="0" ' . ($id_category_filter === 0 ? 'selected="selected"' : '') . '>' . htmlspecialchars($this->l('Wszystkie podkategorie (Globalna domyślna)'), ENT_QUOTES, 'UTF-8') . '</option>';
        if ($categories_list) {
            foreach ($categories_list as $cat) {
                $html .= '          <option value="' . $cat['id_category'] . '" ' . ($id_category_filter === $cat['id_category'] ? 'selected="selected"' : '') . '>' . $cat['name'] . '</option>';
            }
        }
        $html .= '        </select>';
        $html .= '      </div>';
        $html .= '      <div class="col-lg-3">';
        $html .= '        <button type="submit" class="btn btn-default"><i class="icon-refresh"></i> ' . htmlspecialchars($this->l('Wczytaj'), ENT_QUOTES, 'UTF-8') . '</button>';
        $html .= '      </div>';
        $html .= '    </div>';
        $html .= '  </form>';

        // 2. Filter Configuration Form
        $html .= '  <form action="' . htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES, 'UTF-8') . '" method="post" class="form-horizontal">';
        $html .= '    <input type="hidden" name="id_category_filter" value="' . $id_category_filter . '" />';

        $html .= '    <p class="alert alert-info">';
        $html .= '      ' . sprintf($this->l('Konfigurujesz filtry dla poziomu: %s.'), '<strong>' . ($id_category_filter > 0 ? $this->l('Kategoria ID ') . $id_category_filter : $this->l('Globalny')) . '</strong>') . '<br />';
        $html .= '      ' . htmlspecialchars($this->l('Włącz lub wyłącz poszczególne filtry na podstawie cech sklepu, nadaj im przyjazne dla klientów etykiety i wybierz sposób prezentacji (np. lista checkboxów dla materiałów/kształtów lub suwak dla wartości liczbowych).'), ENT_QUOTES, 'UTF-8');
        $html .= '    </p>';

        // Instant / Dynamic toggle setting
        $html .= '    <div class="form-group" style="border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px;">';
        $html .= '      <label class="control-label col-lg-3" style="font-weight: bold;">' . htmlspecialchars($this->l('Typ działania filtrów'), ENT_QUOTES, 'UTF-8') . ':</label>';
        $html .= '      <div class="col-lg-9">';
        $html .= '        <div class="radio">';
        $html .= '          <label>';
        $html .= '            <input type="radio" name="lc_instant" value="1" ' . ($instant_val ? 'checked="checked"' : '') . ' />';
        $html .= '            <strong>' . htmlspecialchars($this->l('Filtrowanie dynamiczne (Instant)'), ENT_QUOTES, 'UTF-8') . '</strong> - ' . htmlspecialchars($this->l('produkty są filtrowane od razu po kliknięciu dowolnego filtra.'), ENT_QUOTES, 'UTF-8');
        $html .= '          </label>';
        $html .= '        </div>';
        $html .= '        <div class="radio">';
        $html .= '          <label>';
        $html .= '            <input type="radio" name="lc_instant" value="0" ' . (!$instant_val ? 'checked="checked"' : '') . ' />';
        $html .= '            <strong>' . htmlspecialchars($this->l('Z przyciskiem "Zastosuj"'), ENT_QUOTES, 'UTF-8') . '</strong> - ' . htmlspecialchars($this->l('filtry zostaną zastosowane dopiero po kliknięciu przycisku na dole paska.'), ENT_QUOTES, 'UTF-8');
        $html .= '          </label>';
        $html .= '        </div>';
        $html .= '      </div>';
        $html .= '    </div>';

        $html .= '    <table class="table">';
        $html .= '      <thead>';
        $html .= '        <tr>';
        $html .= '          <th width="80px" class="text-center">' . htmlspecialchars($this->l('Aktywny'), ENT_QUOTES, 'UTF-8') . '</th>';
        $html .= '          <th>' . htmlspecialchars($this->l('Cecha / Pole w sklepie'), ENT_QUOTES, 'UTF-8') . '</th>';
        $html .= '          <th>' . htmlspecialchars($this->l('Etykieta filtra na sklepie'), ENT_QUOTES, 'UTF-8') . '</th>';
        $html .= '          <th>' . htmlspecialchars($this->l('Typ prezentacji filtra'), ENT_QUOTES, 'UTF-8') . '</th>';
        $html .= '        </tr>';
        $html .= '      </thead>';
        $html .= '      <tbody>';

        // Price Row
        $price_conf = isset($config_by_id['price']) ? $config_by_id['price'] : ['active' => true, 'label' => 'Cena (PLN)', 'type' => 'slider'];
        $price_checked = $price_conf['active'] ? 'checked="checked"' : '';

        $html .= '        <tr style="background-color: #f9f9f9; font-weight: bold;">';
        $html .= '          <td class="text-center">';
        $html .= '            <input type="checkbox" name="active_price" value="1" ' . $price_checked . ' />';
        $html .= '          </td>';
        $html .= '          <td>' . htmlspecialchars($this->l('CENA PRODUKTU'), ENT_QUOTES, 'UTF-8') . ' (Special)</td>';
        $html .= '          <td>';
        $html .= '            <input type="text" class="form-control" name="label_price" value="' . htmlspecialchars($price_conf['label'], ENT_QUOTES, 'UTF-8') . '" />';
        $html .= '          </td>';
        $html .= '          <td>';
        $html .= '            <span class="label label-info">' . htmlspecialchars($this->l('Suwak ceny (Slider)'), ENT_QUOTES, 'UTF-8') . '</span>';
        $html .= '          </td>';
        $html .= '        </tr>';

        // Features Rows
        if ($features) {
            foreach ($features as $f) {
                $fid = (int)$f['id_feature'];
                $f_name = $f['name'];

                $f_conf = isset($config_by_id[$fid]) ? $config_by_id[$fid] : ['active' => false, 'label' => $f_name, 'type' => 'checkboxes'];

                $checked = $f_conf['active'] ? 'checked="checked"' : '';
                $label_val = $f_conf['label'];
                $type_val = $f_conf['type'];

                $html .= '        <tr>';
                $html .= '          <td class="text-center">';
                $html .= '            <input type="checkbox" name="active_' . $fid . '" value="1" ' . $checked . ' />';
                $html .= '          </td>';
                $html .= '          <td>' . htmlspecialchars($f_name, ENT_QUOTES, 'UTF-8') . ' <small class="text-muted">(ID: ' . $fid . ')</small></td>';
                $html .= '          <td>';
                $html .= '            <input type="text" class="form-control" name="label_' . $fid . '" value="' . htmlspecialchars($label_val, ENT_QUOTES, 'UTF-8') . '" />';
                $html .= '          </td>';
                $html .= '          <td>';
                $html .= '            <select class="form-control" name="type_' . $fid . '">';
                $html .= '              <option value="checkboxes" ' . ($type_val == 'checkboxes' ? 'selected="selected"' : '') . '>' . htmlspecialchars($this->l('Lista checkboxów (Multi-select)'), ENT_QUOTES, 'UTF-8') . '</option>';
                $html .= '              <option value="slider" ' . ($type_val == 'slider' ? 'selected="selected"' : '') . '>' . htmlspecialchars($this->l('Suwak zakresu liczbowego'), ENT_QUOTES, 'UTF-8') . '</option>';
                $html .= '              <option value="size_split" ' . ($type_val == 'size_split' ? 'selected="selected"' : '') . '>' . htmlspecialchars($this->l('Wymiary "Szerokość x Wysokość" (np. 70x37)'), ENT_QUOTES, 'UTF-8') . '</option>';
                $html .= '            </select>';
                $html .= '          </td>';
                $html .= '        </tr>';
            }
        }

        $html .= '      </tbody>';
        $html .= '    </table>';

        $html .= '    <div class="panel-footer">';
        $html .= '      <button type="submit" name="submitLabelConfigurator" class="btn btn-default pull-right"><i class="process-icon-save"></i> ' . htmlspecialchars($this->l('Zapisz konfigurację'), ENT_QUOTES, 'UTF-8') . '</button>';
        $html .= '    </div>';
        $html .= '  </form>';
        $html .= '</div>';

        return $html;
    }

    public function hookActionFrontControllerSetMedia($params)
    {
        // Do not register javascript via PrestaShop hook queue to prevent CCC combination and old version caching.
        // We load it directly in the template with query parameter busting.
    }

    public function getCategorySubcategories($id_category, $id_lang)
    {
        $categories = [(int)$id_category];
        $children = Category::getChildren((int)$id_category, $id_lang, true);
        if ($children) {
            foreach ($children as $child) {
                $child_id = (int)$child['id_category'];
                $categories = array_merge($categories, $this->getCategorySubcategories($child_id, $id_lang));
            }
        }
        return array_unique($categories);
    }

    public function getFilteredProductsData()
    {
        $context = Context::getContext();
        $id_lang = (int)$context->language->id;
        if ($id_lang === 0) {
            $id_lang = (int)Configuration::get('PS_LANG_DEFAULT');
        }
        $id_shop = (int)$context->shop->id;
        if ($id_shop === 0) {
            $id_shop = (int)Configuration::get('PS_SHOP_DEFAULT');
            if ($id_shop === 0) {
                $id_shop = 1;
            }
        }

        // Dynamic Category Scoping via Global Context
        $id_category = (int)Tools::getValue('id_category');
        if ($id_category === 0) {
            $controller = $context->controller;
            if (isset($controller) && method_exists($controller, 'getCategory')) {
                $category = $controller->getCategory();
                if (Validate::isLoadedObject($category)) {
                    $id_category = (int)$category->id;
                }
            }
        }

        // Automatic category detection for product pages
        if ($id_category === 0) {
            $id_product = (int)Tools::getValue('id_product');
            if ($id_product > 0) {
                $product = new Product($id_product);
                if (Validate::isLoadedObject($product)) {
                    $id_category = (int)$product->id_category_default;
                }
            }
        }

        if ($id_category === 0) {
            $id_category = (int)Configuration::get('PS_HOME_CATEGORY');
            if ($id_category === 0) {
                $id_category = 2; // Default home category
            }
        }

        $products_raw = [];
        if ($id_category > 0) {
            $categories_pool = $this->getCategorySubcategories($id_category, $id_lang);

            // Ultra-robust single query to fetch all active products across categories pool
            // This is immune to both category group check failures and multi-shop language inconsistencies
            $category_list_sql = implode(',', array_map('intval', $categories_pool));
            $sql = "SELECT DISTINCT p.id_product, pl.name, pl.link_rewrite
                    FROM "._DB_PREFIX_."product p
                    JOIN "._DB_PREFIX_."product_shop ps ON (p.id_product = ps.id_product AND ps.id_shop = $id_shop)
                    LEFT JOIN "._DB_PREFIX_."product_lang pl ON (p.id_product = pl.id_product AND pl.id_lang = $id_lang AND pl.id_shop = $id_shop)
                    JOIN "._DB_PREFIX_."category_product cp ON (p.id_product = cp.id_product)
                    WHERE ps.active = 1 AND cp.id_category IN ($category_list_sql)";

            $products_raw = Db::getInstance()->executeS($sql);
        }


        $results = [];

        if (!empty($products_raw)) {
            $product_ids = array_column($products_raw, 'id_product');

            // 1. Bulk fetch features (supports both active language and default fallback language to guarantee lookups)
            $features_bulk = [];
            $id_lang_default = (int)Configuration::get('PS_LANG_DEFAULT');
            $features_raw = Db::getInstance()->executeS("
                SELECT fp.id_product, fp.id_feature, fvl.value, fvl.id_lang
                FROM "._DB_PREFIX_."feature_product fp
                JOIN "._DB_PREFIX_."feature_value_lang fvl ON (fp.id_feature_value = fvl.id_feature_value)
                WHERE fvl.id_lang IN ($id_lang, $id_lang_default) AND fp.id_product IN (" . implode(',', array_map('intval', $product_ids)) . ")
            ");
            if ($features_raw) {
                foreach ($features_raw as $f) {
                    $pid = (int)$f['id_product'];
                    $fid_key = 'f_' . (int)$f['id_feature'];
                    $lang_of_val = (int)$f['id_lang'];
                    $val = trim($f['value']);

                    // Initialize array if not set
                    if (!isset($features_bulk[$pid][$fid_key])) {
                        $features_bulk[$pid][$fid_key] = [];
                    }

                    // For language overrides: if active language is processed, we prefer it.
                    // To handle multi-value features correctly across languages, we can store values.
                    if (!in_array($val, $features_bulk[$pid][$fid_key])) {
                        $features_bulk[$pid][$fid_key][] = $val;
                    }
                }
            }

            // 2. Bulk fetch images
            $images_bulk = [];
            $images_raw = Db::getInstance()->executeS("
                SELECT id_product, id_image
                FROM "._DB_PREFIX_."image
                WHERE cover = 1 AND id_product IN (" . implode(',', array_map('intval', $product_ids)) . ")
            ");
            if ($images_raw) {
                foreach ($images_raw as $img) {
                    $images_bulk[(int)$img['id_product']] = (int)$img['id_image'];
                }
            }

            // 3. Construct products list with cached variables
            foreach ($products_raw as $p) {
                $id_product = (int)$p['id_product'];
                $name = isset($p['name']) ? $p['name'] : '';
                $link_rewrite = isset($p['link_rewrite']) ? $p['link_rewrite'] : '';

                $features_indexed = isset($features_bulk[$id_product]) ? $features_bulk[$id_product] : [];

                // Get cover image
                $image_url = '';
                if (isset($images_bulk[$id_product])) {
                    $image_url = $context->link->getImageLink($link_rewrite, $images_bulk[$id_product], 'home_default');
                }

                // Get price
                $price = (float)Product::getPriceStatic($id_product, true, null, 6);
                $formatted_price = Tools::displayPrice($price);

                $results[] = [
                    'id_product' => $id_product,
                    'name' => $name,
                    'price' => $price,
                    'formatted_price' => $formatted_price,
                    'image' => $image_url,
                    'url' => $context->link->getProductLink($id_product, null, null, null, $id_lang, $id_shop),
                    'features' => (object)$features_indexed
                ];
            }
        }

        // Add to logger to diagnose active results count
        PrestaShopLogger::addLog('LabelConfigurator - getFilteredProductsData found: ' . count($results) . ' products for id_category: ' . $id_category, 1);

        return $results;
    }

    public function renderWidget($hookName = null, array $configuration = [])
    {
        $context = Context::getContext();
        $id_lang = (int)$context->language->id;
        if ($id_lang === 0) {
            $id_lang = (int)Configuration::get('PS_LANG_DEFAULT');
        }
        $id_category = (int)Tools::getValue('id_category');
        if ($id_category === 0) {
            $controller = $context->controller;
            if (isset($controller) && method_exists($controller, 'getCategory')) {
                $category = $controller->getCategory();
                if (Validate::isLoadedObject($category)) {
                    $id_category = (int)$category->id;
                }
            }
        }

        // Automatic category detection for product pages
        if ($id_category === 0) {
            $id_product = (int)Tools::getValue('id_product');
            if ($id_product > 0) {
                $product = new Product($id_product);
                if (Validate::isLoadedObject($product)) {
                    $id_category = (int)$product->id_category_default;
                }
            }
        }

        $results = $this->getFilteredProductsData();

        // Load correct config (category-specific or fallback to global)
        $filters_config = false;
        if ($id_category > 0) {
            $filters_config = Configuration::get('LC_FILTERS_CONFIG_' . $id_category);
            if ($filters_config === '') {
                $filters_config = false;
            }
        }
        if ($filters_config === false) {
            $filters_config = Configuration::get('LC_FILTERS_CONFIG');
            if ($filters_config === '' || empty($filters_config)) {
                $filters_config = false;
            }
        }
        if (!$filters_config) {
            $default_config = [
                ['id' => 'price', 'active' => true, 'label' => 'Cena (PLN)', 'type' => 'slider'],
                ['id' => 6, 'active' => true, 'label' => 'Rozmiar (Szer. x Wys.)', 'type' => 'size_split'],
                ['id' => 14, 'active' => true, 'label' => 'Średnica (mm)', 'type' => 'slider'],
                ['id' => 23, 'active' => true, 'label' => 'Materiał', 'type' => 'checkboxes'],
                ['id' => 27, 'active' => true, 'label' => 'Kształt', 'type' => 'checkboxes'],
                ['id' => 15, 'active' => true, 'label' => 'Etykiet na arkuszu', 'type' => 'checkboxes']
            ];
            $filters_config = json_encode($default_config);
        }

        // Load instant value
        $instant_val = false;
        if ($id_category > 0) {
            $instant_val = Configuration::get('LC_FILTERS_INSTANT_' . $id_category);
        }
        if ($instant_val === false) {
            $instant_val = Configuration::get('LC_FILTERS_INSTANT');
        }
        if ($instant_val === false) {
            $instant_val = 1; // Default
        }
        $instant_val = (bool)$instant_val;

        // Load original feature names to map to query parameters reliably
        $features_list = Feature::getFeatures($id_lang);
        $feature_names_by_id = [];
        if ($features_list) {
            foreach ($features_list as $f) {
                $feature_names_by_id[(int)$f['id_feature']] = $f['name'];
            }
        }

        $filters_config_arr = json_decode($filters_config, true);
        if (is_array($filters_config_arr)) {
            foreach ($filters_config_arr as &$item) {
                if (is_numeric($item['id'])) {
                    $item['original_name'] = isset($feature_names_by_id[(int)$item['id']]) ? $feature_names_by_id[(int)$item['id']] : $item['label'];
                } else {
                    $item['original_name'] = $item['label'];
                }
            }
            $filters_config = json_encode($filters_config_arr);
        }

        $products_base64 = base64_encode(json_encode($results));
        $config_base64 = base64_encode($filters_config);

        $this->smarty->assign([
            'products_json' => json_encode($results),
            'products_base64' => $products_base64,
            'filters_config_json' => $filters_config,
            'config_base64' => $config_base64,
            'filters_instant' => $instant_val,
            'ajax_url' => $context->link->getModuleLink('labelconfigurator', 'ajax'),
            'id_category' => $id_category
        ]);

        return $this->fetch('module:labelconfigurator/views/templates/front/configurator.tpl');
    }

    public function getWidgetVariables($hookName = null, array $configuration = [])
    {
        return [];
    }
}