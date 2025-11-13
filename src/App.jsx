import React, { useState, useEffect } from 'react';
import './App.css';
import axios from 'axios';
import * as XLSX from 'xlsx'; // <--- ¡AGREGA ESTA LÍNEA!

function App() {
  // IDs de los jugadores. Podrían venir de inputs en el futuro.
  const [player1Id, setPlayer1Id] = useState("ID1");
  const [player2Id, setPlayer2Id] = useState("ID2");

  // El resto de los estados son iguales
  const [masterCardList, setMasterCardList] = useState(null);
  const [tradesToShow, setTradesToShow] = useState(null);
  const [loading, setLoading] = useState(false);

  // Función para cargar la lista maestra de cartas desde el JSON local
  // Se ejecuta solo una vez al cargar el componente.
  useEffect(() => {
    const getMasterCardList = async () => {
      try {
        // CAMBIO 1: Apuntar a la API en vivo para la lista de cartas
        const response = await axios.get('https://www.pokemon-zone.com/api/cards/search/');
        const apiData = response.data;
        const cardMap = {};
        apiData.data.results.forEach(card => {

          // --- LÓGICA DE EXTRACCIÓN DE RAREZA ---
          const url = card.displayImageUrl;
          // Esto captura la última letra o grupo de letras antes de .webp (ej: "U", "RR", "SSR")
          const match = url.match(/_([A-Z]+)\.webp$/);
          const rarityCode = match ? match[1] : 'C'; // Asumimos 'C' (Common) si falla
          // ------------------------------------

          cardMap[card.cardDefKey] = {
            name: card.name,
            expansionId: card.expansionId,
            image: card.displayImageUrl,
            rarity: rarityCode // ¡Guardamos la rareza!
          };
        });
        setMasterCardList(cardMap);
      } catch (e) {
        console.error("Error cargando la lista de cartas:", e);
        alert("Error: No se pudo cargar la lista de cartas desde la API. Revisa la consola para más detalles.");
      }
    };

    getMasterCardList();
  }, []); // El array vacío asegura que se ejecute solo una vez

  // Función para procesar los datos de un jugador
  // Función para procesar los datos de un jugador (CORREGIDA)
  const processPlayerData = (playerApiData) => {

    // Paso 1: Crear un mapa detallado de la colección del jugador.
    // Guardamos el objeto de carta completo por cada cardId.
    const collectionDetails = {};
    playerApiData.data.cards.forEach(card => {
      if (card.amount > 0) {
        // Guardamos el objeto { cardId, expansionIds, amount, ... }
        collectionDetails[card.cardId] = card;
      }
    });

    // Paso 2: Crear la wishlist filtrando la lista maestra.
    // const wishlist = new Set(Object.keys(masterCardList).filter(masterCardId => {

    //   // Esta es la expansión específica que la lista maestra dice que existe
    //   // (ej: "A4b")
    //   const masterExpansionId = masterCardList[masterCardId].expansionId;

    //   // Buscamos si el jugador tiene esta carta en su colección
    //   const ownedCard = collectionDetails[masterCardId];

    //   if (!ownedCard) {
    //     // Caso 1: El jugador NO tiene esta cardId en absoluto.
    //     // Por lo tanto, la "necesita".
    //     return true;
    //   }

    //   // Caso 2: El jugador SÍ tiene esta cardId.
    //   // Verificamos si su array de 'expansionIds'  incluye la 
    //   // expansión específica de la lista maestra.
    //   // Si NO la incluye, entonces la "necesita".
    //   return !ownedCard.expansionIds.includes(masterExpansionId);
    // }));

    // --- ¡ESTA ES LA LÓGICA CORREGIDA! ---
    // Tu objetivo: La wishlist es CUALQUIER carta de la lista maestra
    // que NO esté en la colección del jugador.
    const wishlist = new Set(Object.keys(masterCardList).filter(cardId => {
        // Si la colección NO tiene esta cardId, entonces es "deseada".
        return !collectionDetails.hasOwnProperty(cardId);
    }));

    // Paso 3: Crear el mapa de "collection" simple que tu función handleCompare espera.
    // Esta solo contendrá { "cardId": cantidad }
    const collectionAmountsOnly = {};
    for (const cardId in collectionDetails) {
      collectionAmountsOnly[cardId] = collectionDetails[cardId].amount;
    }

    console.log("name: " + playerApiData.data.player.name);
    console.log(`Wishlist (completa) de ${playerApiData.data.player.name} tiene ${wishlist.size} cartas.`);

    return {
      name: playerApiData.data.player.name,
      collection: collectionAmountsOnly, // { "PK_10_...": 16 }
      wishlist: wishlist,               // Set { "PK_10_...", "PK_10_..." }
    };
  };

  // La lógica principal de comparación
  const handleCompare = async () => {
    setLoading(true);
    setTradesToShow(null);

    // 1. Validar que la lista maestra de cartas se haya cargado
    if (!masterCardList) {
      alert("La lista maestra de cartas aún no se ha cargado. Intenta de nuevo en un momento.");
      setLoading(false);
      return;
    }

    try {
      // 2. Cargar los datos de ambos jugadores desde sus archivos JSON
      // CAMBIO 2: Apuntar a la API en vivo para los datos de los jugadores
      const player1Response = await axios.get(`https://www.pokemon-zone.com/api/players/${player1Id}/`);
      const player2Response = await axios.get(`https://www.pokemon-zone.com/api/players/${player2Id}/`);

      // 3. Procesar data de ambos jugadores
      const player1 = processPlayerData(player1Response.data);
      const player2 = processPlayerData(player2Response.data);

      // 4. Calcular Trades (Player 1 -> Player 2)
      const p1_can_give = [];
      for (const cardId in player1.collection) {
        const amount = player1.collection[cardId];
        // Regla: Tienes más de 1 Y el Player 2 la quiere
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

      // 5. Calcular Trades (Player 2 -> Player 1)
      const p2_can_give = [];
      for (const cardId in player2.collection) {
        const amount = player2.collection[cardId];
        // Regla: Tiene más de 1 Y el Player 1 la quiere
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
      alert('Error al cargar o procesar los datos de los jugadores desde la API. Revisa que los IDs sean correctos y que la API esté disponible.');
    }
    setLoading(false);
  };


  // --- REEMPLAZA TU FUNCIÓN DE EXPORTAR POR ESTA ---

  const exportToXLSX = () => {
    if (!tradesToShow) {
      alert("Primero debes comparar los trades.");
      return;
    }

    const { p1_gives, p2_gives, player1Name, player2Name } = tradesToShow;

    // REQUISITO 2: Añadimos la columna "Check"
    const headers = ["Check", "ID de Carta", "Nombre", "Cantidad que Posee", "Imagen", "URL Image"];

    // Función para crear la fórmula. Usamos COMAS (,) para Google Sheets
    // y 4;140;100 -> 4, 140, 100
    const createImageFormula = (rowIndex) => {
      // REQUISITO 1: La fórmula consume la columna F (URL Image)
      // Usamos comas: =IMAGE(Celda, [modo], [alto], [ancho])
      return { t: 'f', f: `IMAGE(F${rowIndex}, 4, 140, 100)` };
    };

    // --- REQUISITO 3: Hoja 1 (Puede Ofrecer) ---
    const sheet1Data = p1_gives.map((card, index) => {
      const rowIndex = index + 2; // +1 por el header, +1 por el índice 0
      return {
        Check: false, // Se convertirá en un booleano FALSO
        "ID de Carta": card.id,
        Nombre: card.name,
        "Cantidad que Posee": card.amount,
        Imagen: createImageFormula(rowIndex), // La fórmula
        "URL Image": card.image // La URL de texto
      };
    });

    // --- REQUISITO 3: Hoja 2 (Puede Recibir) ---
    const sheet2Data = p2_gives.map((card, index) => {
      const rowIndex = index + 2;
      return {
        Check: false,
        "ID de Carta": card.id,
        Nombre: card.name,
        "Cantidad que Posee": card.amount,
        Imagen: createImageFormula(rowIndex),
        "URL Image": card.image
      };
    });

    // --- Lógica de Creación del Excel ---

    // 1. Crear el "libro" de Excel
    const wb = XLSX.utils.book_new();

    // 2. Convertir nuestros datos a "hojas" de Excel
    // Usamos 'header: headers' para asegurar el orden de las columnas
    const ws1 = XLSX.utils.json_to_sheet(sheet1Data, { header: headers });
    const ws2 = XLSX.utils.json_to_sheet(sheet2Data, { header: headers });

    // (Opcional) Ajustar el ancho de las columnas (estimado)
    ws1['!cols'] = [{ wch: 7 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 60 }];
    ws2['!cols'] = [{ wch: 7 }, { wch: 20 }, { wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 60 }];

    // 3. Añadimos las hojas al libro con sus nombres
    XLSX.utils.book_append_sheet(wb, ws1, `Puede Ofrecer a ${player2Name}`);
    XLSX.utils.book_append_sheet(wb, ws2, `Puede Recibir de ${player2Name}`);

    // 4. Descargar el archivo .xlsx
    XLSX.writeFile(wb, "trades-pokemon.xlsx");
  };


  return (
    <div className="App">
      {/* <header className="header">
        <h1>Poké Trade Helper</h1>
        <p>Compara colecciones para encontrar intercambios perfectos.</p>
      </header> */}

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
        {/* --- ¡AGREGA ESTE BOTÓN AQUÍ! --- */}
        {/* Solo se muestra si hay resultados para exportar */}
        {tradesToShow && (
          <button onClick={exportToXLSX} className="export-button">
            Exportar a Excel (.xlsx)
          </button>
        )}
        {/* ------------------------------- */}

        {!masterCardList && <p style={{ color: '#aaa', marginTop: '10px' }}>Cargando lista de cartas...</p>}
      </div>

      {tradesToShow && (
        <TradeResults data={tradesToShow} />
      )}
    </div>
  );
}

// (Los componentes TradeResults y Card de abajo quedan exactamente igual que antes)

const TradeResults = ({ data }) => {
  return (
    <div className="results-container">
      {/* Columna 1: Lo que TÚ puedes darle */}
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

      {/* Columna 2: Lo que ÉL puede darte */}
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
};

// (Opcional) Un objeto para mapear códigos a los símbolos emoji
const raritySymbols = {
  'C': '◇',
  'U': '◇◇',
  'R': '◇◇◇',
  'RR': '◇◇◇◇',
  'AR': '★',
  'SR': '★★',
  'IM': '★★★', // Immersive Rare (basado en tus archivos)
  'S': '⬢', // Hexágono para Shiny
  'SSR': '⬢⬢'
};
const Card = ({ card, ownedAmount }) => (
  <div className="card">
    <img src={card.image} alt={card.name} />
    <p className="card-name">{card.name}</p>

    {/* Muestra la rareza usando el mapa de símbolos */}
    <p className="card-rarity">{raritySymbols[card.rarity] || card.rarity}</p>

    <span className="card-amount">Tiene: {ownedAmount}</span>
  </div>
);

export default App;