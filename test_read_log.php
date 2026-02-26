<?php
$logFile = '/home/kensukejoji/jollygood.co.jp/public_html/slide/gemini_debug.log';
if (file_exists($logFile)) {
    echo file_get_contents($logFile);
} else {
    echo "Log file not found.";
}
?>
