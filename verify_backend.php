<?php
// Test script for save-data.php

$url = 'http://localhost/save-data.php'; // Not used, we'll test logic directly or use CLI simulation if possible, but actually we can just include the file or emulate POST

// Since we can't easily curl localhost in this env without running a server, 
// let's just write a small tester that mimics the logic of save-data.php locally to ensure file permissions and locking work,
// OR just try to run save-data.php via CLI if adapted. 
// Standard save-data.php expects POST input. Let's mock it.

$_SERVER['REQUEST_METHOD'] = 'POST';
$inputFile = 'php://stdin';

// We'll write to a temp file first to test locking logic if we were strictly testing that, 
// but for now let's just verify we can write to data.json

$data = [
    ['id' => 'test_123', 'title' => 'Test PDF']
];

$json = json_encode($data);

// We can't easily mocking php://input for a CLI run of the actual script without pipes.
// Let's just create a small independent test that does the exact same file operations to verify permissions.

$dataFile = 'data.json';
echo "Checking data.json...\n";

if (!file_exists($dataFile)) {
    echo "data.json does not exist (it should).\n";
    exit(1);
}

if (!is_writable($dataFile)) {
    echo "data.json is not writable.\n";
    exit(1);
}

echo "data.json is writable.\n";

// Test Lock acquisition
$fp = fopen($dataFile, 'r+');
if (flock($fp, LOCK_EX)) {
    echo "Lock acquired successfully.\n";
    flock($fp, LOCK_UN);
} else {
    echo "Could not acquire lock.\n";
}
fclose($fp);

echo "Verification complete.\n";
?>