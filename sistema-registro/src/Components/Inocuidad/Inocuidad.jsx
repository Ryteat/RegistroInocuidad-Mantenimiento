import React from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import './Inocuidad.css';
import logo2 from "../../assets/mosca.png";

function Inocuidad() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRootPath = location.pathname === "/Inocuidad";

    // Matriz de botones organizados por categorías
    const botones = [
        {
            titulo: 'Registro de Limpieza del Area de Hatchery',
            ruta: '/Inocuidad/RegistroLimpiezaHatchery',
            cols: 2,
            className: 'boton-grid oven-button'
        },
        {
            titulo: 'Registro de Limpieza del Area de Cosecha',
            ruta: '/Inocuidad/RegistroLimpiezaCosecha',
            cols: 2,
            className: 'boton-grid oven-button'
        },
        {
            titulo: "Registro de Limpieza de Tarimas y Cajas de Colores",
            ruta: "/Inocuidad/LimpiezaTarimasCajas",
            cols: 2,
            className: "boton-grid oven-button", // usa tu clase global de botones
        }, {
            titulo: 'Registro de Limpieza del Area de Dieta y Siembra',
            ruta: '/Inocuidad/LimpiezaDietaSiembra',
            cols: 2,
            className: 'boton-grid oven-button'
        },

    ];

    return (
        <div className="inocuidad-container">
            {isRootPath && (
                <>
                    <header className="inocuidad-header">
                        <img src={logo2} alt="Logo" className="logo2" />
                        <h1>Registros de Inocuidad</h1>
                    </header>

                    <div className="welcome-message">
                        <p>Sistema de registro para operaciones de inocuidad</p>
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

export default Inocuidad;