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
    // Intentar múltiples estrategias para evitar Cloudflare
    // Estrategia 1: Petición directa con headers optimizados
    let response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7,es-419;q=0.6,pt;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Referer': 'https://www.pokemon-zone.com/',
        'Origin': 'https://www.pokemon-zone.com',
        'Cache-Control': 'max-age=0',
        'Sec-CH-UA': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Connection': 'keep-alive',
        'DNT': '1',
      },
      redirect: 'follow',
    });

    // Si recibimos 403, intentar con un servicio de proxy CORS público
    if (response.status === 403) {
      console.log('Primera petición bloqueada, intentando con proxy CORS alternativo...');
      
      // Intentar con un servicio de proxy CORS público (AllOrigins)
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`;
      const proxyResponse = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (proxyResponse.ok) {
        const proxyData = await proxyResponse.json();
        const content = proxyData.contents;
        
        try {
          const data = JSON.parse(content);
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).json(data);
        } catch (e) {
          // Si el contenido no es JSON válido, continuar con el error original
          console.log('Proxy CORS no devolvió JSON válido');
        }
      }
    }

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

