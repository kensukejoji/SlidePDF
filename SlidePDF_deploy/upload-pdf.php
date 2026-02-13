<?php
/**
 * PDF Upload Handler
 * Allows admin users to upload PDF files from the browser
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Configuration
$uploadDir = 'ComicPDF/';
$maxFileSize = 50 * 1024 * 1024; // 50MB
$allowedTypes = ['application/pdf'];

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

// Check if file was uploaded
if (!isset($_FILES['pdf']) || $_FILES['pdf']['error'] !== UPLOAD_ERR_OK) {
    $error = isset($_FILES['pdf']) ? $_FILES['pdf']['error'] : 'No file';
    respond(false, 'Upload error: ' . $error);
}

$file = $_FILES['pdf'];

// Validate file type
$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $file['tmp_name']);
finfo_close($finfo);

if (!in_array($mimeType, $allowedTypes)) {
    respond(false, 'Invalid file type. Only PDF files are allowed.');
}

// Validate file size
if ($file['size'] > $maxFileSize) {
    respond(false, 'File too large. Maximum size is 50MB.');
}

// Create upload directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate safe filename
$originalName = pathinfo($file['name'], PATHINFO_FILENAME);
$safeName = preg_replace('/[^a-zA-Z0-9_\-\p{L}]/u', '_', $originalName);
$filename = $safeName . '.pdf';

// Avoid overwriting existing files
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
    respond(false, 'Failed to save file');
}
?>