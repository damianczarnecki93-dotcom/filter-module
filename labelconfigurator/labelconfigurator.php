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
            && Configuration::updateValue('LC_FILTERS_CONFIG', json_encode($default_config));
    }

    public function uninstall()
    {
        return parent::uninstall()
            && Configuration::deleteByName('LC_FILTERS_CONFIG');
    }

    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('submitLabelConfigurator')) {
            $id_lang = (int)$this->context->language->id;
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

            Configuration::updateValue('LC_FILTERS_CONFIG', json_encode($config));
            $output .= $this->displayConfirmation($this->l('Ustawienia filtrów zostały zapisane pomyślnie.'));
        }

        return $output . $this->renderConfigForm();
    }

    protected function renderConfigForm()
    {
        $id_lang = (int)$this->context->language->id;
        $features = Feature::getFeatures($id_lang);

        // Load current config
        $current_config = json_decode(Configuration::get('LC_FILTERS_CONFIG'), true);
        if (!is_array($current_config)) {
            $current_config = [];
        }

        // Index by ID for easier lookup
        $config_by_id = [];
        foreach ($current_config as $item) {
            $config_by_id[$item['id']] = $item;
        }

        // Start building custom HTML configuration panel
        $html = '<div class="panel">';
        $html .= '  <div class="panel-heading"><i class="icon-cogs"></i> ' . htmlspecialchars($this->l('Zaawansowana konfiguracja lewego paska filtrów'), ENT_QUOTES, 'UTF-8') . '</div>';
        $html .= '  <form action="' . htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES, 'UTF-8') . '" method="post" class="form-horizontal">';
        $html .= '    <p class="alert alert-info">' . htmlspecialchars($this->l('Włącz lub wyłącz poszczególne filtry na podstawie cech sklepu, nadaj im przyjazne dla klientów etykiety i wybierz sposób prezentacji (np. lista checkboxów dla materiałów/kształtów lub suwak dla wartości liczbowych).'), ENT_QUOTES, 'UTF-8') . '</p>';

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

        // 1. Special Price Row
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

        // 2. Features Rows
        if ($features) {
            foreach ($features as $f) {
                $fid = (int)$f['id_feature'];
                $f_name = $f['name'];

                // Read from config, default: disabled, original name, checkboxes type
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
                $html .= '              <option value="checkboxes" ' . ($type_val == 'checkboxes' ? 'selected' : '') . '>' . htmlspecialchars($this->l('Lista checkboxów (Multi-select)'), ENT_QUOTES, 'UTF-8') . '</option>';
                $html .= '              <option value="slider" ' . ($type_val == 'slider' ? 'selected' : '') . '>' . htmlspecialchars($this->l('Suwak zakresu liczbowego'), ENT_QUOTES, 'UTF-8') . '</option>';
                $html .= '              <option value="size_split" ' . ($type_val == 'size_split' ? 'selected' : '') . '>' . htmlspecialchars($this->l('Wymiary "Szerokość x Wysokość" (np. 70x37)'), ENT_QUOTES, 'UTF-8') . '</option>';
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
        $this->context->controller->registerJavascript(
            'module-labelconfigurator-js',
            'modules/'.$this->name.'/views/js/configurator.js',
            [
                'position' => 'bottom',
                'priority' => 150,
            ]
        );
    }

    public function getFilteredProductsData()
    {
        $id_lang = (int)$this->context->language->id;
        $id_shop = (int)$this->context->shop->id;

        $sql = "SELECT p.id_product, pl.name
                FROM "._DB_PREFIX_."product p
                JOIN "._DB_PREFIX_."product_lang pl ON (p.id_product = pl.id_product AND pl.id_lang = $id_lang AND pl.id_shop = $id_shop)
                JOIN "._DB_PREFIX_."product_shop ps ON (p.id_product = ps.id_product AND ps.id_shop = $id_shop)
                WHERE ps.active = 1 LIMIT 300";

        $products_raw = Db::getInstance()->executeS($sql);
        $results = [];

        if ($products_raw) {
            foreach ($products_raw as $p) {
                $product = new Product($p['id_product'], false, $id_lang);
                $features = $product->getFrontFeatures($id_lang);

                $features_indexed = [];
                if ($features) {
                    foreach ($features as $f) {
                        $features_indexed[(int)$f['id_feature']] = trim($f['value']);
                    }
                }

                // Get cover image
                $image_url = '';
                $cover = Product::getCover((int)$p['id_product']);
                if ($cover) {
                    $id_image = (int)$cover['id_image'];
                    $image_url = $this->context->link->getImageLink($product->link_rewrite, $id_image, 'home_default');
                }

                // Get price
                $price = (float)Product::getPriceStatic((int)$p['id_product'], true, null, 6);
                $formatted_price = Tools::displayPrice($price);

                $results[] = [
                    'id_product' => (int)$p['id_product'],
                    'name' => $p['name'],
                    'price' => $price,
                    'formatted_price' => $formatted_price,
                    'image' => $image_url,
                    'url' => $this->context->link->getProductLink((int)$p['id_product'], null, null, null, $id_lang, $id_shop),
                    'features' => $features_indexed
                ];
            }
        }
        return $results;
    }

    public function renderWidget($hookName = null, array $configuration = [])
    {
        $results = $this->getFilteredProductsData();
        $filters_config = Configuration::get('LC_FILTERS_CONFIG');

        $this->smarty->assign('products_json', json_encode($results));
        $this->smarty->assign('filters_config_json', $filters_config);

        return $this->fetch('module:labelconfigurator/views/templates/front/configurator.tpl');
    }

    public function getWidgetVariables($hookName = null, array $configuration = [])
    {
        return [];
    }
}
