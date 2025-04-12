import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Horno.css';
import logo2 from "../../assets/mosca.png";

function Horno() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Horno";

  // Matriz de botones organizados por categorías
  const botones = [
    {
      titulo: 'Control de Rendimiento',
      subtitulo: 'Secado Horno Multilevel',
      ruta: '/Horno/ControlRendimientoSecadoHornoMultilevel',
      cols: 2,
      className: 'boton-grid oven-button'
    },
    {
      titulo: 'Control de Rendimiento',
      subtitulo: 'Secado Horno Microondas',
      ruta: '/Horno/ControlRendimientoSecadoHornoMicroondas',
      cols: 2,
      className: 'boton-grid oven-button'
    },
    {
      titulo: 'Control Operativo',
      subtitulo: 'Horno Multilevel',
      ruta: '/Horno/ControlOperativoHornoMultilevel',
      cols: 1,
      className: 'boton-grid oven-button'
    },
    {
      titulo: 'Control Rendimiento',
      subtitulo: 'Producto Terminado',
      ruta: '/Horno/ControlRendimientoProductoTerminado',
      cols: 1,
      className: 'boton-grid oven-button'
    },
    {
      titulo: 'Control de Tiempos',
      subtitulo: 'Tiempos Perdidos',
      ruta: '/ControlTiempos',
      cols: 1,
      className: 'boton-grid oven-button'
    },
    {
      titulo: 'Control Reempaque',
      subtitulo: 'Producto Terminado',
      ruta: '/Horno/ControlReempaque',
      cols: 1,
      className: 'boton-grid oven-button'
    }
  ];

  return (
    <div className="horno-container">
      {isRootPath && (
        <>
          <header className="oven-header">
            <img src={logo2} alt="Logo" className="logo2" />
            <h1>Registros de Horno</h1>
          </header>
          
          <div className="welcome-message">
            <p>Sistema de registro para operaciones de horno</p>
          </div>
          
          <div className="grid-botones">
            {botones.map((boton, index) => (
              <button
                key={index}
                className={`${boton.className} cols-${boton.cols}`}
                onClick={() => navigate(boton.ruta)}
              >
                <span className="button-main-text">{boton.titulo}</span>
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

export default Horno;