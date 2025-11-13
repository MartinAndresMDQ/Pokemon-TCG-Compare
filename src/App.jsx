import React, { useState, useEffect } from 'react';
import './App.css';
import * as XLSX from 'xlsx';
import { searchCards, getPlayer } from './api.js'; // Importamos desde nuestro módulo de API

function App() {
  const [player1Id, setPlayer1Id] = useState("3415023931342371"); // ID de ejemplo
  const [player2Id, setPlayer2Id] = useState("ID_JUGADOR_2"); // ID de ejemplo

  const [masterCardList, setMasterCardList] = useState(null);
  const [tradesToShow, setTradesToShow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');

  // Carga la lista maestra de cartas desde la API al iniciar.
  useEffect(() => {
    const getMasterCardList = async () => {
      setLoadingMessage('Cargando lista maestra de cartas...');
      setLoading(true);
      setError(null);
      try {
        // Usamos la función de nuestra API. 
        // Un query vacío podría traer una lista general o necesitar un parámetro.
        // Usaremos 'sv06' como ejemplo de una serie moderna. ¡Puedes cambiarlo!
        const apiData = await searchCards('sv06'); 
        
        const cardMap = {};
        apiData.data.results.forEach(card => {
          const url = card.displayImageUrl;
          const match = url.match(/_([A-Z]+)\.webp$/);
          const rarityCode = match ? match[1] : 'C';

          cardMap[card.cardDefKey] = {
            name: card.name,
            expansionId: card.expansionId,
            image: card.displayImageUrl,
            rarity: rarityCode,
          };
        });
        setMasterCardList(cardMap);
      } catch (e) {
        console.error("Error cargando la lista de cartas:", e);
        setError("Error: No se pudo cargar la lista de cartas desde la API. Es posible que la API esté bloqueando la solicitud (CORS) o no esté disponible.");
      } finally {
        setLoading(false);
        setLoadingMessage('');
      }
    };

    getMasterCardList();
  }, []); // El array vacío asegura que se ejecute solo una vez

  // La función para procesar datos de jugador permanece igual, ya que la estructura de datos no cambia.
  const processPlayerData = (playerApiData) => {
    const collectionDetails = {};
    playerApiData.data.cards.forEach(card => {
      if (card.amount > 0) {
        collectionDetails[card.cardId] = card;
      }
    });

    const wishlist = new Set(Object.keys(masterCardList).filter(cardId => {
        return !collectionDetails.hasOwnProperty(cardId);
    }));

    const collectionAmountsOnly = {};
    for (const cardId in collectionDetails) {
      collectionAmountsOnly[cardId] = collectionDetails[cardId].amount;
    }

    return {
      name: playerApiData.data.player.name,
      collection: collectionAmountsOnly,
      wishlist: wishlist,
    };
  };

  // Lógica de comparación actualizada para usar el módulo de API
  const handleCompare = async () => {
    setLoading(true);
    setLoadingMessage('Comparando colecciones...');
    setTradesToShow(null);
    setError(null);

    if (!masterCardList) {
      setError("La lista maestra de cartas no se ha cargado. No se puede comparar.");
      setLoading(false);
      return;
    }

    try {
      // Usamos nuestra nueva función getPlayer
      const player1Data = await getPlayer(player1Id);
      const player2Data = await getPlayer(player2Id);

      const player1 = processPlayerData(player1Data);
      const player2 = processPlayerData(player2Data);

      const p1_can_give = [];
      for (const cardId in player1.collection) {
        const amount = player1.collection[cardId];
        if (amount > 1 && player2.wishlist.has(cardId)) {
          p1_can_give.push({
            id: cardId,
            name: masterCardList[cardId]?.name || cardId,
            image: masterCardList[cardId]?.image,
            amount: amount,
            rarity: masterCardList[cardId]?.rarity
          });
        }
      }

      const p2_can_give = [];
      for (const cardId in player2.collection) {
        const amount = player2.collection[cardId];
        if (amount > 1 && player1.wishlist.has(cardId)) {
          p2_can_give.push({
            id: cardId,
            name: masterCardList[cardId]?.name || cardId,
            image: masterCardList[cardId]?.image,
            amount: amount,
            rarity: masterCardList[cardId]?.rarity
          });
        }
      }

      setTradesToShow({ p1_gives: p1_can_give, p2_gives: p2_can_give, player1Name: player1.name, player2Name: player2.name });
    } catch (error) {
      console.error(error);
      setError('Error al cargar datos de los jugadores. Revisa que los IDs sean correctos y que la API no esté bloqueando las solicitudes.');
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // La función de exportar a XLSX no necesita cambios.
  const exportToXLSX = () => {
    if (!tradesToShow) {
      alert("Primero debes comparar los trades.");
      return;
    }
    const { p1_gives, p2_gives, player1Name, player2Name } = tradesToShow;
    const headers = ["Check", "ID de Carta", "Nombre", "Cantidad que Posee", "Imagen", "URL Image"];
    const createImageFormula = (rowIndex) => ({ t: 'f', f: `IMAGE(F${rowIndex}, 4, 140, 100)` });

    const sheet1Data = p1_gives.map((card, index) => ({
      Check: false,
      "ID de Carta": card.id,
      Nombre: card.name,
      "Cantidad que Posee": card.amount,
      Imagen: createImageFormula(index + 2),
      "URL Image": card.image
    }));

    const sheet2Data = p2_gives.map((card, index) => ({
      Check: false,
      "ID de Carta": card.id,
      Nombre: card.name,
      "Cantidad que Posee": card.amount,
      Imagen: createImageFormula(index + 2),
      "URL Image": card.image
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data, { header: headers });
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data, { header: headers });
    ws1['!cols'] = [{ wch: 7 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 60 }];
    ws2['!cols'] = [{ wch: 7 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, ws1, `Puede Ofrecer a ${player2Name}`);
    XLSX.utils.book_append_sheet(wb, ws2, `Puede Recibir de ${player2Name}`);
    XLSX.writeFile(wb, "trades-pokemon.xlsx");
  };

  return (
    <div className="App">
      <div className="input-section">
        <div className="input-group">
          <label>ID Jugador 1</label>
          <input type="text" value={player1Id} onChange={e => setPlayer1Id(e.target.value)} />
        </div>
        <div className="input-group">
          <label>ID Jugador 2</label>
          <input type="text" value={player2Id} onChange={e => setPlayer2Id(e.target.value)} />
        </div>
        <button onClick={handleCompare} disabled={loading || !masterCardList}>
          {loading ? 'Comparando...' : 'Comparar Trades'}
        </button>
        {tradesToShow && (
          <button onClick={exportToXLSX} className="export-button">
            Exportar a Excel (.xlsx)
          </button>
        )}
      </div>

      {loading && <p className="loading-message">{loadingMessage}</p>}
      
      {error && <p className="error-message">{error}</p>}

      {tradesToShow && !loading && !error && (
        <TradeResults data={tradesToShow} />
      )}
    </div>
  );
}

// --- Componentes de UI (sin cambios) ---

const TradeResults = ({ data }) => (
  <div className="results-container">
    <div className="trade-column">
      <h2>✅ Puedes Ofrecerle a {data.player2Name}</h2>
      <p>(Tienes {'>'}1 y él/ella las quiere)</p>
      <div className="card-list">
        {data.p1_gives.length === 0 && <p>No hay trades claros.</p>}
        {data.p1_gives.map(card => (
          <Card key={card.id} card={card} ownedAmount={card.amount} />
        ))}
      </div>
    </div>
    <div className="trade-column">
      <h2>🎁 Puedes Recibir de {data.player2Name}</h2>
      <p>(Él/ella tiene {'>'}1 y tú las quieres)</p>
      <div className="card-list">
        {data.p2_gives.length === 0 && <p>No hay trades claros.</p>}
        {data.p2_gives.map(card => (
          <Card key={card.id} card={card} ownedAmount={card.amount} />
        ))}
      </div>
    </div>
  </div>
);

const raritySymbols = { 'C': '◇', 'U': '◇◇', 'R': '◇◇◇', 'RR': '◇◇◇◇', 'AR': '★', 'SR': '★★', 'IM': '★★★', 'S': '⬢', 'SSR': '⬢⬢' };
const Card = ({ card, ownedAmount }) => (
  <div className="card">
    <img src={card.image} alt={card.name} />
    <p className="card-name">{card.name}</p>
    <p className="card-rarity">{raritySymbols[card.rarity] || card.rarity}</p>
    <span className="card-amount">Tiene: {ownedAmount}</span>
  </div>
);

export default App;