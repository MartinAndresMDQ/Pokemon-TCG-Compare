// En desarrollo, usamos el servidor proxy local (http://localhost:3001)
// En producción, usamos el Cloudflare Worker
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  // En producción, usar el Cloudflare Worker
  return 'https://pokemon-tcg-proxy.martinandres987.workers.dev';
};

// Headers básicos - el servidor proxy maneja los headers complejos
const getHeaders = () => ({
  'Accept': 'application/json',
});

/**
 * Realiza una búsqueda de cartas en la API.
 * @param {string} query - El término de búsqueda.
 * @returns {Promise<Object>} - Los resultados de la búsqueda.
 */
export const searchCards = async (query) => {
  const baseUrl = getApiBaseUrl();
  // En desarrollo, usar la ruta completa: /api/cards/search/?q=...
  // En producción (Cloudflare Worker), usar el parámetro path: ?path=cards/search&q=...
  const url = import.meta.env.DEV 
    ? `${baseUrl}/cards/search/`
    : `${baseUrl}?path=cards/search`;
    
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Error al buscar cartas: ${response.statusText}`);
  }
  
  return response.json();
};

/**
 * Obtiene los datos de un jugador específico por su ID.
 * @param {string} playerId - El ID del jugador.
 * @returns {Promise<Object>} - Los datos del jugador.
 */
export const getPlayer = async (playerId) => {
  const baseUrl = getApiBaseUrl();
  // En desarrollo, usar la ruta completa: /api/players/ID/
  // En producción (Cloudflare Worker), usar el parámetro path: ?path=players/ID
  const url = import.meta.env.DEV
    ? `${baseUrl}/players/${playerId}/`
    : `${baseUrl}?path=players/${playerId}`;
    
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Error al obtener datos del jugador: ${response.statusText}`);
  }
  
  return response.json();
};
