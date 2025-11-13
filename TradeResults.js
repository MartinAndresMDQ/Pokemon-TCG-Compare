import React from 'react';
import { Card } from './Card';

export const TradeResults = ({ data }) => {
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