/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const https = require('https');

// We need the raw WOFF2 URLs from Google Fonts. 
// We can fetch the CSS and then extract the WOFF2 URLs.
const getCss = (url) => new Promise((resolve, reject) => {
  https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36' } }, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => resolve(data));
  }).on('error', reject);
});

const getBase64 = (url) => new Promise((resolve, reject) => {
  https.get(url, (res) => {
    const chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer.toString('base64'));
    });
  }).on('error', reject);
});

async function main() {
  const cssUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@400;600;700&family=Orbitron:wght@600;800&display=swap';
  console.log('Fetching CSS from Google Fonts...');
  const css = await getCss(cssUrl);
  
  // Extract woff2 urls
  const fontFaces = css.split('@font-face');
  let embeddedCss = '';

  for (let i = 1; i < fontFaces.length; i++) {
    const block = fontFaces[i];
    const urlMatch = block.match(/url\((https:\/\/[^)]+\.woff2)\)/);
    if (urlMatch) {
      const woff2Url = urlMatch[1];
      console.log(`Downloading font: ${woff2Url}`);
      const base64 = await getBase64(woff2Url);
      
      const newBlock = '@font-face' + block.replace(urlMatch[0], `url(data:font/woff2;base64,${base64}) format('woff2')`);
      embeddedCss += newBlock;
    }
  }

  const svgPath = '/Users/edycu/Projects/Hackathon/Turena/docs/readme_hero.svg';
  let svg = fs.readFileSync(svgPath, 'utf8');
  
  // Replace the import
  const importRegex = /@import url\('https:\/\/fonts\.googleapis\.com[^']+'\);/;
  svg = svg.replace(importRegex, embeddedCss);
  
  fs.writeFileSync(svgPath, svg);
  console.log('Done! SVG now has embedded base64 fonts.');
}

main();
