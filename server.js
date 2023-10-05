const express = require('express')
const puppeteer = require('puppeteer')
const app = express()

app.use('/export/html', express.static(__dirname + '/public'));

app.get('/export/pdf', (req, res) => {
    (async () => {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.goto('http://localhost:3000/export/html')
        const buffer = await page.pdf(
            {format: 'A4', 
            landscape: false, 
            printBackground: true})
        res.type('application/pdf')
        res.send(buffer)
        browser.close()
    })()
})
app.listen(3000)
