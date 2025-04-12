import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Calidad.css';
import logo2 from "../../assets/mosca.png";

function Calidad() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica si estás en la ruta principal de Calidad
  const isRootPath = location.pathname === "/Calidad";

  return (
    <div className="calidad-container">
      {isRootPath && (
          <>
          <h1>
            <img src={logo2} alt="mosca" className="logo2" />
            Registros de Calidad
          </h1>
          <div className="welcome-message">
            <p>Esta es la página de registros de calidad.</p>
          </div>
          <div className="botones">
            <button
              onClick={() => navigate("/Calidad/ControlNeonatos")}
              className="back-button"
            >
              1- Control Neonatos
            </button>
            <button
              onClick={() => navigate("/Calidad/ControlCalidadCosecha")}
              className="back-button"
            >
              2- Control de Calidad de Cosecha
            </button>
            <button
              onClick={() => navigate("/Calidad/ControlCalidadHornoMultilevel")}
              className="back-button"
            >
              3- Control Calidad Horno Multilevel
            </button>
            <button
              onClick={() => navigate("/Calidad/ControlCalidadDietaSiembra")}
              className="back-button"
            >
              4- Control Calidad Dieta-Siembral
            </button>
            <button
              onClick={() => navigate("/Calidad/RecepcionMateriasPrimas")}
              className="back-button"
            >
              5- Recepcion de Materias Primas
            </button>
            <button
              onClick={() => navigate("/Calidad/ControlCalidadEngordeHatchery")}
              className="back-button"
            >
              6- Control Calidad Engorde Hatchery
            </button>
            
            <button
              onClick={() => navigate("/Calidad/ControlCalidadHornoMicroondas")}
              className="back-button"
            >
              8- Control Calidad Horno Microondas
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

export default Calidad;