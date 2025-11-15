// src/Components/MantenimientoAlertas/Cosecha/CosechaMA.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "../InfraestructuraDePlanta/InfraestructuraDePlanta.css";

/**
 * Menú de Cosecha (Mantenimiento / Alertas)
 *
 * Categorías actuales:
 * - Tamiz
 * - Panel de Control
 */
const CATEGORIES = [
    {
        key: "Tamiz",
        titulo: "Tamiz",
        botones: [
            {
                titulo:
                    "COS-T-REM Tamiz — Revisión de estructura y malla",
                ruta: "/MantenimientoAlertas/Cosecha/TamizRevisionEstructuraMalla",
            },
            {
                titulo: "COS-T-M Tamiz — Motor",
                ruta: "/MantenimientoAlertas/Cosecha/TamizMotor",
            },
        ],
    },
    {
        key: "PanelControl",
        titulo: "Panel de Control",
        botones: [
            {
                titulo: "COS-PC-G Panel de Control — General",
                ruta: "/MantenimientoAlertas/Cosecha/PanelControlGeneral",
            },
        ],
    },
];

export default function CosechaMA() {
    const navigate = useNavigate();
    const location = useLocation();

    const isRootPath =
        location.pathname === "/MantenimientoAlertas/Cosecha";

    // Vista raíz: muestra solo los botones de submenús (Tamiz, Panel de Control)
    if (isRootPath) {
        return (
            <div className="infraestructura-container">
                <header className="infraestructura-header">
                    <div className="logo-infraestructura-container">
                        <img src={logo2} alt="Logo" className="logo2" />
                    </div>
                    <h1>Registros de Cosecha</h1>
                </header>

                <div className="welcome-message">
                    <p>Selecciona un submenú para ver sus registros:</p>
                </div>

                <div className="grid-botones">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.key}
                            className="boton-grid oven-button cols-2"
                            onClick={() => navigate(c.key)} // navegación relativa
                        >
                            {c.titulo}
                        </button>
                    ))}

                    <button
                        className="boton-grid logout-button cols-2"
                        onClick={() => navigate(-1)}
                    >
                        Volver al Menú de Registros de Mantenimiento
                    </button>
                </div>

                <Outlet />
            </div>
        );
    }

    // Vista de categoría: /MantenimientoAlertas/Cosecha/:cat
    const pathParts = location.pathname.split("/");
    const catKey = pathParts[pathParts.length - 1];
    const category = CATEGORIES.find(
        (c) => c.key.toLowerCase() === catKey.toLowerCase()
    );

    return (
        <div className="infraestructura-container">
            <header className="infraestructura-header">
                <div className="logo-infraestructura-container">
                    <img src={logo2} alt="Logo" className="logo2" />
                </div>
                <h1>Cosecha — {category ? category.titulo : "Categoría"}</h1>
            </header>

            <div className="grid-botones">
                {category ? (
                    <>
                        {category.botones.map((b, i) => (
                            <button
                                key={i}
                                className="boton-grid oven-button cols-2"
                                onClick={() => navigate(b.ruta)}
                            >
                                {b.titulo}
                            </button>
                        ))}

                        <button
                            className="boton-grid cols-2"
                            onClick={() =>
                                navigate("/MantenimientoAlertas/Cosecha")
                            }
                        >
                            Volver a Submenús
                        </button>
                        <button
                            className="boton-grid logout-button cols-2"
                            onClick={() => navigate(-1)}
                        >
                            Volver al Menú Principal
                        </button>
                    </>
                ) : (
                    <div className="boton-grid cols-4">
                        Categoría no encontrada
                    </div>
                )}
            </div>

            <Outlet />
        </div>
    );
}
