<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

class LabelConfiguratorAjaxModuleFrontController extends ModuleFrontController
{
    public function initContent()
    {
        // Prevent Smarty rendering
        parent::initContent();

        // Set JSON headers
        header('Content-Type: application/json');

        // Retrieve and parse POST payload
        $post_data = json_decode(file_get_contents('php://input'), true);
        if (!$post_data) {
            $post_data = $_POST;
        }

        $id_category = 0;
        if (isset($post_data['id_category'])) {
            $id_category = (int)$post_data['id_category'];
        } else {
            $id_category = (int)Tools::getValue('id_category');
        }

        $filters = isset($post_data['filters']) ? $post_data['filters'] : [];

        // Temporarily set the GET variable so that getFilteredProductsData respects the scope
        if ($id_category > 0) {
            $_GET['id_category'] = $id_category;
        }

        $all_products = $this->module->getFilteredProductsData();
        $filtered_products = [];

        // Helper: Parse numerical features (e.g. "14" or "14 mm" -> 14.0)
        $parse_number = function($val) {
            if (is_numeric($val)) {
                return (float)$val;
            }
            if (empty($val)) {
                return 0.0;
            }
            $val = str_replace(',', '.', $val);
            if (preg_match('/(\d+(?:\.\d+)?)/', $val, $matches)) {
                return (float)$matches[1];
            }
            return 0.0;
        };

        // Helper: Parse dimension features (e.g. "70x37" or "70 x 37 mm" -> width: 70, height: 37)
        $parse_size_split = function($val) use ($parse_number) {
            if (empty($val)) {
                return ['w' => 0.0, 'h' => 0.0];
            }
            $val = str_replace(',', '.', $val);
            if (preg_match('/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i', $val, $matches)) {
                return ['w' => (float)$matches[1], 'h' => (float)$matches[2]];
            }
            $single = $parse_number($val);
            return ['w' => $single, 'h' => $single];
        };

        foreach ($all_products as $p) {
            $keep = true;

            foreach ($filters as $fid => $state) {
                // 1. Price Filter
                if ($fid === 'price') {
                    $current_min = isset($state['currentMin']) ? (float)$state['currentMin'] : null;
                    $current_max = isset($state['currentMax']) ? (float)$state['currentMax'] : null;

                    if ($current_min !== null && $p['price'] < $current_min) {
                        $keep = false;
                        break;
                    }
                    if ($current_max !== null && $p['price'] > $current_max) {
                        $keep = false;
                        break;
                    }
                }
                // 2. Numerical Slider Feature Filter
                elseif (isset($state['type']) && $state['type'] === 'slider') {
                    $current_min = isset($state['currentMin']) ? (float)$state['currentMin'] : null;
                    $current_max = isset($state['currentMax']) ? (float)$state['currentMax'] : null;

                    $features = $p['features'];
                    $feat_val = '';
                    if (is_object($features) && isset($features->{'f_' . $fid})) {
                        $feat_val = $features->{'f_' . $fid};
                    } elseif (is_array($features) && isset($features['f_' . $fid])) {
                        $feat_val = $features['f_' . $fid];
                    }

                    $val_num = $parse_number($feat_val);
                    if ($current_min !== null && $val_num < $current_min) {
                        $keep = false;
                        break;
                    }
                    if ($current_max !== null && $val_num > $current_max) {
                        $keep = false;
                        break;
                    }
                }
                // 3. Size Split Feature Filter
                elseif (isset($state['type']) && $state['type'] === 'size_split') {
                    $current_min_w = isset($state['currentMinW']) ? (float)$state['currentMinW'] : null;
                    $current_max_w = isset($state['currentMaxW']) ? (float)$state['currentMaxW'] : null;
                    $current_min_h = isset($state['currentMinH']) ? (float)$state['currentMinH'] : null;
                    $current_max_h = isset($state['currentMaxH']) ? (float)$state['currentMaxH'] : null;

                    $features = $p['features'];
                    $feat_val = '';
                    if (is_object($features) && isset($features->{'f_' . $fid})) {
                        $feat_val = $features->{'f_' . $fid};
                    } elseif (is_array($features) && isset($features['f_' . $fid])) {
                        $feat_val = $features['f_' . $fid];
                    }

                    $size = $parse_size_split($feat_val);

                    if ($current_min_w !== null && $size['w'] < $current_min_w) {
                        $keep = false;
                        break;
                    }
                    if ($current_max_w !== null && $size['w'] > $current_max_w) {
                        $keep = false;
                        break;
                    }
                    if ($current_min_h !== null && $size['h'] < $current_min_h) {
                        $keep = false;
                        break;
                    }
                    if ($current_max_h !== null && $size['h'] > $current_max_h) {
                        $keep = false;
                        break;
                    }
                }
                // 4. Checkboxes / Color Swatches Filter
                elseif (isset($state['type']) && $state['type'] === 'checkboxes') {
                    $selected = isset($state['selected']) ? $state['selected'] : [];
                    if (!empty($selected)) {
                        $features = $p['features'];
                        $feat_val = '';
                        if (is_object($features) && isset($features->{'f_' . $fid})) {
                            $feat_val = $features->{'f_' . $fid};
                        } elseif (is_array($features) && isset($features['f_' . $fid])) {
                            $feat_val = $features['f_' . $fid];
                        }

                        if (!in_array($feat_val, $selected)) {
                            $keep = false;
                            break;
                        }
                    }
                }
            }

            if ($keep) {
                $filtered_products[] = $p;
            }
        }

        echo json_encode([
            'success' => true,
            'products' => $filtered_products
        ]);
        die();
    }
}