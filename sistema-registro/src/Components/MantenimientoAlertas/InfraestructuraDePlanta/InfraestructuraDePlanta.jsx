// src/Components/MantenimientoAlertas/InfraestructuraDePlanta/InfraestructuraDePlanta.jsx
import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./InfraestructuraDePlanta.css";
import logo2 from "../../../assets/mosca.png";

const BASE_PATH = "/MantenimientoAlertas/InfraestructuraDePlanta";

function InfraestructuraDePlanta() {
    const navigate = useNavigate();
    const location = useLocation();

    // Ojo con el basename "/ProNuvo": por eso usamos endsWith
    const isRootPath =
        location.pathname === BASE_PATH ||
        location.pathname.endsWith("/MantenimientoAlertas/InfraestructuraDePlanta");

    const botones = [
        {
            titulo: " *IN-PN-G* Paneles Eléctricos - General",
            ruta: `${BASE_PATH}/PanelElectrico`,
            cols: 1,
            className: "boton-grid",
        },
        {
            titulo: "*IN-I-G* Iluminación - General",
            ruta: `${BASE_PATH}/Iluminacion`,
            cols: 1,
            className: "boton-grid",
        },
        {
            titulo: "*IN-CE-G* Cuartos Eléctricos - General",
            ruta: `${BASE_PATH}/CuartosElectricos`,
            cols: 2,
            className: "boton-grid",
        },
    ];

    return (
        <div className="infraestructura-container">
            {isRootPath && (
                <>
                    <header className="infraestructura-header">
                        <div className="logo-infraestructura-container">

                        </div>
                        <h1> <img src={logo2} alt="Logo" className="logo2" />Infraestructura de Planta

                        </h1>
                        <p className="welcome-message">
                            Selecciona el registro que deseas abrir.
                        </p>
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
                            Volver al Menú de Registros de Mantenimiento
                        </button>

                        <button
                            className="boton-grid logout-button cols-2"
                            onClick={() => navigate("/")}
                        >
                            Cerrar sesión
                        </button>
                    </div>
                </>
            )}

            <Outlet />
        </div>
    );
}

export default InfraestructuraDePlanta;
