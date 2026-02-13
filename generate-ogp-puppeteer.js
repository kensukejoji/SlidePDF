/**
 * OGP画像自動生成スクリプト (Puppeteer版 - localhost使用)
 * 
 * 前提: npx serve -l 3456 . が実行中であること
 * 
 * 使い方: node generate-ogp-puppeteer.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

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
const BASE_URL = 'http://localhost:3456';

async function main() {
    console.log('=== OGP画像自動生成スクリプト ===\n');
    console.log('注意: localhost:3456 でサーバーが動作している必要があります\n');

    // Create ogp directory
    const ogpDir = path.join(__dirname, 'ogp');
    if (!fs.existsSync(ogpDir)) {
        fs.mkdirSync(ogpDir, { recursive: true });
    }

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    for (const pdf of PDF_LIST) {
        console.log(`Processing: ${pdf.title}...`);

        try {
            const page = await browser.newPage();
            await page.setViewport({ width: OGP_WIDTH, height: OGP_HEIGHT });

            const pdfUrl = `${BASE_URL}/ComicPDF/${encodeURIComponent(pdf.filename)}`;
            const ogpPage = pdf.ogpPage || 1;

            // Navigate to a page that will render the PDF
            const html = `
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
    <style>
        * { margin: 0; padding: 0; }
        body { 
            background: #0a0a0f; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            width: ${OGP_WIDTH}px; 
            height: ${OGP_HEIGHT}px; 
            overflow: hidden;
        }
        canvas { max-width: 100%; max-height: 100%; }
    </style>
</head>
<body>
    <canvas id="canvas"></canvas>
    <script>
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        
        async function render() {
            try {
                const doc = await pdfjsLib.getDocument('${pdfUrl}').promise;
                const page = await doc.getPage(${ogpPage});
                
                const viewport = page.getViewport({ scale: 1 });
                const scale = Math.min(${OGP_WIDTH} / viewport.width, ${OGP_HEIGHT} / viewport.height);
                const scaledViewport = page.getViewport({ scale });
                
                const canvas = document.getElementById('canvas');
                canvas.width = scaledViewport.width;
                canvas.height = scaledViewport.height;
                
                await page.render({
                    canvasContext: canvas.getContext('2d'),
                    viewport: scaledViewport
                }).promise;
                
                window.renderComplete = true;
            } catch (e) {
                console.error('Render error:', e);
                window.renderError = e.message;
            }
        }
        render();
    </script>
</body>
</html>`;

            await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

            // Wait for render to complete
            await page.waitForFunction(
                'window.renderComplete === true || window.renderError',
                { timeout: 60000 }
            );

            // Check for errors
            const error = await page.evaluate(() => window.renderError);
            if (error) {
                throw new Error(error);
            }

            await new Promise(resolve => setTimeout(resolve, 500)); // Extra time

            // Take screenshot
            const outputPath = path.join(ogpDir, `${pdf.id}.png`);
            await page.screenshot({ path: outputPath, type: 'png' });

            console.log(`  ✅ Generated: ogp/${pdf.id}.png`);
            await page.close();

        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
        }
    }

    await browser.close();

    console.log('\n=== 完了 ===');
    console.log('ogp/ フォルダ内の画像をサーバーにアップロードしてください。');
}

main().catch(console.error);
