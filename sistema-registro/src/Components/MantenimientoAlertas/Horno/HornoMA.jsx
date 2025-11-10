import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import logo2 from "../../../assets/mosca.png";

// Reutilizamos el mismo CSS de Infraestructura para no crear otro archivo
import "../InfraestructuraDePlanta/InfraestructuraDePlanta.css";

export default function HornoMA() {
    const navigate = useNavigate();
    const location = useLocation();
    // Evita pantallas en blanco por variantes de slash
    const isRootPath =
        location.pathname === "/MantenimientoAlertas/Horno" ||
        location.pathname.endsWith("/MantenimientoAlertas/Horno");

    const botones = [
        {
            titulo: "*H-EL-SN* Sistema Neumático — Empacadora de Larva ",
            ruta: "/MantenimientoAlertas/Horno/SistemaNeumatico",
            cols: 2,
            className: "boton-grid",
        },
        {
            titulo: "*H-EL-MR* Motor Reductor — Empacadora de Larva ",
            ruta: "/MantenimientoAlertas/Horno/MotorReductor",
            cols: 2,
            className: "boton-grid"
        },

        {
            titulo: "*H-EL-V* Vibrador - Empacadora Larva",
            ruta: "/MantenimientoAlertas/Horno/Vibrador",
            cols: 2,
            className: "boton-grid"
        },
        {
            titulo: "*H-ENL-MR* Motor Reductor - Enfriador de Larva ",
            ruta: "/MantenimientoAlertas/Horno/MotorReductorEnfriador",
            cols: 2,
            className: "boton-grid"
        },

        {
            titulo: "*H-EL-LB* Lubricación de Bandas - Enfriador de Larva",
            ruta: "/MantenimientoAlertas/Horno/LubricacionBandasEnfriador",
            cols: 2,
            className: "boton-grid"
        },


    ];

    return (
        <div className="infraestructura-container">
            {isRootPath && (
                <>
                    <header className="infraestructura-header">
                        <div className="logo-infraestructura-container">
                            <img src={logo2} alt="Logo" className="logo2" />
                        </div>
                        <h1>Horno — Mantenimiento/Alertas</h1>
                        <p className="welcome-message">Selecciona el registro que deseas abrir.</p>
                    </header>

                    <div className="grid-botones">
                        {botones.map((b, i) => (
                            <button
                                key={i}
                                className={`${b.className} cols-${b.cols}`}
                                onClick={() => navigate(b.ruta)}
                            >
                                {b.titulo}
                            </button>
                        ))}
                    </div>

                    <div className="grid-botones" style={{ marginTop: 12 }}>
                        <button
                            className="boton-grid cols-2"
                            onClick={() => navigate("/MantenimientoAlertas")}
                        >
                            Volver al Menú de Mantenimiento Alertas
                        </button>
                        <button
                            className="boton-grid cols-2"
                            onClick={() => navigate("/MenuPrincipal")}
                        >
                            Volver al Menú Principal
                        </button>
                        <button className="boton-grid logout-button cols-2" onClick={() => navigate("/")}>
                            Cerrar sesión
                        </button>
                    </div>
                </>
            )}

            <Outlet />
        </div>
    );
}
