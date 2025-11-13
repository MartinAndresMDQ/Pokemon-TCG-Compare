import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

// Aplicamos el plugin de sigilo para que Puppeteer sea menos detectable
puppeteer.use(StealthPlugin());

const POKE_API_URL = 'https://www.pokemon-zone.com/api';

// La lógica de Puppeteer puede vivir aquí o en un archivo compartido.

async function fetchWithPuppeteer(url) {
  // ... (Copia aquí la función fetchWithPuppeteer completa de tu server.js)
  let browser = null;
  try {
    console.log('Lanzando navegador Puppeteer...');
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
      ignoreHTTPSErrors: true,
    });
    const page = await browser.newPage();
    console.log(`Navegando a: ${url}`);
    const response = await page.goto(url, { waitUntil: 'networkidle2' });
    if (response.ok() && response.headers()['content-type']?.includes('application/json')) {
        return await response.text();
    }
    const pageContent = await page.content();
    console.error('El contenido de la página no era JSON. Contenido recibido:', pageContent.substring(0, 500));
    throw new Error(`No se pudo obtener una respuesta JSON válida. Status: ${response.status()}`);
  } finally {
    if (browser) await browser.close();
  }
}

// La función que Vercel ejecutará
export default async function handler(req, res) {
  // Permitir peticiones de cualquier origen (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'El parámetro de búsqueda "q" es requerido.' });
  }

  const url = `${POKE_API_URL}/cards/search/?q=${q}`;

  try {
    const responseBody = await fetchWithPuppeteer(url);
    const data = JSON.parse(responseBody);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(data);
  } catch (error) {
    console.error(`Error en la serverless function para la query "${q}":`, error);
    return res.status(500).json({ error: 'Error al contactar la API externa.', details: error.message });
  }
}
