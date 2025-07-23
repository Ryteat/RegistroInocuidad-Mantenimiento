import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Gerencia.css';
import logo2 from "../../assets/mosca.png";

function Gerencia() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Gerencia";

  // Matriz de botones con sus propiedades
  const botones = [
    {
      texto: 'Gestión de Usuarios',
      ruta: '/Gerencia/GestionUsuarios',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Acceso a la Base de Datos',
      ruta: 'https://supabase.com/dashboard/project/uosaxzrbvjpgzrvfoyjh',
      cols: 1,
      className: 'boton-grid',
      external: true
    },
    {
      texto: 'Volver al Menú Principal',
      ruta: -1,
      cols: 2,
      className: 'boton-grid logout-button'
    }
  ];

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
          <div className="grid-botones">
            {botones.map((boton, index) => (
              boton.external ? (
                <a 
                  key={index}
                  href={boton.ruta}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${boton.className} cols-${boton.cols}`}
                >
                  {boton.texto}
                </a>
              ) : (
                <button
                  key={index}
                  className={`${boton.className} cols-${boton.cols}`}
                  onClick={() => navigate(boton.ruta)}
                >
                  {boton.texto}
                </button>
              )
            ))}
          </div>
        </>
      )}

      {/* Aquí se renderizarán las subrutas */}
      <Outlet />
    </div>
  );
}

export default Gerencia;