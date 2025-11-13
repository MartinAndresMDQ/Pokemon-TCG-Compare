import React from 'react';

export const Card = ({ card, ownedAmount }) => (
  <div className="card">
    <img src={card.image} alt={card.name} />
    <p className="card-name">{card.name}</p>
    <span className="card-amount">Tiene: {ownedAmount}</span>
  </div>
);