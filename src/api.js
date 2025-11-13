const API_BASE_URL = 'https://www.pokemon-zone.com/api';

/**
 * Realiza una búsqueda de cartas en la API.
 * @param {string} query - El término de búsqueda.
 * @returns {Promise<Object>} - Los resultados de la búsqueda.
 */
export const searchCards = async (query) => {
  // Por ahora, usamos un query de ejemplo. Esto debería ser dinámico.
  const response = await fetch(`${API_BASE_URL}/cards/search/?q=${query}`);
  
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
  const response = await fetch(`${API_BASE_URL}/players/${playerId}/`);
  
  if (!response.ok) {
    throw new Error(`Error al obtener datos del jugador: ${response.statusText}`);
  }
  
  return response.json();
};
