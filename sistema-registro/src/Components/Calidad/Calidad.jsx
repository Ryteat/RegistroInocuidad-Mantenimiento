import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Calidad.css';
import logo2 from "../../assets/mosca.png";

function Calidad() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Calidad";

  // Matriz de botones organizados por categorías
  const botones = [
    {
      titulo: 'Control Neonatos',
      ruta: '/Calidad/ControlNeonatos',
      cols: 2,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Control Calidad Cosecha',
      ruta: '/Calidad/ControlCalidadCosecha',
      cols: 1,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Control Calidad Horno Multilevel',
      ruta: '/Calidad/ControlCalidadHornoMultilevel',
      cols: 1,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Control Calidad Dieta-Siembra',
      ruta: '/Calidad/ControlCalidadDietaSiembra',
      cols: 1,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Recepción Materias Primas',
      ruta: '/Calidad/RecepcionMateriasPrimas',
      cols: 1,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Control Calidad Engorde Hatchery',
      ruta: '/Calidad/ControlCalidadEngordeHatchery',
      cols: 1,
      className: 'boton-grid calidad-button'
    },
    {
      titulo: 'Control Calidad Horno Microondas',
      ruta: '/Calidad/ControlCalidadHornoMicroondas',
      cols: 1,
      className: 'boton-grid calidad-button'
    }
  ];

  return (
    <div className="calidad-container">
      {isRootPath && (
        <>
          <header className="calidad-header">
            <img src={logo2} alt="Logo" className="logo2" />
            <h1>Registros de Calidad</h1>
          </header>
          
          <div className="welcome-message">
            <p>Sistema de registro para controles de calidad</p>
          </div>
          
          <div className="grid-botones">
            {botones.map((boton, index) => (
              <button
                key={index}
                className={`${boton.className} cols-${boton.cols}`}
                onClick={() => navigate(boton.ruta)}
              >
                {boton.titulo}
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

export default Calidad;