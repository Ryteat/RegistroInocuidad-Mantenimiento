import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Cosecha.css';
import logo2 from "../../assets/mosca.png";

function Cosecha() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Cosecha";

  // Matriz de botones organizados
  const botones = [
    {
      titulo: 'Control de Ingreso/Salida',
      subtitulo: 'de Racks',
      ruta: '/Cosecha/ControlIngresoySalidaRacks',
      cols: 2,
      className: 'boton-grid cosecha-button'
    },
    {
      titulo: 'Control de Rendimiento',
      subtitulo: 'Cosecha y Frass',
      ruta: '/Cosecha/ControlRendimientoCosechayFrass',
      cols: 1,
      className: 'boton-grid cosecha-button'
    },
    {
      titulo: 'Control de Tiempos',
      subtitulo: 'Tiempos Perdidos',
      ruta: '/ControlTiempos',
      cols: 1,
      className: 'boton-grid cosecha-button tiempo-button'
    }
  ];

  return (
    <div className="cosecha-container">
      {isRootPath && (
        <>
          <header className="cosecha-header">
            <img src={logo2} alt="Logo" className="logo2" />
            <h1>Registros de Cosecha</h1>
          </header>
          
          <div className="welcome-message">
            <p>Sistema de registro para operaciones de cosecha</p>
          </div>
          
          <div className="grid-botones">
            {botones.map((boton, index) => (
              <button
                key={index}
                className={`${boton.className} cols-${boton.cols}`}
                onClick={() => navigate(boton.ruta)}
              >
                <span className="button-main-text">{boton.titulo}</span>
                {"-"}
                {boton.subtitulo && <span className="button-subtext">{boton.subtitulo}</span>}
              </button>
            ))}
            
            <button
              className="boton-grid logout-button cols-2"
              onClick={() => navigate(-1)}
            >
              Volver al Menú Principal
            </button>
          </div>
        </>
      )}

      <Outlet />
    </div>
  );
}

export default Cosecha;