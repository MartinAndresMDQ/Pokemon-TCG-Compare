// server.js
import express from 'express';
// Usamos @cloudflare/puppeteer, una versión de Puppeteer diseñada para evitar la detección de Cloudflare.
import puppeteer from '@cloudflare/puppeteer';
const app = express();
const port = 3001; // Un puerto diferente al de tu app de Vite

const POKE_API_URL = 'https://www.pokemon-zone.com/api';

// Middleware para parsear JSON en las peticiones
app.use(express.json());

/**
 * Obtiene el contenido de una URL protegida por Cloudflare usando Puppeteer.
 * @param {string} url La URL a la que acceder.
 * @returns {Promise<string>} El cuerpo de la respuesta como texto.
 */
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

// Ruta para buscar cartas
app.get('/api/search-cards', async (req, res) => {
  const { q } = req.query; // Obtener el query param 'q' de la URL

  if (!q) {
    return res.status(400).json({ error: 'El parámetro de búsqueda "q" es requerido.' });
  }

  const url = `${POKE_API_URL}/cards/search/?q=${q}`;

  try {
    console.log(`Haciendo proxy de la petición a: ${url}`);
    const responseBody = await fetchWithPuppeteer(url);
    const data = JSON.parse(responseBody);
    res.json(data);
  } catch (error) {
    console.error(`Error al hacer la petición con Puppeteer para la query "${q}":`, error);
    res.status(500).json({ error: 'Error al contactar la API externa.', details: error.message });
  }
});

// Ruta para obtener un jugador
app.get('/api/players/:playerId', async (req, res) => {
    const { playerId } = req.params;
    const url = `${POKE_API_URL}/players/${playerId}/`;

    try {
        console.log(`Haciendo proxy de la petición a: ${url}`);
        const responseBody = await fetchWithPuppeteer(url);
        const data = JSON.parse(responseBody);
        res.json(data);
    } catch (error) {
        console.error(`Error al obtener el jugador con ID "${playerId}":`, error);
        res.status(500).json({ error: 'Error al contactar la API externa.', details: error.message });
    }
});


app.listen(port, () => {
  console.log(`Servidor proxy escuchando en http://localhost:${port}`);
});
