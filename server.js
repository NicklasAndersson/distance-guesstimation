const express = require('express')
const puppeteer = require('puppeteer')
const app = express()

app.use(express.static(__dirname + '/public'));

app.get('/export/pdf', async (req, res) => {
    console.log("/export/pdf – generating…");
    let browser;
    try {
        browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.goto('http://localhost:3000/', { waitUntil: 'load' });
        // Wait for JS rendering
        await new Promise(r => setTimeout(r, 2000));
        const buffer = await page.pdf({
            format: 'A4',
            landscape: false,
            printBackground: true,
        });
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="cards.pdf"',
        });
        res.send(buffer);
        console.log("/export/pdf – done");
    } catch (err) {
        console.error("/export/pdf – error:", err);
        res.status(500).send('PDF generation failed');
    } finally {
        if (browser) await browser.close();
    }
});

const server = app.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});