import React from 'react';

function Topbar() {
  return (
    <header id="topbar">
        <div className="topbar-logo">
            ArtAround Editor
        </div>
        <div className="topbar-avatar">
            <i className="fa-solid fa-circle-user fa-2xl"></i>
        </div>
    </header>
  );
}

export default Topbar; // Questa è la riga fondamentale che mancava!