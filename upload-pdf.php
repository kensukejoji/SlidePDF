<?php
/**
 * PDF Upload Handler
 * Allows admin users to upload PDF files from the browser
 */

// Start output buffering to prevent header errors and catch warnings
ob_start();

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Error reporting settings - Log errors but don't output them
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
// Optional: Log to a specific file for easier debugging
// ini_set('error_log', __DIR__ . '/upload_debug.log');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    ob_end_clean();
    exit(0);
}

// Configuration
$uploadDir = 'ComicPDF/';
$maxFileSize = 100 * 1024 * 1024; // Increased to 100MB just in case
$allowedTypes = ['application/pdf'];

// Response helper
function respond($success, $message, $data = null)
{
    // Clear any buffered output (warnings, notices, etc.)
    ob_end_clean();

    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data' => $data
    ]);
    exit;
}

try {
    // Check request method
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(false, 'POST method required');
    }

    // Check if file was uploaded
    if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
        $error = isset($_FILES['pdf']) ? $_FILES['pdf']['error'] : 'No file provided';
        // Map PHP upload errors to messages
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => 'File exceeds upload_max_filesize',
            UPLOAD_ERR_FORM_SIZE => 'File exceeds MAX_FILE_SIZE in form',
            UPLOAD_ERR_PARTIAL => 'File was only partially uploaded',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload',
        ];
        $msg = isset($errorMessages[$error]) ? $errorMessages[$error] : "Unknown upload error ($error)";
        respond(false, 'Upload error: ' . $msg);
    }

    $file = $_FILES['pdf'];

    // Validate file type
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, $allowedTypes)) {
        respond(false, 'Invalid file type. Only PDF files are allowed. Detected: ' . $mimeType);
    }

    // Validate file size
    if ($file['size'] > $maxFileSize) {
        respond(false, 'File too large. Maximum size is 100MB.');
    }

    // Create upload directory if it doesn't exist
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0755, true)) {
            respond(false, 'Failed to create upload directory');
        }
    }

    // Generate safe filename
    $originalName = pathinfo($file['name'], PATHINFO_FILENAME);
    // Remove non-alphanumeric chars (keep underscores and hyphens)
    // Using a stricter regex for safety
    $safeName = preg_replace('/[^a-zA-Z0-9_\-]/', '_', $originalName);
    // Fallback if empty name
    if (empty($safeName)) {
        $safeName = 'document_' . time();
    }

    $filename = $safeName . '.pdf';

    // Avoid overwriting existing files by appending counter
    $counter = 1;
    $finalFilename = $filename;
    while (file_exists($uploadDir . $finalFilename)) {
        $finalFilename = $safeName . '_' . $counter . '.pdf';
        $counter++;
    }

    // Move uploaded file
    $destination = $uploadDir . $finalFilename;
    if (move_uploaded_file($file['tmp_name'], $destination)) {
        respond(true, 'PDF uploaded successfully', [
            'filename' => $finalFilename,
            'path' => $destination,
            'size' => $file['size']
        ]);
    } else {
        $lastError = error_get_last();
        respond(false, 'Failed to save file. ' . ($lastError['message'] ?? ''));
    }

} catch (Exception $e) {
    respond(false, 'Server Exception: ' . $e->getMessage());
}
?>