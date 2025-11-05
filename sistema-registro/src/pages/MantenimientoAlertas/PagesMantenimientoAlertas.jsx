import React from "react";
import { Outlet } from "react-router-dom";

export default function PagesMantenimientoAlertas() {
    // Contenedor puro: no renderiza MantenimientoAlertas, solo Outlet
    return <Outlet />;
}
