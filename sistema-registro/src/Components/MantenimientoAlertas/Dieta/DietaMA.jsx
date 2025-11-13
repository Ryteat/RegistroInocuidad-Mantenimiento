// src/Components/MantenimientoAlertas/Dieta/DietaMA.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "../InfraestructuraDePlanta/InfraestructuraDePlanta.css";

/**
 * Catálogo de submenús (categorías) y sus registros para DIETA
 *
 * NOTA:
 * - Ya dejamos funcional el primer registro: D-BS-G Bomba Sumergible — General
 * - Los demás botones los podemos ir llenando cuando definamos sus registros.
 */
const CATEGORIES = [
    {
        key: "BombaSumergible",
        titulo: "Bomba Sumergible",
        botones: [
            {
                titulo: "*D-BS-G* Bomba Sumergible — General",
                ruta: "/MantenimientoAlertas/Dieta/BombaSumergibleGeneral",
            },
            // Aquí después podemos agregar más registros de Bomba Sumergible si se requieren
        ],
    },
    {
        key: "Bandas",
        titulo: "Bandas Transportadoras",
        botones: [
            // Ejemplo futuro:
            // { titulo: "*D-BAN-G* Bandas — General", ruta: "/MantenimientoAlertas/Dieta/BandasGeneral" },
        ],
    },
    {
        key: "Mezcladora",
        titulo: "Mezcladora",
        botones: [
            {
                titulo: "*D-M-G* Mezcladora — General",
                ruta: "/MantenimientoAlertas/Dieta/MezcladoraGeneral",
            },
        ],
    },
    {
        key: "ContenedorCascara",
        titulo: "Contenedor de Cáscaras",
        botones: [

        ],
    },
    {
        key: "ContenedorCascara",
        titulo: "Contenedor de Cáscaras",
        botones: [
            {
                titulo: "*D-CC-G* Contenedor de Cáscaras — General",
                ruta: "/MantenimientoAlertas/Dieta/ContenedorCascaraGeneral",
            },
        ],
    },
];

export default function DietaMA() {
    const navigate = useNavigate();
    const location = useLocation();

    // Raíz del módulo Dieta: muestra los submenús
    const isRootPath = location.pathname === "/MantenimientoAlertas/Dieta";

    if (isRootPath) {
        return (
            <div className="infraestructura-container">
                <header className="infraestructura-header">
                    <div className="logo-infraestructura-container">
                        <img src={logo2} alt="Logo" className="logo2" />
                    </div>
                    <h1>Registros de Dieta</h1>
                </header>

                <div className="welcome-message">
                    <p>Selecciona un submenú para ver sus registros:</p>
                </div>

                <div className="grid-botones">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.key}
                            className="boton-grid oven-button cols-2"
                            onClick={() => navigate(c.key)} // navegación RELATIVA (igual que Horno/Inocuidad)
                        >
                            {c.titulo}
                        </button>
                    ))}

                    {/* Igual que Horno: volver atrás en el historial al menú de MantenimientoAlertas */}
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

    // Vista de categoría: /MantenimientoAlertas/Dieta/:cat
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
                <h1>Dieta — {category ? category.titulo : "Categoría"}</h1>
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
