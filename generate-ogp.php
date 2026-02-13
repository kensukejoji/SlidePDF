<?php
/**
 * Generate OGP HTML file for a PDF
 * This creates a simple HTML page with proper OGP meta tags for SNS sharing
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

function respond($success, $message, $data = null)
{
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'POST method required');
}

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['pdfId']) || !isset($input['title'])) {
    respond(false, 'Missing required fields: pdfId, title');
}

$pdfId = preg_replace('/[^a-zA-Z0-9_-]/', '', $input['pdfId']);
$title = htmlspecialchars($input['title'], ENT_QUOTES, 'UTF-8');
$description = isset($input['description']) ? htmlspecialchars($input['description'], ENT_QUOTES, 'UTF-8') : 'JOLLYGOOD スライドライブラリでVR医療教育の資料をご覧ください';

$baseUrl = 'https://jollygood.co.jp/slide';
$htmlFilename = $pdfId . '.html';
$ogpImagePath = "ogp/{$pdfId}.png";

$html = <<<HTML
<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title} | JOLLYGOOD スライドライブラリ</title>
    
    <!-- OGP Tags -->
    <meta property="og:title" content="{$title}">
    <meta property="og:description" content="{$description}">
    <meta property="og:type" content="article">
    <meta property="og:url" content="{$baseUrl}/{$htmlFilename}">
    <meta property="og:image" content="{$baseUrl}/{$ogpImagePath}">
    <meta property="og:site_name" content="JOLLYGOOD">
    <meta property="og:locale" content="ja_JP">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{$title}">
    <meta name="twitter:description" content="{$description}">
    <meta name="twitter:image" content="{$baseUrl}/{$ogpImagePath}">
    
    <!-- Redirect to main page with hash -->
    <meta http-equiv="refresh" content="0; url=index.html#pdf={$pdfId}">
    <link rel="canonical" href="{$baseUrl}/{$htmlFilename}">
    
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #0a0a0f;
            color: #fff;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            width: 40px;
            height: 40px;
            border: 3px solid rgba(255,255,255,0.3);
            border-top-color: #6366f1;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 1rem;
        }
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>読み込み中...</p>
    </div>
    <script>
        // Fallback redirect in case meta refresh doesn't work
        window.location.href = 'index.html#pdf={$pdfId}';
    </script>
</body>
</html>
HTML;

if (file_put_contents($htmlFilename, $html) !== false) {
    respond(true, 'OGP HTML file created', [
        'htmlFile' => $htmlFilename,
        'url' => "{$baseUrl}/{$htmlFilename}"
    ]);
} else {
    respond(false, 'Failed to create HTML file');
}
?>