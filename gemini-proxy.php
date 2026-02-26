<?php
/**
 * Gemini API Proxy
 * Forwards requests to the Gemini API without exposing the API key to the client.
 */

// CORS headers
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'POST method required']);
    exit;
}

// Load API key from config
$configFile = __DIR__ . '/config.php';
if (!file_exists($configFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Server configuration missing']);
    exit;
}

require_once $configFile;

if (empty($GEMINI_API_KEY)) {
    http_response_code(500);
    echo json_encode(['error' => 'API key not configured']);
    exit;
}

// Get and validate request body
$input = file_get_contents('php://input');
$requestData = json_decode($input, true);

if ($requestData === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON request']);
    exit;
}

// Forward request to Gemini API
$model = 'gemini-2.0-flash';
$apiUrl = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$GEMINI_API_KEY}";

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $input,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

if ($curlError) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to connect to AI service']);
    exit;
}

// Forward the response as-is
http_response_code($httpCode);
echo $response;
?>