<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

class LabelConfiguratorDisplayModuleFrontController extends ModuleFrontController
{
    public function setMedia()
    {
        parent::setMedia();
        $this->registerJavascript(
            'module-labelconfigurator-js',
            'modules/labelconfigurator/views/js/configurator.js',
            ['position' => 'bottom', 'priority' => 150]
        );
    }

    public function initContent()
    {
        parent::initContent();

        // Get products via module's getFilteredProductsData method
        $results = $this->module->getFilteredProductsData();
        $filters_config = Configuration::get('LC_FILTERS_CONFIG');
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

        $this->context->smarty->assign('products_json', json_encode($results));
        $this->context->smarty->assign('filters_config_json', $filters_config);
        $this->setTemplate('module:labelconfigurator/views/templates/front/configurator.tpl');
    }
}
