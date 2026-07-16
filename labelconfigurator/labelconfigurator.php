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
        $this->description = 'Zaawansowany konfigurator etykiet z panelem konfiguracji cech';
    }

    public function install()
    {
        return parent::install()
            && $this->registerHook('displayLeftColumn')
            && $this->registerHook('actionFrontControllerSetMedia')
            && Configuration::updateValue('LC_FEATURE_SIZE', 6)
            && Configuration::updateValue('LC_FEATURE_DIAMETER', 14)
            && Configuration::updateValue('LC_FEATURE_MATERIAL', 23)
            && Configuration::updateValue('LC_FEATURE_SHAPE', 27)
            && Configuration::updateValue('LC_FEATURE_LABELS', 15);
    }

    public function uninstall()
    {
        return parent::uninstall()
            && Configuration::deleteByName('LC_FEATURE_SIZE')
            && Configuration::deleteByName('LC_FEATURE_DIAMETER')
            && Configuration::deleteByName('LC_FEATURE_MATERIAL')
            && Configuration::deleteByName('LC_FEATURE_SHAPE')
            && Configuration::deleteByName('LC_FEATURE_LABELS');
    }

    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('submitLabelConfigurator')) {
            Configuration::updateValue('LC_FEATURE_SIZE', (int)Tools::getValue('LC_FEATURE_SIZE'));
            Configuration::updateValue('LC_FEATURE_DIAMETER', (int)Tools::getValue('LC_FEATURE_DIAMETER'));
            Configuration::updateValue('LC_FEATURE_MATERIAL', (int)Tools::getValue('LC_FEATURE_MATERIAL'));
            Configuration::updateValue('LC_FEATURE_SHAPE', (int)Tools::getValue('LC_FEATURE_SHAPE'));
            Configuration::updateValue('LC_FEATURE_LABELS', (int)Tools::getValue('LC_FEATURE_LABELS'));

            $output .= $this->displayConfirmation($this->l('Ustawienia zostały zapisane.'));
        }

        return $output . $this->renderForm();
    }

    protected function renderForm()
    {
        $id_lang = (int)$this->context->language->id;
        $features = Feature::getFeatures($id_lang);

        $features_options = [
            [
                'id_feature' => 0,
                'name' => '-- Wybierz cechę (lub wyłącz) --'
            ]
        ];

        foreach ($features as $f) {
            $features_options[] = [
                'id_feature' => (int)$f['id_feature'],
                'name' => $f['name'] . ' (ID: ' . $f['id_feature'] . ')'
            ];
        }

        $fields_form = [
            'form' => [
                'legend' => [
                    'title' => $this->l('Konfiguracja Mapowania Cech'),
                    'icon' => 'icon-cogs'
                ],
                'input' => [
                    [
                        'type' => 'select',
                        'label' => $this->l('Cecha: Rozmiar (Szerokość x Wysokość)'),
                        'name' => 'LC_FEATURE_SIZE',
                        'desc' => $this->l('Wybierz cechę przechowującą rozmiar np. "70x37" lub "105 x 148 mm".'),
                        'options' => [
                            'query' => $features_options,
                            'id' => 'id_feature',
                            'name' => 'name'
                        ]
                    ],
                    [
                        'type' => 'select',
                        'label' => $this->l('Cecha: Średnica'),
                        'name' => 'LC_FEATURE_DIAMETER',
                        'desc' => $this->l('Wybierz cechę przechowującą średnicę dla etykiet okrągłych.'),
                        'options' => [
                            'query' => $features_options,
                            'id' => 'id_feature',
                            'name' => 'name'
                        ]
                    ],
                    [
                        'type' => 'select',
                        'label' => $this->l('Cecha: Materiał'),
                        'name' => 'LC_FEATURE_MATERIAL',
                        'desc' => $this->l('Wybierz cechę przechowującą materiał.'),
                        'options' => [
                            'query' => $features_options,
                            'id' => 'id_feature',
                            'name' => 'name'
                        ]
                    ],
                    [
                        'type' => 'select',
                        'label' => $this->l('Cecha: Kształt'),
                        'name' => 'LC_FEATURE_SHAPE',
                        'desc' => $this->l('Wybierz cechę przechowującą kształt.'),
                        'options' => [
                            'query' => $features_options,
                            'id' => 'id_feature',
                            'name' => 'name'
                        ]
                    ],
                    [
                        'type' => 'select',
                        'label' => $this->l('Cecha: Liczba etykiet na arkuszu'),
                        'name' => 'LC_FEATURE_LABELS',
                        'desc' => $this->l('Wybierz cechę przechowującą liczbę etykiet na arkuszu.'),
                        'options' => [
                            'query' => $features_options,
                            'id' => 'id_feature',
                            'name' => 'name'
                        ]
                    ]
                ],
                'submit' => [
                    'title' => $this->l('Zapisz'),
                    'class' => 'btn btn-default pull-right'
                ]
            ]
        ];

        $helper = new HelperForm();
        $helper->show_toolbar = false;
        $helper->table = $this->table;
        $lang = new Language((int)Configuration::get('PS_LANG_DEFAULT'));
        $helper->default_form_language = $lang->id;
        $helper->allow_employee_form_lang = Configuration::get('PS_BO_ALLOW_EMPLOYEE_FORM_LANG') ? Configuration::get('PS_BO_ALLOW_EMPLOYEE_FORM_LANG') : 0;
        $helper->identifier = $this->identifier;
        $helper->submit_action = 'submitLabelConfigurator';
        $helper->currentIndex = $this->context->link->getAdminLink('AdminModules', false) . '&configure=' . $this->name . '&tab_module=' . $this->tab . '&module_name=' . $this->name;
        $helper->token = Tools::getAdminTokenLite('AdminModules');

        $helper->tpl_vars = [
            'fields_value' => $this->getConfigFieldsValues(),
            'languages' => $this->context->controller->getLanguages(),
            'id_language' => $this->context->language->id
        ];

        return $helper->generateForm([$fields_form]);
    }

    public function getConfigFieldsValues()
    {
        return [
            'LC_FEATURE_SIZE' => Configuration::get('LC_FEATURE_SIZE'),
            'LC_FEATURE_DIAMETER' => Configuration::get('LC_FEATURE_DIAMETER'),
            'LC_FEATURE_MATERIAL' => Configuration::get('LC_FEATURE_MATERIAL'),
            'LC_FEATURE_SHAPE' => Configuration::get('LC_FEATURE_SHAPE'),
            'LC_FEATURE_LABELS' => Configuration::get('LC_FEATURE_LABELS'),
        ];
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

        $feat_size = (int)Configuration::get('LC_FEATURE_SIZE');
        $feat_diameter = (int)Configuration::get('LC_FEATURE_DIAMETER');
        $feat_material = (int)Configuration::get('LC_FEATURE_MATERIAL');
        $feat_shape = (int)Configuration::get('LC_FEATURE_SHAPE');
        $feat_labels = (int)Configuration::get('LC_FEATURE_LABELS');

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

                $width = 0; $height = 0; $diameter = 0;
                $material = ''; $shape = ''; $labelsPerSheet = '';

                foreach ($features as $f) {
                    $id_feature = (int)$f['id_feature'];
                    if ($feat_size > 0 && $id_feature == $feat_size) {
                        if (preg_match('/(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/i', $f['value'], $matches)) {
                            $width = (float)str_replace(',', '.', $matches[1]);
                            $height = (float)str_replace(',', '.', $matches[2]);
                        }
                    } elseif ($feat_diameter > 0 && $id_feature == $feat_diameter) {
                        if (preg_match('/(\d+(?:[.,]\d+)?)/', $f['value'], $matches)) {
                            $diameter = (float)str_replace(',', '.', $matches[1]);
                        }
                    } elseif ($feat_material > 0 && $id_feature == $feat_material) {
                        $material = $f['value'];
                    } elseif ($feat_shape > 0 && $id_feature == $feat_shape) {
                        $shape = $f['value'];
                    } elseif ($feat_labels > 0 && $id_feature == $feat_labels) {
                        $labelsPerSheet = $f['value'];
                    }
                }

                if ($width == 0 && $height == 0 && $diameter > 0) {
                    $width = $diameter;
                    $height = $diameter;
                }

                if ($width > 0 && $height > 0) {
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
                        'width' => $width,
                        'height' => $height,
                        'diameter' => $diameter,
                        'material' => trim($material),
                        'shape' => trim($shape),
                        'labelsPerSheet' => trim($labelsPerSheet),
                        'price' => $price,
                        'formatted_price' => $formatted_price,
                        'image' => $image_url,
                        'url' => $this->context->link->getProductLink((int)$p['id_product'], null, null, null, $id_lang, $id_shop)
                    ];
                }
            }
        }
        return $results;
    }

    public function renderWidget($hookName = null, array $configuration = [])
    {
        $results = $this->getFilteredProductsData();
        $this->smarty->assign('products_json', json_encode($results));
        return $this->fetch('module:labelconfigurator/views/templates/front/configurator.tpl');
    }

    public function getWidgetVariables($hookName = null, array $configuration = [])
    {
        return [];
    }
}
