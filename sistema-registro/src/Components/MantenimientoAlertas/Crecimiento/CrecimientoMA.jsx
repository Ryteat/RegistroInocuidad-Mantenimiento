// src/Components/MantenimientoAlertas/Crecimiento/CrecimientoMA.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "../InfraestructuraDePlanta/InfraestructuraDePlanta.css";

/**
 * Menú de Crecimiento (Mantenimiento / Alertas)
 *
 * Categorías actuales:
 * - Carro
 * - Cadenas (Conveyor)
 * - Paneles
 * - Extractores e Inyectores
 *
 * De momento SOLO tenemos funcional:
 *   CRE-EY-G  Extractores e Inyectores — General (TRIMESTRAL)
 */
const CATEGORIES = [
    {
        key: "Carro",
        titulo: "Carro",
        botones: [

            { titulo: "CRE-C-AS Carro — AS", ruta: "/MantenimientoAlertas/Crecimiento/CarroAS" },
            { titulo: "CRE-C-RS Carro — RS", ruta: "/MantenimientoAlertas/Crecimiento/CarroRS" },
        ],
    },
    {
        key: "Cadenas",
        titulo: "Cadenas (Conveyor)",
        botones: [

            { titulo: "CRE-CC-G Cadenas (Conveyor) — General", ruta: "/MantenimientoAlertas/Crecimiento/CadenasConveyorGeneral" },
        ],
    },
    {
        key: "Paneles",
        titulo: "Paneles",
        botones: [

            { titulo: "CRE-P-G Paneles — General", ruta: "/MantenimientoAlertas/Crecimiento/PanelesGeneral" },
        ],
    },
    {
        key: "ExtractoresInyectores",
        titulo: "Extractores e Inyectores",
        botones: [
            {
                titulo: "CRE-EY-G Extractores e Inyectores — General",
                ruta: "/MantenimientoAlertas/Crecimiento/ExtractoresInyectoresGeneral",
            },
        ],
    },
];

export default function CrecimientoMA() {
    const navigate = useNavigate();
    const location = useLocation();

    const isRootPath = location.pathname === "/MantenimientoAlertas/Crecimiento";

    // Vista raíz: muestra solo los botones de submenús
    if (isRootPath) {
        return (
            <div className="infraestructura-container">
                <header className="infraestructura-header">
                    <div className="logo-infraestructura-container">

                    </div>
                    <h1>   <img src={logo2} alt="Logo" className="logo2" />Registros de Crecimiento</h1>
                </header>

                <div className="welcome-message">
                    <p>Selecciona un submenú para ver sus registros:</p>
                </div>

                <div className="grid-botones">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.key}
                            className="boton-grid oven-button cols-2"
                            onClick={() => navigate(c.key)} // navegación relativa (igual que DietaMA/HornoMA)
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

    // Vista de categoría: /MantenimientoAlertas/Crecimiento/:cat
    const pathParts = location.pathname.split("/");
    const catKey = pathParts[pathParts.length - 1];
    const category = CATEGORIES.find(
        (c) => c.key.toLowerCase() === catKey.toLowerCase()
    );

    return (
        <div className="infraestructura-container">
            <header className="infraestructura-header">

                <h1><img src={logo2} alt="Logo" className="logo2" />Crecimiento — {category ? category.titulo : "Categoría"}</h1>
                <div className="welcome-message">
                    <p>Selecciona un registro a revisar:</p>
                </div>
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
                            className="boton-grid logout-button cols-2"
                            onClick={() => navigate(-1)}
                        >
                            Volver al Menú Principal
                        </button>
                    </>
                ) : (
                    <div className="boton-grid cols-4">Categoría no encontrada</div>
                )}
            </div>

            <Outlet />
        </div>
    );
}
