// En desarrollo, usamos el servidor proxy local (http://localhost:3001)
// En producción, necesitarías usar la URL completa o configurar otro proxy
const API_BASE_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://www.pokemon-zone.com/api';

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
  const response = await fetch(`${API_BASE_URL}/cards/search/?q=${query}`, {
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
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/`, {
    method: 'GET',
    headers: getHeaders(),
  });
  
  if (!response.ok) {
    throw new Error(`Error al obtener datos del jugador: ${response.statusText}`);
  }
  
  return response.json();
};
