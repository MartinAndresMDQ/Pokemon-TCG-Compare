// En desarrollo, usamos el servidor proxy local (http://localhost:3001)
// En producción, usamos la función serverless de Vercel
const getApiBaseUrl = () => {
  if (import.meta.env.DEV) {
    return 'http://localhost:3001/api';
  }
  // En producción, usar la función serverless de Vercel
  // Si estás en Vercel, usar la ruta relativa
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname.includes('vercel.app') || hostname === 'localhost') {
      return '/api';
    }
  }
  // Para otros hosts, usar la URL completa de Vercel (actualiza esto con tu URL real después del deploy)
  return 'https://pokemon-tcg-compare.vercel.app/api';
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
  // En producción, usar la ruta directa para que el rewrite funcione: /api/cards/search?q=...
  // En desarrollo, usar la ruta completa: /api/cards/search/?q=...
  const url = import.meta.env.DEV 
    ? `${baseUrl}/cards/search/?q=${query}`
    : `${baseUrl}/cards/search?q=${query}`;
    
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
  // En producción, usar la ruta directa para que el rewrite funcione: /api/players/ID
  // En desarrollo, usar la ruta completa: /api/players/ID/
  const url = import.meta.env.DEV
    ? `${baseUrl}/players/${playerId}/`
    : `${baseUrl}/players/${playerId}`;
    
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Error al obtener datos del jugador: ${response.statusText}`);
  }
  
  return response.json();
};
