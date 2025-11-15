// Cloudflare Worker para hacer de proxy y evitar CORS/Cloudflare
// Usa @cloudflare/puppeteer para evitar bloqueos de Cloudflare
import puppeteer from '@cloudflare/puppeteer';

export default {
  async fetch(request, env, ctx) {
    // Manejar CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Solo permitir peticiones GET
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Obtener la URL de la petición
    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    const queryParams = new URLSearchParams(url.searchParams);
    queryParams.delete('path');

    if (!path) {
      return new Response(JSON.stringify({ error: 'Path parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Construir la URL completa del destino
    const queryString = queryParams.toString();
    const targetUrl = `https://www.pokemon-zone.com/api/${path}${queryString ? '?' + queryString : ''}`;

    console.log(`Proxying to: ${targetUrl}`);

    try {
      // Verificar que el Browser Binding esté configurado
      if (!env.BROWSER) {
        throw new Error('Browser binding no está configurado. Configúralo en el dashboard de Cloudflare.');
      }

      // Usar Puppeteer de Cloudflare para evitar bloqueos
      const browser = await puppeteer.launch(env.BROWSER);
      const page = await browser.newPage();

      // Configurar headers para evitar detección
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36');
      await page.setExtraHTTPHeaders({
        'Accept-Language': 'es-US,es;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'application/json, text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      });

      // Variable para almacenar la respuesta JSON
      let responseData = null;

      // Interceptar respuestas
      page.on('response', async (response) => {
        if (response.url() === targetUrl && response.status() === 200) {
          try {
            const contentType = response.headers()['content-type'] || '';
            if (contentType.includes('application/json')) {
              responseData = await response.json();
            }
          } catch (e) {
            console.log('Error al parsear JSON:', e.message);
          }
        }
      });

      // Realizar la petición
      const response = await page.goto(targetUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
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
        return new Response(content, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        });
      } else {
        await page.close();
        await browser.close();
        throw new Error(`API returned ${statusCode}`);
      }
    } catch (error) {
      console.error('Error en worker:', error);

      return new Response(
        JSON.stringify({
          error: 'Proxy error',
          message: error.message,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }
  },
};

