import puppeteer from '@cloudflare/puppeteer';

const POKE_API_URL = 'https://www.pokemon-zone.com/api';

async function fetchWithPuppeteer(url) {
  let browser = null;
  try {
    console.log('Lanzando navegador Puppeteer...');
    browser = await puppeteer.launch({ headless: true }); // headless: true para correr en servidor sin UI
    const page = await browser.newPage();
    
    console.log(`Navegando a: ${url}`);
    // Usamos 'networkidle2' para esperar a que la actividad de red se calme.
    // Esto es más robusto para páginas con muchos scripts como las de Cloudflare.
    const response = await page.goto(url, { waitUntil: 'networkidle2' });

    // Si la respuesta es OK y el tipo de contenido es JSON, podemos obtener el texto.
    if (response.ok() && response.headers()['content-type']?.includes('application/json')) {
        return await response.text();
    }

    // Si llegamos aquí, algo falló. Para depurar, podemos ver el contenido de la página.
    const pageContent = await page.content();
    console.error('El contenido de la página no era JSON. Contenido recibido:', pageContent.substring(0, 500));

    // Lanzamos el error como antes.
    throw new Error(`No se pudo obtener una respuesta JSON válida. Status: ${response.status()}`);
  } finally {
    if (browser) await browser.close();
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { playerId } = req.query; // Vercel pone los parámetros dinámicos en req.query
  const url = `${POKE_API_URL}/players/${playerId}/`;

  try {
    const responseBody = await fetchWithPuppeteer(url);
    const data = JSON.parse(responseBody);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error(`Error en la serverless function para el player ID "${playerId}":`, error);
    return res.status(500).json({ error: 'Error al contactar la API externa.', details: error.message });
  }
}