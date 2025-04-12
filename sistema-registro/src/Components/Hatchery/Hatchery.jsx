import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Hatchery.css';
import logo2 from "../../assets/mosca.png";

function Hatchery() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Hatchery";

  // Matriz de botones organizados
  const botones = [
    {
      titulo: 'Ingreso de Pre-Pupas',
      subtitulo: 'A Invernadero',
      ruta: '/Hatchery/IngresoPPInvernadero',
      cols: 2,
      className: 'boton-grid hatchery-button'
    },
    {
      titulo: 'Colecta de Eggies',
      subtitulo: 'Del Invernadero',
      ruta: '/Hatchery/ColectaInvernadero',
      cols: 1,
      className: 'boton-grid hatchery-button'
    },
    {
      titulo: 'NIB',
      subtitulo: 'Neonatos Inoculados',
      ruta: '/Hatchery/NIB',
      cols: 1,
      className: 'boton-grid hatchery-button'
    },
    {
      titulo: 'Control de Rendimiento',
      subtitulo: 'Cosecha-Reproducción',
      ruta: '/Hatchery/ControlRendimientoCosechaReproduccion',
      cols: 1,
      className: 'boton-grid hatchery-button'
    },
    {
      titulo: 'Control Despacho',
      subtitulo: 'Laboratorio Producción',
      ruta: '/Hatchery/ControlDespachoLabPro',
      cols: 1,
      className: 'boton-grid hatchery-button'
    }
  ];

  return (
    <div className="hatchery-container">
      {isRootPath && (
        <>
          <header className="hatchery-header">
            <img src={logo2} alt="Logo" className="logo2" />
            <h1>Registros de Hatchery</h1>
          </header>
          
          <div className="welcome-message">
            <p>Sistema de registro para operaciones de hatchery</p>
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

export default Hatchery;