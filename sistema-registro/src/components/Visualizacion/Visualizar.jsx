import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./Visualizar.css";
import logo2 from "../../assets/mosca.png";

function Visualizar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Visualizar";

  // Matriz de botones con sus propiedades
  const botones = [
    {
      texto: 'Reporte KPIs',
      ruta: '/Visualizar/VisualizarKPIs',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Flash Report',
      ruta: '/Visualizar/FlashReport',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Visualizar Lotes',
      ruta: '/Visualizar/VisualizarLotes',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Visualizar SKUs',
      ruta: '/Visualizar/VisualizarSKUs',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Volver al Menú Principal',
      ruta: -1, // Usamos -1 para el navigate back
      cols: 2,
      className: 'boton-grid logout-button' // Clases iguales al botón de cerrar sesión
    }
  ];

  return (
    <div className="gerencia-container">
      {isRootPath && (
        <>
          <h1>
            <img src={logo2} alt="mosca" className="logo2" />
            Visualización de datos relevantes
          </h1>
          <div className="welcome-message">
            <p>Esta es la página que perimte la visualización de los datos relevantes del proceso productivo.</p>
          </div>
          <div className="grid-botones">
            {botones.map((boton, index) => (
              <button
                key={index}
                className={`${boton.className} cols-${boton.cols}`}
                onClick={() => navigate(boton.ruta)}
              >
                {boton.texto}
              </button>
            ))}
          </div>
        </>
      )}
      {/* Renderiza los componentes hijos */}
      <Outlet />
    </div>
  );
}

export default Visualizar;