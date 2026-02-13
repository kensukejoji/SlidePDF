<?php
/**
 * Deduplication Script for data.json
 * Removes duplicate entries (e.g., file_1.pdf) keeping the original (file.pdf)
 */

$jsonFile = __DIR__ . '/data.json';

if (!file_exists($jsonFile)) {
    die("Error: data.json not found\n");
}

$content = file_get_contents($jsonFile);
$data = json_decode($content, true);

if (!is_array($data)) {
    die("Error: Invalid JSON data\n");
}

echo "Original count: " . count($data) . "\n";

$groups = [];

foreach ($data as $item) {
    $filename = $item['filename'];

    // Normalize: Remove _ followed by numbers at the end of the name, just before extension
    // Matches: name_1.pdf, name_99.pdf -> name
    $baseName = preg_replace('/(_\d+)?\.pdf$/i', '', $filename);

    if (!isset($groups[$baseName])) {
        $groups[$baseName] = [];
    }
    $groups[$baseName][] = $item;
}

$cleanedData = [];
$removedCount = 0;

foreach ($groups as $base => $items) {
    if (count($items) > 1) {
        // Sort by filename length ascending (shortest is usually the original)
        // e.g. "file.pdf" (8 chars) < "file_1.pdf" (10 chars)
        usort($items, function ($a, $b) {
            return strlen($a['filename']) - strlen($b['filename']);
        });

        $kept = $items[0];
        $cleanedData[] = $kept;

        echo "Group '{$base}': Keeping '{$kept['filename']}'\n";
        for ($i = 1; $i < count($items); $i++) {
            echo "  - Removing duplicate: '{$items[$i]['filename']}'\n";
            $removedCount++;
        }
    } else {
        $cleanedData[] = $items[0];
    }
}

echo "\nFinal count: " . count($cleanedData) . "\n";
echo "Removed entries: " . $removedCount . "\n";

// Backup
$backupFile = $jsonFile . '.bak.' . date('YmdHis');
if (copy($jsonFile, $backupFile)) {
    echo "Backup created at: {$backupFile}\n";

    // Save
    // Re-index array to ensure it's a JSON array, not object
    $cleanedData = array_values($cleanedData);

    if (file_put_contents($jsonFile, json_encode($cleanedData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE))) {
        echo "Successfully updated data.json\n";
    } else {
        echo "Error: Failed to write data.json\n";
    }
} else {
    echo "Error: Failed to create backup\n";
}
?>