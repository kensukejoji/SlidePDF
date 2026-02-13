<?php
/**
 * OGP画像保存API
 * 
 * ブラウザからbase64エンコードされた画像データを受け取り、
 * ogp/フォルダに保存します。
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// POSTリクエストのみ許可
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// JSONデータを取得
$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['pdfId']) || !isset($data['imageData'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing pdfId or imageData']);
    exit;
}

$pdfId = preg_replace('/[^a-zA-Z0-9_-]/', '', $data['pdfId']); // サニタイズ
$imageData = $data['imageData'];

// base64データからプレフィックスを削除
if (strpos($imageData, 'data:image/png;base64,') === 0) {
    $imageData = substr($imageData, strlen('data:image/png;base64,'));
}

// base64デコード
$imageBytes = base64_decode($imageData);
if ($imageBytes === false) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid base64 data']);
    exit;
}

// ogpディレクトリ作成
$ogpDir = __DIR__ . '/ogp';
if (!is_dir($ogpDir)) {
    mkdir($ogpDir, 0755, true);
}

// ファイル保存
$filePath = $ogpDir . '/' . $pdfId . '.png';
$result = file_put_contents($filePath, $imageBytes);

if ($result === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save image']);
    exit;
}

// 成功レスポンス
echo json_encode([
    'success' => true,
    'path' => 'ogp/' . $pdfId . '.png',
    'size' => $result
]);
