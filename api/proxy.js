// Función serverless de Vercel para hacer de proxy y evitar CORS
// Usa Puppeteer con Chromium optimizado para Vercel para evitar bloqueos de Cloudflare
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

module.exports = async function handler(req, res) {
  // Manejar preflight CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Solo permitir peticiones GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Obtener la ruta de la query string
  let path = req.query.path;
  let queryParams = { ...req.query };
  delete queryParams.path;
  
  // Si no hay path en query, intentar obtenerlo de la URL
  if (!path && req.url) {
    const urlParts = req.url.split('?');
    const pathPart = urlParts[0];
    if (pathPart.startsWith('/api/')) {
      path = pathPart.replace('/api/', '');
    }
  }
  
  if (!path) {
    return res.status(400).json({ error: 'Path parameter is required', query: req.query, url: req.url });
  }

  // Construir la URL completa
  const queryString = new URLSearchParams(queryParams).toString();
  const pathStr = Array.isArray(path) ? path.join('/') : path;
  const targetUrl = `https://www.pokemon-zone.com/api/${pathStr}${queryString ? '?' + queryString : ''}`;

  console.log(`Proxying to: ${targetUrl}`);

  let browser = null;
  
  try {
    // Inicializar el navegador con Chromium optimizado para Vercel
    browser = await puppeteer.launch({
      args: [
        ...chromium.args,
        '--hide-scrollbars',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    
    // Configurar headers y user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
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

    // Realizar la petición
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    const statusCode = response.status();
    
    if (statusCode === 200) {
      // Esperar un poco para que Cloudflare complete cualquier challenge
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      let content;
      
      if (responseData) {
        content = JSON.stringify(responseData);
      } else {
        try {
          content = await response.text();
          // Intentar parsear como JSON
          try {
            const parsed = JSON.parse(content);
            content = JSON.stringify(parsed);
          } catch (e) {
            // Si no es JSON, intentar obtener del body
            const bodyText = await page.evaluate(() => document.body.innerText);
            try {
              const parsed = JSON.parse(bodyText);
              content = JSON.stringify(parsed);
            } catch (e2) {
              throw new Error('Response is not valid JSON');
            }
          }
        } catch (e) {
          throw new Error(`Error al obtener contenido: ${e.message}`);
        }
      }

      await page.close();
      await browser.close();

      // Enviar respuesta con CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).send(content);
      
    } else {
      await page.close();
      await browser.close();
      throw new Error(`API returned ${statusCode}`);
    }

  } catch (error) {
    console.error('Error en proxy:', error);
    if (browser) {
      await browser.close();
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}

