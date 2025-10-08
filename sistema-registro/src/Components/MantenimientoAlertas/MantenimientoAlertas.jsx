import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./MantenimientoAlertas.css";
import logo2 from "../../assets/mosca.png";

export default function MantenimientoAlertas() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRootPath = location.pathname === "/MantenimientoAlertas";

    const botones = [
        {
            texto: "Limpieza y Desinfección de Equipos Maquinaria Pesada",
            ruta: "/Mantenimiento/LimpiezaDesinfeccionEquiposMaquinariaPesada",
            cols: 1,
            className: "boton-grid",
        },
        {
            texto: "Volver al Menú Principal",
            ruta: -1,
            cols: 2,
            className: "boton-grid logout-button",
        },
    ];

    return (
        <div className="mantenimientoAlertas-container">
            {isRootPath && (
                <>
                    <h1>
                        <img src={logo2} alt="mosca" className="logo2" />
                        Registros de Mantenimiento y Alertas
                    </h1>

                    <div className="welcome-message">
                        <p>Esta es la página de registros de Mantenimiento y Alertas.</p>
                    </div>

                    <div className="grid-botones">
                        {botones.map((b, i) => (
                            <button
                                key={i}
                                className={`${b.className} cols-${b.cols}`}
                                onClick={() => navigate(b.ruta)}
                            >
                                {b.texto}
                            </button>
                        ))}
                    </div>
                </>
            )}
            <Outlet />
        </div>
    );
}
