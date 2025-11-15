// Servidor proxy usando Puppeteer para evitar bloqueos de Cloudflare
const http = require('http');
const { URL } = require('url');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Usar el plugin stealth para evitar detección
puppeteer.use(StealthPlugin());

const PORT = 3001;
let browser = null;

const server = http.createServer(async (req, res) => {
  // Solo permitir peticiones GET
  if (req.method !== 'GET') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // Parsear la URL
  const url = new URL(req.url, `http://${req.headers.host}`);
  const targetPath = url.pathname + url.search;

  // Construir la URL completa del destino
  const targetUrl = `https://www.pokemon-zone.com${targetPath}`;

  console.log(`\n=== Nueva petición ===`);
  console.log(`Proxying: ${targetPath} -> ${targetUrl}`);

  try {
    // Intentar usar Puppeteer primero
    let content = null;
    let statusCode = 200;
    
    try {
      // Inicializar el navegador si no está inicializado
      if (!browser) {
        console.log('Inicializando navegador Puppeteer...');
        browser = await puppeteer.launch({
          headless: 'new',
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        });
      }

      // Crear una nueva página
      const page = await browser.newPage();
      
      // Configurar viewport y user agent
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
      
      // Eliminar la propiedad webdriver para evitar detección
      await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
          get: () => undefined,
        });
      });
      
      // Configurar headers del navegador
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });

      // Variable para almacenar la respuesta JSON
      let responseData = null;
      
      // Interceptar respuestas para capturar el JSON
      page.on('response', async (response) => {
        if (response.url() === targetUrl && response.status() === 200) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              responseData = await response.json();
            }
          } catch (e) {
            console.log('Error al parsear JSON de la respuesta:', e.message);
          }
        }
      });

      // Esperar un poco antes de hacer la petición
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Realizar la petición
      const response = await page.goto(targetUrl, {
        waitUntil: 'networkidle0',
        timeout: 60000
      });

      statusCode = response.status();
      
      if (statusCode === 200) {
        // Esperar un poco más para que Cloudflare complete cualquier challenge
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Si tenemos el JSON de la respuesta interceptada, usarlo
        if (responseData) {
          content = JSON.stringify(responseData);
          console.log(`✅ Respuesta exitosa desde API (JSON interceptado): ${statusCode}`);
        } else {
          // Intentar obtener el contenido de la respuesta directamente
          try {
            content = await response.text();
            // Intentar parsear como JSON
            try {
              const parsed = JSON.parse(content);
              content = JSON.stringify(parsed);
            } catch (e) {
              // Si no es JSON, intentar obtener del body de la página
              const bodyText = await page.evaluate(() => document.body.innerText);
              try {
                const parsed = JSON.parse(bodyText);
                content = JSON.stringify(parsed);
              } catch (e2) {
                // Si todo falla, usar el contenido tal cual
                console.log('No se pudo parsear como JSON, usando contenido tal cual');
              }
            }
            console.log(`✅ Respuesta exitosa desde API: ${statusCode}`);
          } catch (e) {
            throw new Error(`Error al obtener contenido: ${e.message}`);
          }
        }
      } else {
        throw new Error(`API returned ${statusCode}`);
      }

      // Cerrar la página
      await page.close();

    } catch (puppeteerError) {
      console.error(`Error con Puppeteer: ${puppeteerError.message}`);
      throw puppeteerError;
    }

    // Enviar respuesta
    res.writeHead(statusCode, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });

    res.end(content);

  } catch (error) {
    console.error('Error en proxy:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Servidor proxy ejecutándose en http://localhost:${PORT}`);
  console.log(`Usa este servidor como proxy para las peticiones a pokemon-zone.com`);
  console.log(`Usando Puppeteer para evitar bloqueos de Cloudflare...`);
});

// Cerrar el navegador al cerrar el servidor
process.on('SIGINT', async () => {
  console.log('\nCerrando navegador...');
  if (browser) {
    await browser.close();
  }
  process.exit();
});

