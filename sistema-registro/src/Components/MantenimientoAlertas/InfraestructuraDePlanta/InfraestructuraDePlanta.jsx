import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './InfraestructuraDePlanta.css';
import logo2 from "../../assets/mosca.png";

function InfraestructuraDePlanta() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRootPath = location.pathname === "/InfraestructuraDePlanta";

    // Matriz de botones organizados por categorías
    const botones = [
        {
            titulo: 'Registro de Mantenimiento de Panel Electrico',
            ruta: 'RegistroMantenimientoPanelElectrico',
            cols: 1,
            className: 'boton-grid oven-button'
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
                        <h1>Registros de Infraestructura</h1>
                    </header>

                    <div className="welcome-message">
                        <p>Sistema de registro para operaciones de infraestructura:</p>
                    </div>

                    <div className="grid-botones">
                        {botones.map((boton, index) => (
                            <button
                                key={index}
                                className={`${boton.className} cols-${boton.cols}`}
                                onClick={() => navigate(boton.ruta)}
                            >
                                <span className="button-main-text">{boton.titulo}</span>
                                {boton.subtitulo && <span className="button-subtext">{boton.subtitulo}</span>}
                            </button>
                        ))}

                        <button
                            className="boton-grid logout-button cols-2"
                            onClick={() => navigate(-1)}
                        >
                            Volver al Menú Principal
                        </button>
                    </div>
                </>
            )}

            <Outlet />
        </div>
    );
}

export default InfraestructuraDePlanta;