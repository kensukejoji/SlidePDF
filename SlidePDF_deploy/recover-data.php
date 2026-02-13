<?php
/**
 * Data Recovery Script (Enhanced with Visual Output)
 * Scans ComicPDF directory and restores missing entries to data.json
 */

header('Access-Control-Allow-Origin: *');
// Just text/html for browser viewing
header('Content-Type: text/html; charset=utf-8');

$pdfDir = 'ComicPDF/';
$dataFile = 'data.json';
$messages = [];

function logMsg($msg)
{
    global $messages;
    $messages[] = $msg;
}

// 1. Load existing data
$currentData = [];
if (file_exists($dataFile)) {
    $jsonContent = file_get_contents($dataFile);
    $currentData = json_decode($jsonContent, true);
    if (!is_array($currentData)) {
        $currentData = [];
        logMsg("⚠️ Existing data.json was corrupt or empty. Starting fresh.");
    } else {
        logMsg("✅ Loaded data.json. Contains " . count($currentData) . " items.");
    }
} else {
    logMsg("⚠️ data.json not found. Creating new.");
}

// Map existing filenames
$existingFilenames = [];
foreach ($currentData as $item) {
    if (isset($item['filename'])) {
        $existingFilenames[$item['filename']] = true;
    }
}

// 2. Scan directory
$recoveredCount = 0;
$files = glob($pdfDir . '*.pdf');

logMsg("📂 Scanning {$pdfDir}...");

if ($files) {
    logMsg("📄 Found " . count($files) . " PDF files in directory.");

    foreach ($files as $filePath) {
        $filename = basename($filePath);

        // If file is not in data.json, add it
        if (!isset($existingFilenames[$filename])) {
            $newItem = [
                'id' => 'pdf_' . uniqid(),
                'filename' => $filename,
                'title' => str_replace('.pdf', '', $filename),
                'description' => '',
                'services' => [],
                'programs' => [],
                'notes' => 'Recovered via script',
                'ogpPage' => 1,
                'pageCount' => 0
            ];

            $currentData[] = $newItem;
            $recoveredCount++;
            logMsg("➕ Added missing file: <strong>{$filename}</strong>");
        } else {
            // logMsg("ℹ️ Skipped (already exists): {$filename}");
        }
    }
} else {
    logMsg("❌ No PDF files found in {$pdfDir}. Please check permissions or directory path.");
}

// 3. Save updated data
$saveResult = false;
if ($recoveredCount > 0) {
    if (file_put_contents($dataFile, json_encode($currentData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        $saveResult = true;
        logMsg("💾 <strong>Successfully saved data.json!</strong>");
    } else {
        logMsg("❌ <strong>Failed to write to data.json.</strong> Check server permissions.");
    }
} else {
    logMsg("✅ No changes needed. data.json is up to date.");
}

?>
<!DOCTYPE html>
<html lang="ja">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Slide Library Recovery Tool</title>
    <style>
        body {
            font-family: sans-serif;
            max-width: 800px;
            margin: 2rem auto;
            padding: 0 1rem;
            line-height: 1.6;
            color: #333;
        }

        h1 {
            border-bottom: 2px solid #6366f1;
            padding-bottom: 0.5rem;
        }

        .log {
            background: #f4f4f5;
            padding: 1rem;
            border-radius: 8px;
            border: 1px solid #e4e4e7;
        }

        .item {
            margin-bottom: 0.5rem;
            border-bottom: 1px solid #eee;
            padding-bottom: 0.25rem;
        }

        .success {
            color: #059669;
            font-weight: bold;
        }

        .error {
            color: #dc2626;
            font-weight: bold;
        }

        .btn {
            display: inline-block;
            background: #6366f1;
            color: white;
            padding: 0.75rem 1.5rem;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 1rem;
            font-weight: bold;
        }

        .btn:hover {
            background: #4f46e5;
        }
    </style>
</head>

<body>
    <h1>🛠️ PDF List Recovery Tool</h1>

    <div class="log">
        <?php foreach ($messages as $msg): ?>
            <div class="item"><?php echo $msg; ?></div>
        <?php endforeach; ?>
    </div>

    <?php if ($recoveredCount > 0 && $saveResult): ?>
        <p class="success">🎉 <?php echo $recoveredCount; ?> file(s) recovered!</p>
    <?php elseif ($recoveredCount > 0 && !$saveResult): ?>
        <p class="error">⚠️ Attempted to recover <?php echo $recoveredCount; ?> files, but save failed.</p>
    <?php else: ?>
        <p>System checked. Everything looks good.</p>
    <?php endif; ?>

    <a href="index.html" class="btn">Back to Library</a>
</body>

</html>