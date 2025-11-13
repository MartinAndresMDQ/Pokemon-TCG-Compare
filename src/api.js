// La URL de nuestro propio backend que actúa como proxy.
// En desarrollo, apunta a localhost. En producción (Vercel), usa una ruta relativa
// para que el frontend llame a sus propias serverless functions.
const PROXY_API_URL = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

/**
 * Maneja la respuesta de la API de nuestro backend.
 * @param {Response} response
 * @returns {Promise<Object>}
 */
const handleApiResponse = async (response) => {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Error en la solicitud: ${errorData.message || response.statusText}`);
    }
    return response.json();
}

/**
 * Realiza una búsqueda de cartas en la API.
 * @param {string} query - El término de búsqueda.
 * @returns {Promise<Object>} - Los resultados de la búsqueda.
 */
export const searchCards = async (query) => {
  try {
    const response = await fetch(`${PROXY_API_URL}/search-cards?q=${query}`);
    return handleApiResponse(response);
  } catch (error) {
    console.error(`Error al buscar cartas con la query "${query}":`, error);
    throw error;
  }
};

/**
 * Obtiene los datos de un jugador específico por su ID.
 * @param {string} playerId - El ID del jugador.
 * @returns {Promise<Object>} - Los datos del jugador.
 */
export const getPlayer = async (playerId) => {
  try {
    const response = await fetch(`${PROXY_API_URL}/players/${playerId}`);
    return handleApiResponse(response);
  } catch (error) {
    console.error(`Error al obtener el jugador con ID "${playerId}":`, error);
    throw error;
  }
};
