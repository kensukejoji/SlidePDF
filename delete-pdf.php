<?php
/**
 * PDF Deletion Handler
 * Securely deletes PDF files from the server along with HTML and OGP images
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'POST method required');
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if ($data === null || !isset($data['filename']) || !isset($data['id'])) {
    respond(false, 'Missing required data: filename or id');
}

$filename = $data['filename'];
$pdfId = preg_replace('/[^a-zA-Z0-9_\-]/', '', $data['id']); // Sanitize ID

// Security: Prevent directory traversal (e.g. ../../)
if (strpos($filename, '..') !== false || strpos($filename, '/') !== false) {
    respond(false, 'Invalid filename format');
}

$pdfPath = __DIR__ . '/ComicPDF/' . $filename;
$htmlPath = __DIR__ . '/' . $pdfId . '.html';
$ogpPath = __DIR__ . '/ogp/' . $pdfId . '.png';

$deletedFiles = [];
$errors = [];

// 1. Delete the PDF file
if (file_exists($pdfPath)) {
    if (unlink($pdfPath)) {
        $deletedFiles[] = 'PDF';
    }
    else {
        $errors[] = 'Failed to delete PDF file';
    }
}
else {
// If not found, not an error, just means it's already gone
}

// 2. Delete the generated HTML sharing file
if (file_exists($htmlPath)) {
    if (unlink($htmlPath)) {
        $deletedFiles[] = 'HTML';
    }
    else {
        $errors[] = 'Failed to delete HTML file';
    }
}

// 3. Delete the OGP image
if (file_exists($ogpPath)) {
    if (unlink($ogpPath)) {
        $deletedFiles[] = 'OGP Image';
    }
    else {
        $errors[] = 'Failed to delete OGP image';
    }
}

if (empty($errors)) {
    respond(true, 'Files permanently deleted', ['deleted' => $deletedFiles]);
}
else {
    // Return success=true even on partial failure so 'data.json' update isn't blocked, 
    // but log the errors
    respond(true, 'Partially deleted with some errors', ['errors' => $errors]);
}
?>