// src/Components/MantenimientoAlertas/MantenimientoAlertas.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import "./MantenimientoAlertas.css";
import logo2 from "../../assets/mosca.png";

export default function MantenimientoAlertas() {
    const navigate = useNavigate();
    const location = useLocation();

    const isRootPath =
        location.pathname === "/MantenimientoAlertas" ||
        location.pathname.endsWith("/MantenimientoAlertas");

    const secciones = [
        { titulo: "Infraestructura de Planta", ruta: "/MantenimientoAlertas/Infraestructura" },
        { titulo: "Hatchery", ruta: "/MantenimientoAlertas/Hatchery" },   // (placeholder)
        { titulo: "Horno", ruta: "/MantenimientoAlertas/Horno" },         // (placeholder)
        { titulo: "Dieta", ruta: "/MantenimientoAlertas/Dieta" },         // (placeholder)
        { titulo: "Crecimiento", ruta: "/MantenimientoAlertas/Crecimiento" }, // (placeholder)
        { titulo: "Cosecha", ruta: "/MantenimientoAlertas/Cosecha" },         // (placeholder)
    ];

    return (
        <div className="mantenimientoAlertas-container">
            {isRootPath && (
                <>
                    <header className="header-alertas">
                        <img src={logo2} alt="mosca" className="logo2" />
                        <h1>Alertas de Mantenimiento</h1>
                    </header>

                    <div className="top-actions">
                        <button className="boton-grid" onClick={() => navigate("/MantenimientoAlertas/Alertas")}>
                            Ver Sistema de Alertas
                        </button>
                        <button className="boton-grid logout-button" onClick={() => navigate("/", { replace: true })}>
                            Cerrar sesión
                        </button>
                    </div>

                    <div className="welcome-message">
                        <p>Selecciona un área para ver sus registros.</p>
                    </div>

                    {/* Botonera estilo Inocuidad */}
                    <div className="grid-botones">
                        {secciones.map((s, i) => (
                            <button key={i} className="boton-grid" onClick={() => navigate(s.ruta)}>
                                {s.titulo}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Aquí se pintan submenús y formularios */}
            <Outlet />
        </div>
    );
}
