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

    // Tomamos el departamento que venga del state; si no viene, habilitamos todo por defecto
    const depState = location.state?.departamento;
    const fallbackDeps =
        "Hatchery,Dieta,Horno,Calidad,Cosecha,Mantenimiento,Inocuidad,Gerencia,Visualizar,MantenimientoAlertas";
    const departamento = depState || fallbackDeps;

    const goMenuPrincipal = () => {
        navigate("/MenuPrincipal", {
            state: { departamento },
            replace: false,
        });
    };

    const secciones = [
        { titulo: "Infraestructura de Planta", ruta: "/MantenimientoAlertas/Infraestructura" },
        { titulo: "Horno", ruta: "/MantenimientoAlertas/Horno" },
        { titulo: "Dieta", ruta: "/MantenimientoAlertas/Dieta" },
        { titulo: "Crecimiento", ruta: "/MantenimientoAlertas/Crecimiento" },
        { titulo: "Cosecha", ruta: "/MantenimientoAlertas/Cosecha" },
    ];

    return (
        <div className="mantenimientoAlertas-container">
            {isRootPath && (
                <>
                    <header className="header-alertas">
                        <img src={logo2} alt="mosca" className="logo2" />
                        <h1>Alertas de Mantenimiento</h1>
                    </header>

                    <div className="welcome-message">
                        <p>Este es el Menú de Registros del Sistema de Mantenimiento por Áreas.</p>
                    </div>

                    {/* Botonera principal (áreas) */}
                    <div className="grid-botones">
                        {secciones.map((s, i) => (
                            <button
                                key={i}
                                className="boton-grid cols-2"
                                onClick={() => navigate(s.ruta, { state: { departamento } })}
                            >
                                {s.titulo}
                            </button>
                        ))}
                    </div>

                    {/* ===== Bloque de acciones separado visualmente ===== */}
                    <div className="acciones-bloque">
                        <div className="bloque-sep" />
                        <div className="grid-botones">
                            <button
                                className="boton-grid cols-2"
                                onClick={() => navigate("/MantenimientoAlertas/Alertas")}
                            >
                                Ver Sistema de Alertas
                            </button>
                            <button className="boton-grid cols-2" onClick={goMenuPrincipal}>
                                Volver al Menú Principal
                            </button>
                            <button
                                className="boton-grid logout-button cols-2"
                                onClick={() => navigate("/", { replace: true })}
                            >
                                Cerrar sesión
                            </button>
                        </div>
                    </div>
                </>
            )}

            <Outlet />
        </div>
    );
}
