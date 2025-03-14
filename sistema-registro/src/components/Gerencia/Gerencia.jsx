import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Gerencia.css';
import logo2 from "../../assets/mosca.png";

function Gerencia() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica si estás en la ruta principal de Dieta
  const isRootPath = location.pathname === "/Gerencia";

  return (
    <div className="gerencia-container">
      

      {isRootPath && (
        
        <>
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Información Gerencia
        </h1>
        <div className="welcome-message">
          <p>Esta es la página de información para gerencia.</p>
          </div>
          <div className="botones">
            <button
              onClick={() => navigate("/Gerencia/GestionUsuarios")}
              className="back-button"
            >
              Gestion de Usuarios
            </button>
            
            
            

            <button onClick={() => navigate(-1)} className="back-button">
              Volver al Menú Principal
            </button>
          </div>
        </>
     
    )}

    {/* Aquí se renderizarán las subrutas */}
    <Outlet />
  </div>
);
}

export default Gerencia;