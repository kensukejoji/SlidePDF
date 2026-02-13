/**
 * OGP画像自動生成スクリプト (シンプル版)
 * 
 * localhost:3456 の既存ビューアを使用してスクリーンショットを撮影
 * 
 * 使い方: node generate-ogp-simple.js
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const PDF_LIST = [
    { id: 'pdf1', title: '大人女子 補助金戦略' },
    { id: 'pdf2', title: '竹コトー補助金 医療教育の突破口' },
    { id: 'pdf3', title: '絶望の戦場' },
    { id: 'pdf4', title: '冒険' },
    { id: 'pdf5', title: '人財消失事件の謎' },
    { id: 'pdf6', title: '全院教育DXパッケージ（松プラン）' },
    { id: 'pdf7', title: '新人・研修医特化型 教育DXパッケージ「竹プラン」' },
    { id: 'pdf8', title: '現場知を未来の標準へ' },
    { id: 'pdf9', title: '経験が自信を変える' },
    { id: 'pdf10', title: '部門特化型 教育DXパッケージ「梅プラン」' }
];

const OGP_WIDTH = 1200;
const OGP_HEIGHT = 630;
const BASE_URL = 'http://localhost:3456';

async function main() {
    console.log('=== OGP画像自動生成スクリプト (シンプル版) ===\n');
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

            // Navigate to the viewer with the PDF
            const url = `${BASE_URL}/#pdf=${pdf.id}`;
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });

            // Wait for the PDF canvas to be rendered
            await page.waitForSelector('#pdfCanvas', { timeout: 30000 });

            // Wait a bit more for the PDF to fully render
            await new Promise(resolve => setTimeout(resolve, 3000));

            // Get the canvas element and take a screenshot of just the canvas area
            const canvasElement = await page.$('.canvas-wrapper');

            if (canvasElement) {
                const outputPath = path.join(ogpDir, `${pdf.id}.png`);

                // Take screenshot of the full viewport but crop to OGP size
                await page.screenshot({
                    path: outputPath,
                    type: 'png',
                    clip: {
                        x: 0,
                        y: 0,
                        width: OGP_WIDTH,
                        height: OGP_HEIGHT
                    }
                });

                console.log(`  ✅ Generated: ogp/${pdf.id}.png`);
            } else {
                console.log(`  ⚠️ Canvas not found`);
            }

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
