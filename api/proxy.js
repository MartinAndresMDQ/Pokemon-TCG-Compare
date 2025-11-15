// Función serverless de Vercel para hacer de proxy y evitar CORS
// Nota: Puppeteer no funciona bien en Vercel debido a dependencias del sistema
// Usamos fetch directo con headers que simulan un navegador
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

  try {
    // Intentar usar un servicio de proxy CORS público como fallback
    // Primero intentamos directamente con headers mejorados
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.pokemon-zone.com/',
        'Origin': 'https://www.pokemon-zone.com',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    });

    const statusCode = response.status;
    
    if (statusCode === 200) {
      const contentType = response.headers.get('content-type') || '';
      let data;
      
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try {
          data = JSON.parse(text);
        } catch (e) {
          // Si Cloudflare devuelve HTML (challenge), devolver error informativo
          if (text.includes('Just a moment') || text.includes('challenge')) {
            throw new Error('Cloudflare está bloqueando la petición. Por favor, usa los archivos locales o contacta al administrador.');
          }
          throw new Error('Response is not valid JSON');
        }
      }

      // Enviar respuesta con CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');
      res.status(200).json(data);
      
    } else {
      const errorText = await response.text();
      console.error(`API returned ${statusCode}:`, errorText.substring(0, 200));
      
      // Si es un 403, es probablemente Cloudflare
      if (statusCode === 403) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.status(403).json({ 
          error: 'Cloudflare bloqueo', 
          message: 'El servidor está bloqueando las peticiones automatizadas. Por favor, usa los archivos locales o contacta al administrador.',
          statusCode: 403
        });
      } else {
        throw new Error(`API returned ${statusCode}`);
      }
    }

  } catch (error) {
    console.error('Error en proxy:', error);
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ 
      error: 'Proxy error', 
      message: error.message 
    });
  }
}

