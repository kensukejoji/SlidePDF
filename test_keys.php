<?php
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    echo "No config.php found.";
    exit;
}
require_once $configFile;
if (empty($GEMINI_API_KEY)) {
    echo "config.php is empty.";
} else {
    // Only print first 10 chars for safety to verify which key it is
    echo "Current key starts with: " . substr($GEMINI_API_KEY, 0, 15) . "...";
}
?>
