import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./Visualizar.css";
import logo2 from "../../assets/mosca.png";

function Visualizar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isRootPath = location.pathname === "/Visualizar";

  return (
    <div className="gerencia-container">
      {isRootPath && (
        <>
          <h1>
            <img src={logo2} alt="mosca" className="logo2" />
            Visualización de datos relevantes
          </h1>
          <div className="welcome-message">
            <p>Esta es la página de registros de mantenimiento.</p>
          </div>
          <div className="botones">
            <button onClick={() => navigate("/Visualizar/VisualizarKPIs")}>
              Reporte KPIs
            </button>
            <button onClick={() => navigate("/Gerencia/GestionUsuarios")}>
              Flash Report
            </button>
            <button onClick={() => navigate("/Visualizar/VisualizarLotes")}>
              Visualizar Lotes
            </button>
            <button onClick={() => navigate("/Visualizar/VisualizarSKUs")}>
              Visualizar SKUs
            </button>
            <button onClick={() => navigate(-1)}>
              Volver al Menú Principal
            </button>
          </div>
        </>
      )}
      {/* Renderiza los componentes hijos */}
      <Outlet />
    </div>
  );
}

export default Visualizar;
