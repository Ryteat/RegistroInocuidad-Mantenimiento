import supabase from "../../../supabaseClient";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo2 from "../../../assets/mosca.png";
import "./VisualizarLotes.css";

function VisualizarLotes() {
  const navigate = useNavigate();

    return(
        <>
         <h1>
                <img src={logo2} alt="mosca" className="logo2" />
                Visualización de Lotes
              </h1>
        
              <div className="welcome-message">
                <p>
                  Bienvenido al panel de visualización de Lotes.  
                  Aquí puedes monitorear los Lotes y observar sus registros asociados en cada una de las areas Productivas.
                </p>
              </div>
        
              <div className="buttons-container">
                <button onClick={() => navigate(-1)} className="return-button">
                  Volver
                </button>
                <button onClick={() => navigate(-2)} className="menu-button">
                  Menú principal
                </button>
              </div>
        </>
    );
}

export default VisualizarLotes;