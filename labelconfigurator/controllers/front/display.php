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

        $this->context->smarty->assign('products_json', json_encode($results));
        $this->context->smarty->assign('filters_config_json', $filters_config);
        $this->setTemplate('module:labelconfigurator/views/templates/front/configurator.tpl');
    }
}
