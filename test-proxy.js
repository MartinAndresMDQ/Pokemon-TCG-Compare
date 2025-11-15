// Script de prueba para verificar si la petición funciona directamente desde Node.js
const https = require('https');

const options = {
  hostname: 'www.pokemon-zone.com',
  port: 443,
  path: '/api/cards/search/?q=sv06',
  method: 'GET',
  headers: {
    'Host': 'www.pokemon-zone.com',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6,pt;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Cache-Control': 'max-age=0',
    'Referer': 'https://www.pokemon-zone.com/',
    'Origin': 'https://www.pokemon-zone.com',
    'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'none',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'Connection': 'keep-alive',
  },
};

console.log('Probando petición directa a pokemon-zone.com...');
console.log('URL: https://www.pokemon-zone.com/api/cards/search/?q=sv06');
console.log('Headers:', options.headers);

const req = https.request(options, (res) => {
  console.log(`\n=== Respuesta ===`);
  console.log(`Status: ${res.statusCode} ${res.statusMessage}`);
  console.log('Headers de respuesta:', res.headers);
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode === 200) {
      console.log('\n✅ Petición exitosa!');
      try {
        const json = JSON.parse(data);
        console.log(`Total de resultados: ${json.data?.results?.length || 0}`);
      } catch (e) {
        console.log('Respuesta (primeros 200 caracteres):', data.substring(0, 200));
      }
    } else {
      console.log('\n❌ Petición falló');
      console.log('Respuesta (primeros 500 caracteres):', data.substring(0, 500));
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();

