import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Mantenimiento.css';
import logo2 from "../../assets/mosca.png";

function Mantenimiento() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Mantenimiento";

  // Matriz de botones con sus propiedades
  const botones = [
    {
      texto: 'Limpieza y Desinfección de Equipos Maquinaria Pesada',
      ruta: '/Mantenimiento/LimpiezaDesinfeccionEquiposMaquinariaPesada',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Reporte de Inspección Diario de Montacargas',
      ruta: '/Mantenimiento/ReporteInspeccion',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Reporte de Inspección Semanal de Montacargas',
      ruta: '/Mantenimiento/ReporteInspeccionSemanal',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Registro Preoperacional Teletruk',
      ruta: '/Mantenimiento/PreoperacionalTeletruk',
      cols: 1,
      className: 'boton-grid'
    },
    {
      texto: 'Volver al Menú Principal',
      ruta: -1,
      cols: 2,
      className: 'boton-grid logout-button'
    }
  ];

  return (
    <div className="mantenimiento-container">
      {isRootPath && (
        <>
          <h1>
            <img src={logo2} alt="mosca" className="logo2" />
            Registros de Mantenimiento
          </h1>
          <div className="welcome-message">
            <p>Esta es la página de registros de mantenimiento.</p>
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

      {/* Aquí se renderizarán las subrutas */}
      <Outlet />
    </div>
  );
}

export default Mantenimiento;