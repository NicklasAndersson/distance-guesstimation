const express = require('express')
const puppeteer = require('puppeteer')
const app = express()


app.use('/export/html', express.static(__dirname + '/public'));

app.get('/export/pdf', (req, res) => {
    (async () => {
        console.log("/export/pdf");
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.goto('http://localhost:3000/export/html', {waitUntil: "load"})
        console.log("pageload");
        await new Promise(r => setTimeout(r, 2000));
        const buffer = await page.pdf(
            {format: 'A4', 
            landscape: false, 
            printBackground: true})
        res.type('application/pdf')
        res.send(buffer)
        browser.close()
        console.log("done");
    })()
})

const server = app.listen(3000);