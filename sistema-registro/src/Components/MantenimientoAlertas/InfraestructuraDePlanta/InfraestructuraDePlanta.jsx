import React from "react";
import { useNavigate, Outlet, useLocation } from "react-router-dom";
import "./InfraestructuraDePlanta.css";
import logo2 from "../../../assets/mosca.png";

function InfraestructuraDePlanta() {
    const navigate = useNavigate();
    const location = useLocation();
    const isRootPath = location.pathname === "/MantenimientoAlertas/Infraestructura";

    const botones = [
        { titulo: "Paneles Eléctricos (IN1)", ruta: "/MantenimientoAlertas/PanelElectrico", cols: 1, className: "boton-grid" },
        { titulo: "Iluminación (IN2)", ruta: "/MantenimientoAlertas/Iluminacion", cols: 1, className: "boton-grid" },
        { titulo: "Cuartos Eléctricos (IN3)", ruta: "/MantenimientoAlertas/CuartosElectricos", cols: 2, className: "boton-grid" },
    ];

    return (
        <div className="infraestructura-container">
            {isRootPath && (
                <>
                    <header className="infraestructura-header">
                        <div className="logo-infraestructura-container">
                            <img src={logo2} alt="Logo" className="logo2" />
                        </div>
                        <h1>Infraestructura de Planta</h1>
                        <p className="welcome-message">Selecciona el registro que deseas abrir.</p>
                    </header>

                    <div className="grid-botones">
                        {botones.map((b, i) => (
                            <button key={i} className={`${b.className} cols-${b.cols}`} onClick={() => navigate(b.ruta)}>
                                {b.titulo}
                            </button>
                        ))}
                    </div>

                    <div className="grid-botones" style={{ marginTop: 12 }}>
                        <button className="boton-grid cols-2" onClick={() => navigate("/MantenimientoAlertas")}>
                            Volver al Menu de Mantenimiento Alertas
                        </button>
                        <button className="boton-grid cols-2" onClick={() => navigate("/MenuPrincipal")}>
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
export default InfraestructuraDePlanta;
