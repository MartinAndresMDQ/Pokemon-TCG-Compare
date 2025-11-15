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
      // Intentar usar Puppeteer si está disponible y no hay rate limit
      let usePuppeteer = false;
      if (env.BROWSER) {
        try {
          // Usar Puppeteer de Cloudflare para evitar bloqueos
          const browser = await puppeteer.launch(env.BROWSER);
          const page = await browser.newPage();
          usePuppeteer = true;

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
            const responseStatus = typeof response.status === 'function' ? response.status() : response.status;
            if (response.url() === targetUrl && responseStatus === 200) {
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

          // En Puppeteer, response.status() es un método
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
        } catch (puppeteerError) {
          // Si hay rate limit o error con Puppeteer, usar fetch como fallback
          console.log('Puppeteer no disponible o rate limit, usando fetch:', puppeteerError.message);
          usePuppeteer = false;
        }
      }

      // Fallback: usar fetch directo con headers optimizados
      if (!usePuppeteer) {
        console.log('Usando fetch directo como fallback...');
        const response = await fetch(targetUrl, {
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

        // En fetch, response.status es una propiedad, no un método
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
                throw new Error('Cloudflare está bloqueando la petición. El Browser Binding tiene rate limit excedido.');
              }
              throw new Error('Response is not valid JSON');
            }
          }

          // Enviar respuesta con CORS
          return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            },
          });
        } else {
          const errorText = await response.text();
          console.error(`API returned ${statusCode}:`, errorText.substring(0, 200));

          // Si es un 403, es probablemente Cloudflare
          if (statusCode === 403) {
            return new Response(
              JSON.stringify({
                error: 'Cloudflare bloqueo',
                message: 'El servidor está bloqueando las peticiones. El Browser Binding tiene rate limit excedido.',
                statusCode: 403,
              }),
              {
                status: 403,
                headers: {
                  'Content-Type': 'application/json',
                  'Access-Control-Allow-Origin': '*',
                },
              }
            );
          } else {
            throw new Error(`API returned ${statusCode}`);
          }
        }
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

