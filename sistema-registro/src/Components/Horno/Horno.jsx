import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Horno.css';
import logo2 from "../../assets/mosca.png";

function Horno() {
  const navigate = useNavigate();
  const location = useLocation();

  // Verifica si estás en la ruta principal de Horno
  const isRootPath = location.pathname === "/Horno";

  return (
    <div className="horno-container">
      {isRootPath && (
        <>
          <h1>
            <img src={logo2} alt="mosca" className="logo2" />
            Registros de Horno
          </h1>
          <div className="welcome-message">
            <p>Esta es la página de registros de horno.</p>
          </div>
          <div className="botones">
            <button
              onClick={() => navigate("/Horno/ControlRendimientoSecadoHornoMultilevel")}
              className="back-button"
            >
              1- Control de Rendimiento Secado Horno Multilevel
            </button>
            <button
              onClick={() => navigate("/Horno/ControlRendimientoSecadoHornoMicroondas")}
              className="back-button"
            >
              2- Control Rendimiento Secado Horno Microondas
            </button>
            <button
              onClick={() => navigate("/Horno/ControlOperativoHornoMultilevel")}
              className="back-button"
            >
              3- Control Operativo Horno Multilevel
            </button>

            <button
              onClick={() => navigate("/Horno/ControlRendimientoProductoTerminado")}
              className="back-button"
            >
              4- Control Rendimiento Producto Terminado
            </button>


            <button
              onClick={() => navigate("/ControlTiempos")}
              className="back-button"
            >
              5- Control de Tiempos Perdidos
            </button>
            <button
              onClick={() => navigate("/Horno/ControlReempaque")}  // Cambiado de "/ControlReempaque"
              className="back-button"
            >
              6- Control Reempaque Producto Terminado
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

export default Horno;