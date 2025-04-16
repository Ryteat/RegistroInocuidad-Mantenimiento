import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Dieta.css';
import logo2 from "../../assets/mosca.png";

function Dieta() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Dieta";

  // Matriz de botones organizados
  const botones = [
    {
      titulo: 'Control Inventario',
      subtitulo: 'Cáscara en Pila',
      ruta: '/Dieta/ControlInventarioCascaraPila',
      cols: 1,
      className: 'boton-grid dieta-button'
    },
    {
      titulo: 'Control Rendimiento',
      subtitulo: 'Dieta y Siembra',
      ruta: '/Dieta/ControlRendimientoDietaySiembra',
      cols: 1,
      className: 'boton-grid dieta-button'
    },
    {
      titulo: 'Control Movimientos',
      subtitulo: 'Cajas en Proceso',
      ruta: '/Dieta/ControlMovimientosCajasProceso',
      cols: 1,
      className: 'boton-grid dieta-button'
    },
    {
      titulo: 'Control de Tiempos',
      subtitulo: 'Tiempos Perdidos',
      ruta: '/ControlTiempos',
      cols: 1,
      className: 'boton-grid dieta-button'
    }
  ];

  return (
    <div className="dieta-container">
      {isRootPath && (
        <>
          <header className="dieta-header">
            <img src={logo2} alt="Logo" className="logo2" />
            <h1>Registros de Dieta</h1>
          </header>
          
          <div className="welcome-message">
            <p>Sistema de registro para controles de dieta</p>
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

export default Dieta;