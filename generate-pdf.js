#!/usr/bin/env node
// ── generate-pdf.js ─────────────────────────────────────────────────────────
// Starts the Express server, renders the page with Puppeteer, saves cards.pdf,
// and exits. The page loads public/card.json automatically as seed data.
//
// Usage:  node generate-pdf.js [output.pdf]

const fs = require('fs');
const path = require('path');
const express = require('express');
const puppeteer = require('puppeteer');

const outputPdf = path.resolve(process.argv[2] || 'cards.pdf');
const publicDir = path.join(__dirname, 'public');

async function main() {
    // 1. Start server
    const app = express();
    app.use(express.static(publicDir));
    const server = await new Promise(resolve => {
        const s = app.listen(0, () => resolve(s)); // random free port
    });
    const port = server.address().port;
    console.log(`Server listening on port ${port}`);

    // 2. Launch Puppeteer and generate PDF
    let browser;
    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
        });
        const page = await browser.newPage();
        await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
        // Give draw.js time to render after fetching card.json
        await new Promise(r => setTimeout(r, 1500));

        const buffer = await page.pdf({
            format: 'A4',
            landscape: false,
            printBackground: true,
        });

        fs.writeFileSync(outputPdf, buffer);
        console.log(`PDF written to ${outputPdf} (${(buffer.length / 1024).toFixed(0)} KB)`);
    } finally {
        if (browser) await browser.close();
        server.close();
    }
}

main().catch(err => {
    console.error('PDF generation failed:', err);
    process.exit(1);
});
