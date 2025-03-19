import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Cosecha.css';
import logo2 from "../../assets/mosca.png";

function Cosecha() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica si estás en la ruta principal de Coseccha
  const isRootPath = location.pathname === "/Cosecha";

  return (
   
    <div className="cosecha-container">

      {isRootPath && (
        
        <>
        <h1>
          <img src={logo2} alt="mosca" className="logo2" />
          Registros de Cosecha
        </h1>
        <div className="welcome-message">
          <p>Esta es la página de registros de Cosecha.</p>
          </div>
          <div className="botones">
          <button
              onClick={() => navigate("/Cosecha/ControlIngresoySalidaRacks")}
              className="back-button"
            >
              1- Control de Ingreso o Salida de Racks
            </button>
            <button
              onClick={() => navigate("/Cosecha/ControlRendimientoCosechayFrass")}
              className="back-button"
            >
              2- Control de Rendimiento Cosecha y Frass
            </button>
            
             <button
              onClick={() => navigate("/ControlTiempos")}
              className="back-button"
            >
              3-Control de Tiempos Perdidos
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
export default Cosecha;