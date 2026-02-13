/**
 * OGP画像自動生成スクリプト
 * 
 * 使い方: 
 * 1. npm install canvas pdfjs-dist
 * 2. node generate-ogp-images.js
 */

const fs = require('fs');
const path = require('path');

// PDF List
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

const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;

async function main() {
    console.log('=== OGP画像自動生成スクリプト ===\n');

    // Dynamically import pdfjs-dist (ES module)
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const { createCanvas } = await import('canvas');

    // Create ogp directory
    const ogpDir = path.join(__dirname, 'ogp');
    if (!fs.existsSync(ogpDir)) {
        fs.mkdirSync(ogpDir, { recursive: true });
    }

    for (const pdf of PDF_LIST) {
        console.log(`Processing: ${pdf.title}...`);

        const pdfPath = path.join(__dirname, 'ComicPDF', pdf.filename);

        if (!fs.existsSync(pdfPath)) {
            console.log(`  ⚠️ File not found: ${pdf.filename}`);
            continue;
        }

        try {
            // Load PDF
            const data = new Uint8Array(fs.readFileSync(pdfPath));
            const doc = await pdfjsLib.getDocument({ data }).promise;
            const page = await doc.getPage(pdf.ogpPage || 1);

            // Calculate scale to fit OGP dimensions
            const defaultViewport = page.getViewport({ scale: 1 });
            const scale = Math.min(OGP_WIDTH / defaultViewport.width, OGP_HEIGHT / defaultViewport.height);
            const viewport = page.getViewport({ scale });

            // Create canvas
            const canvas = createCanvas(OGP_WIDTH, OGP_HEIGHT);
            const ctx = canvas.getContext('2d');

            // Fill background
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, OGP_WIDTH, OGP_HEIGHT);

            // Center the PDF page
            const offsetX = (OGP_WIDTH - viewport.width) / 2;
            const offsetY = (OGP_HEIGHT - viewport.height) / 2;

            ctx.translate(offsetX, offsetY);

            // Render PDF page
            await page.render({
                canvasContext: ctx,
                viewport: viewport
            }).promise;

            // Save as PNG
            const outputPath = path.join(ogpDir, `${pdf.id}.png`);
            const buffer = canvas.toBuffer('image/png');
            fs.writeFileSync(outputPath, buffer);

            console.log(`  ✅ Generated: ogp/${pdf.id}.png`);

        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    }

    console.log('\n=== 完了 ===');
    console.log('ogp/ フォルダ内の画像をサーバーにアップロードしてください。');
}

main().catch(console.error);
