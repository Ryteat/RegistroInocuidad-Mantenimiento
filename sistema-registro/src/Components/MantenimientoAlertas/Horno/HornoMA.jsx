// src/Components/MantenimientoAlertas/Horno/HornoMA.jsx
import React from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";
import "../InfraestructuraDePlanta/InfraestructuraDePlanta.css";

//Es el menu segun el Equipo y dentro de cada van los REGISTROS JV
const CATEGORIES = [
    {
        key: "Empacadora",
        titulo: "Empacadora de Larva",
        botones: [
            { titulo: "*H-EL-SN* Sistema Neumático — Empacadora de Larva", ruta: "/MantenimientoAlertas/Horno/SistemaNeumatico" },
            { titulo: "*H-EL-MR* Motor Reductor — Empacadora de Larva", ruta: "/MantenimientoAlertas/Horno/MotorReductor" },
            { titulo: "*H-EL-V* Vibrador — Empacadora de Larva", ruta: "/MantenimientoAlertas/Horno/Vibrador" },
        ],
    },
    {
        key: "Enfriador",
        titulo: "Enfriador de Larva",
        botones: [
            { titulo: "*H-ENF-MR* Motor Reductor — Enfriador de Larva", ruta: "/MantenimientoAlertas/Horno/MotorReductorEnfriador" },
            { titulo: "*H-ENF-LB* Lubricación de Bandas — Enfriador de Larva", ruta: "/MantenimientoAlertas/Horno/LubricacionBandasEnfriador" },
            { titulo: "*H-ENF-V* Vibrador — Enfriador de Larva", ruta: "/MantenimientoAlertas/Horno/VibradorEnfriador" },
        ],
    },
    {
        key: "BandaSalida",
        titulo: "Banda de Salida",
        botones: [
            { titulo: "*H-BS-G* Banda de Salida — General", ruta: "/MantenimientoAlertas/Horno/BandaSalidaGeneral" },
        ],
    },
    {
        key: "BandaEntrada",
        titulo: "Banda de Entrada",
        botones: [
            { titulo: "*H-BE-G* Banda de Entrada — General", ruta: "/MantenimientoAlertas/Horno/BandaEntradaGeneral" },
        ],
    },
    {
        key: "Multilevel",
        titulo: "Horno Multilevel",
        botones: [
            { titulo: "*H-HM-V* Horno Multilevel — Vibrador", ruta: "/MantenimientoAlertas/Horno/VibradorHornoMultilevel" },
            { titulo: "*H-HM-LG* Horno Multilevel — Línea de Gas GLP", ruta: "/MantenimientoAlertas/Horno/LineaGasGLPHornoMultilevel" },
            { titulo: "*H-HM-TT* Horno Multilevel — Transmisión de Turbina", ruta: "/MantenimientoAlertas/Horno/TransmisionTurbinaHornoMultilevel" },
            { titulo: "*H-HM-LB* Horno Multilevel — Lubricación de Bandas", ruta: "/MantenimientoAlertas/Horno/LubricacionBandasHornoMultilevel" },
            { titulo: "*H-HM-SPT* Horno Multilevel — Sensor PT100 (Trimestral)", ruta: "/MantenimientoAlertas/Horno/SensorPT100" },
        ],
    },
    {
        key: "Selladora",
        titulo: "Selladora Banda Continua",
        botones: [
            { titulo: "*H-SBC-G* Selladora Banda Continua — General", ruta: "/MantenimientoAlertas/Horno/SelladoraBandaContinuaGeneral" },
        ],
    },
];

export default function HornoMA() {
    const navigate = useNavigate();
    const location = useLocation();

    // Raíz del módulo Horno JV
    const isRootPath = location.pathname === "/MantenimientoAlertas/Horno";

    // Si estamos en la raíz: mostrar los submenús (categorías) JV
    if (isRootPath) {
        return (
            <div className="infraestructura-container">
                <header className="infraestructura-header">
                    <div className="logo-infraestructura-container">
                        <img src={logo2} alt="Logo" className="logo2" />
                    </div>
                    <h1>Registros de Horno</h1>
                </header>

                <div className="welcome-message">
                    <p>Selecciona un submenú para ver sus registros:</p>
                </div>

                <div className="grid-botones">
                    {CATEGORIES.map((c) => (
                        <button
                            key={c.key}
                            className="boton-grid oven-button cols-2"
                            onClick={() => navigate(c.key)}
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

    // Vista de categoría: /MantenimientoAlertas/Horno/:cat JV
    const pathParts = location.pathname.split("/");
    const catKey = pathParts[pathParts.length - 1];
    const category = CATEGORIES.find(
        (c) => c.key.toLowerCase() === catKey.toLowerCase()
    );
    //Vista de Horno Multilevel JV
    return (
        <div className="infraestructura-container">
            <header className="infraestructura-header">
                <div className="logo-infraestructura-container">
                    <img src={logo2} alt="Logo" className="logo2" />
                </div>
                <h1>Horno - {category ? category.titulo : "Categoría"}</h1>
                <div className="welcome-message">
                    <p>Estos son los registros que pertenecen a esta categoría de Horno Multilevel:</p>
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
                            Volver al Menú de Horno
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
