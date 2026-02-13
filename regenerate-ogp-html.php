<?php
/**
 * OGP HTML Regenerator
 * Reads data.json and regenerates missing .html files for all PDFs
 */

header('Content-Type: text/html; charset=utf-8');

$dataFile = 'data.json';
$baseUrl = 'https://jollygood.co.jp/slide';
$messages = [];

function logMsg($msg)
{
    global $messages;
    $messages[] = $msg;
}

// 1. Load data.json
if (!file_exists($dataFile)) {
    die("Error: data.json not found.");
}

$jsonContent = file_get_contents($dataFile);
$pdfs = json_decode($jsonContent, true);

if (!is_array($pdfs)) {
    die("Error: Invalid data.json format.");
}

logMsg("Found " . count($pdfs) . " PDF entries.");

// 2. Iterate and generate HTML
$count = 0;

foreach ($pdfs as $pdf) {
    $pdfId = preg_replace('/[^a-zA-Z0-9]/', '', $pdf['id']);
    $title = htmlspecialchars($pdf['title'], ENT_QUOTES, 'UTF-8');
    $description = isset($pdf['description']) && $pdf['description'] ? htmlspecialchars($pdf['description'], ENT_QUOTES, 'UTF-8') : 'JOLLYGOOD スライドライブラリでVR医療教育の資料をご覧ください';

    $htmlFilename = $pdfId . '.html';
    $ogpImagePath = "ogp/{$pdfId}.png";

    // Check if image exists (optional, simplified)
    // $hasImage = file_exists($ogpImagePath);

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

    if (file_put_contents($htmlFilename, $html)) {
        logMsg("✅ Generated: <a href='{$htmlFilename}'>{$htmlFilename}</a> ({$title})");
        $count++;
    } else {
        logMsg("❌ Failed to write: {$htmlFilename}");
    }
}

?>
<!DOCTYPE html>
<html>

<head>
    <title>OGP Regeneration</title>
</head>

<body>
    <h1>OGP Regeneration Results</h1>
    <p>Regenerated
        <?php echo $count; ?> files.
    </p>
    <ul>
        <?php foreach ($messages as $msg)
            echo "<li>$msg</li>"; ?>
    </ul>
    <a href="index.html">Back to Library</a>
</body>

</html>