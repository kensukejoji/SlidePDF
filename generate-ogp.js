/**
 * OGP画像とHTMLページ生成スクリプト
 * 
 * 使い方: node generate-ogp.js
 * 
 * 必要なパッケージ:
 * npm install canvas pdfjs-dist
 */

const fs = require('fs');
const path = require('path');

// PDF List (same as in app.js)
const PDF_LIST = [
    { id: 'pdf1', filename: 'A_竹＿大人女子＿補助金戦略.pdf', title: '大人女子 補助金戦略', ogpPage: 1 },
    { id: 'pdf2', filename: 'B_竹コトー補助金_医療教育の突破口.pdf', title: '竹コトー補助金 医療教育の突破口', ogpPage: 1 },
    { id: 'pdf3', filename: 'D_竹＿絶望の戦場.pdf', title: '絶望の戦場', ogpPage: 1 },
    { id: 'pdf4', filename: 'F_竹＿冒険.pdf', title: '冒険', ogpPage: 1 },
    { id: 'pdf5', filename: '人財消失事件の謎.pdf', title: '人財消失事件の謎', ogpPage: 1 },
    { id: 'pdf6', filename: '全院教育DXパッケージ（松プラン）提案書.pdf', title: '全院教育DXパッケージ（松プラン）', ogpPage: 1 },
    { id: 'pdf7', filename: '新人・研修医特化型_教育DXパッケージ「竹プラン」提案書.pdf', title: '新人・研修医特化型 教育DXパッケージ「竹プラン」', ogpPage: 1 },
    { id: 'pdf8', filename: '現場知を未来の標準へ.pdf', title: '現場知を未来の標準へ', ogpPage: 1 },
    { id: 'pdf9', filename: '竹＿経験が自信を変える.pdf', title: '経験が自信を変える', ogpPage: 1 },
    { id: 'pdf10', filename: '部門特化型_教育DXパッケージ「梅プラン」提案書.pdf', title: '部門特化型 教育DXパッケージ「梅プラン」', ogpPage: 1 }
];

const BASE_URL = 'https://jollygood.co.jp/slide';
const OUTPUT_DIR = path.join(__dirname, 'ogp');
const SLIDES_DIR = __dirname;

// Create HTML template for each PDF
function generateHTML(pdf) {
    return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(pdf.title)} | JOLLYGOOD+ スライドライブラリ</title>
    
    <!-- OGP Tags -->
    <meta property="og:title" content="${escapeHtml(pdf.title)}">
    <meta property="og:description" content="JOLLYGOOD+ スライドライブラリでVR医療教育の資料をご覧ください">
    <meta property="og:type" content="article">
    <meta property="og:url" content="${BASE_URL}/${pdf.id}.html">
    <meta property="og:image" content="${BASE_URL}/ogp/${pdf.id}.png">
    <meta property="og:site_name" content="JOLLYGOOD+">
    <meta property="og:locale" content="ja_JP">
    
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(pdf.title)}">
    <meta name="twitter:description" content="JOLLYGOOD+ スライドライブラリでVR医療教育の資料をご覧ください">
    <meta name="twitter:image" content="${BASE_URL}/ogp/${pdf.id}.png">
    
    <!-- Redirect to main page with hash -->
    <meta http-equiv="refresh" content="0; url=index.html#pdf=${pdf.id}">
    <link rel="canonical" href="${BASE_URL}/${pdf.id}.html">
    
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
        window.location.href = 'index.html#pdf=${pdf.id}';
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Generate HTML files
function generateHTMLFiles() {
    console.log('Generating HTML files...');

    for (const pdf of PDF_LIST) {
        const html = generateHTML(pdf);
        const filePath = path.join(SLIDES_DIR, `${pdf.id}.html`);
        fs.writeFileSync(filePath, html, 'utf8');
        console.log(`  Created: ${pdf.id}.html`);
    }

    console.log('HTML files generated successfully!');
}

// Create ogp directory
function createOgpDirectory() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        console.log('Created ogp/ directory');
    }
}

// Main
async function main() {
    console.log('=== OGP Generator for JOLLYGOOD+ Slide Library ===\n');

    createOgpDirectory();
    generateHTMLFiles();

    console.log('\n=== Next Steps ===');
    console.log('1. OGP images need to be generated from PDF pages.');
    console.log('   For now, please manually save the first page of each PDF as:');
    console.log('   - ogp/pdf1.png');
    console.log('   - ogp/pdf2.png');
    console.log('   ... etc');
    console.log('\n2. Upload all files to the server:');
    console.log('   - pdf1.html, pdf2.html, ... pdf10.html');
    console.log('   - ogp/ folder with PNG images');
    console.log('\n3. Test with Facebook/Twitter debugger:');
    console.log(`   - ${BASE_URL}/pdf1.html`);
}

main().catch(console.error);
