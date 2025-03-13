import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Visualizar.css';
import logo2 from "../../assets/mosca.png";
import { Outlet } from 'react-router-dom';

function Visualizar() {
  const navigate = useNavigate();

  return (
    <div className="gerencia-container">
      <h1>
        <img src={logo2} alt="mosca" className="logo2" />
        Visualización de datos relevantes
      </h1>
      
      {/* ¡Aquí se renderizará el componente hijo! */}
      <Outlet /> 

      <div className="botones">
        <button onClick={() => navigate("/Visualizar/VisualizarKPIs")}>
          Reporte KPIs
        </button>
        <button onClick={() => navigate("/Gerencia/GestionUsuarios")}>
          Flash Report
        </button>
        <button onClick={() => navigate(-1)}>
          Volver al Menú Principal
        </button>
      </div>
    </div>
  );
};
export default Visualizar;