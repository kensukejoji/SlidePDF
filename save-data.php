<?php
/**
 * Save Data Handler
 * Saves PDF metadata to data.json with file locking
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Response helper
function respond($success, $message, $data = null)
{
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

// Check request method
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'POST method required');
}

// Get JSON input
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null) {
    respond(false, 'Invalid JSON data');
}

$dataFile = 'data.json';
$backupDir = 'data/backups';

// Ensure backup directory exists
if (!file_exists($backupDir)) {
    mkdir($backupDir, 0755, true);
}

// Open file for writing
$fp = fopen($dataFile, 'c+'); // Open for reading and writing, keeping the lock
if (!$fp) {
    respond(false, 'Failed to open data file');
}

// Acquire exclusive lock
if (flock($fp, LOCK_EX)) {

    // 1. SAFETY CHECK: Read existing data
    $currentContent = stream_get_contents($fp);
    $currentData = json_decode($currentContent, true);

    // Prevent accidental wipe (if new data is empty but old data wasn't)
    if (empty($data) && !empty($currentData) && count($currentData) > 0) {
        flock($fp, LOCK_UN);
        fclose($fp);
        respond(false, 'SAFETY ERROR: Attempted to save empty data over existing data.');
    }

    // 2. BACKUP: Save current state to backup file
    if (!empty($currentContent)) {
        $timestamp = date('Ymd_His');
        $backupFile = $backupDir . '/data_' . $timestamp . '.json';
        file_put_contents($backupFile, $currentContent);

        // Auto-cleanup: Keep only last 50 backups
        $files = glob($backupDir . '/*.json');
        if (count($files) > 50) {
            usort($files, function ($a, $b) {
                return filemtime($a) - filemtime($b); });
            unlink($files[0]); // Delete oldest
        }
    }

    // 3. WRITE: Truncate and write new data
    ftruncate($fp, 0);
    rewind($fp);
    $bytes = fwrite($fp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    if ($bytes !== false) {
        respond(true, 'Data saved successfully (Backup created)');
    } else {
        respond(false, 'Failed to write data');
    }
} else {
    fclose($fp);
    respond(false, 'Failed to acquire file lock');
}
?>