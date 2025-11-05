// src/Components/MantenimientoAlertas/Alertas/ContenedorAlertas.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient.js";
import logo2 from "../../../assets/mosca.png";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { Toast } from "primereact/toast";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";

import NotificationBell from "./NotificationBell.jsx";

// Helpers de fecha
const fmtDMY = (iso) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};

// Mapa de formularios por ID (posicion_id)
const FORM_MAP = {
    IN1: "/MantenimientoAlertas/PanelElectrico",
    IN2: "/MantenimientoAlertas/Iluminacion",
    IN3: "/MantenimientoAlertas/CuartosElectricos",
};

// util semana ISO (fallback si la vista no trae semana_proximo/anio_proximo)
const semanaIso = (isoStr) => {
    if (!isoStr) return { semana: "—", anio: "" };
    const d = new Date(isoStr);
    const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNr = (target.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
    const week =
        1 +
        Math.round(
            ((target.getTime() - firstThursday.getTime()) / 86400000 -
                3 +
                ((firstThursday.getUTCDay() + 6) % 7)) /
            7
        );
    return { semana: String(week).padStart(2, "0"), anio: target.getUTCFullYear() };
};

export default function ContenedorAlertas() {
    const toast = useRef(null);
    const navigate = useNavigate();

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);

    // Buscador con debounce simple
    const [searchInput, setSearchInput] = useState("");
    const [globalFilter, setGlobalFilter] = useState("");

    // Filtro por periodicidad
    const [periodo, setPeriodo] = useState("todos");

    const showToast = (severity, summary, detail, life = 3000) =>
        toast.current?.show({ severity, summary, detail, life });

    const fetchRows = async () => {
        try {
            setLoading(true);
            let q = supabase
                .from("vw_infra_registros_unificado")
                .select(`
          tabla, id, posicion_id, equipo, registro, periodicidad,
          ultimo_mantenimiento, proximo_mantenimiento,
          semana_proximo, anio_proximo, estado
        `)
                .order("posicion_id", { ascending: true });

            if (periodo !== "todos") q = q.eq("periodicidad", periodo);

            const { data, error } = await q;
            if (error) throw error;

            const mapped = (data || []).map((r) => {
                if (!r.proximo_mantenimiento) return r;
                if (r.semana_proximo && r.anio_proximo) return r;
                const { semana, anio } = semanaIso(r.proximo_mantenimiento);
                return { ...r, semana_proximo: semana, anio_proximo: anio };
            });

            setRows(mapped);
        } catch (e) {
            console.error(e);
            showToast("error", "Error", e.message || "No se pudieron cargar las alertas");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRows(); }, [periodo]);

    // Debounce de buscador
    useEffect(() => {
        const t = setTimeout(() => setGlobalFilter(searchInput), 220);
        return () => clearTimeout(t);
    }, [searchInput]);

    const semanaBody = (r) => r.proximo_mantenimiento ? `${r.semana_proximo} año ${r.anio_proximo}` : "—";

    const accionesBody = (r) => (
        <div className="flex gap-2">
            <Button
                label="Abrir"
                icon="pi pi-external-link"
                size="small"
                onClick={() => {
                    const ruta = FORM_MAP[r.posicion_id];
                    if (!ruta) {
                        showToast("warn", "Sin formulario", `Aún no hay formulario para ${r.posicion_id}`);
                        return;
                    }
                    navigate(ruta);
                }}
            />
        </div>
    );

    return (
        <div className="controlrendcosechayfrass-container">
            <Toast ref={toast} />

            {/* Encabezado + campanita a la derecha */}
            <div className="flex align-items-center justify-content-center" style={{ gap: 12, position: "relative" }}>
                <h1 className="m-0 flex align-items-center" style={{ gap: 12 }}>
                    <img src={logo2} alt="mosca" className="logo2" />
                    <span>Alertas de Mantenimiento</span>
                </h1>
                <span style={{ position: "absolute", right: 0 }}>
                    <NotificationBell navigate={navigate} />
                </span>
            </div>

            {/* Acciones superiores (sin +Nuevo aquí) */}
            <div className="flex justify-content-center gap-2 mt-3 mb-3">
                <Button label="Volver al Menú de Registros" icon="pi pi-arrow-left"
                    onClick={() => navigate("/MantenimientoAlertas")} />
                <Button label="Cerrar sesión" icon="pi pi-sign-out" severity="danger"
                    onClick={() => navigate("/", { replace: true })} />
            </div>

            {/* Controles */}
            <div className="flex flex-wrap gap-2 align-items-center justify-content-between" style={{ marginBottom: 12 }}>
                <div className="flex gap-2 align-items-center" style={{ flex: 1, minWidth: 280 }}>
                    <span className="p-input-icon-left" style={{ width: "100%" }}>
                        <i className="pi pi-search" />
                        <InputText
                            type="search"
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Buscar por ID (ej. IN1), equipo, etc."
                            style={{ width: "100%" }}
                            autoComplete="off"
                        />
                    </span>
                </div>

                <div className="flex gap-2">
                    <Dropdown
                        value={periodo}
                        onChange={(e) => setPeriodo(e.value)}
                        options={[
                            { label: "Todas periodicidades", value: "todos" },
                            { label: "Mensual", value: "MENSUAL" },
                            { label: "Semanal", value: "SEMANAL" },
                            { label: "Bimensual", value: "BIMENSUAL" },
                            { label: "Trimestral", value: "TRIMESTRAL" },
                            { label: "Semestral", value: "SEMESTRAL" },
                            { label: "Anual", value: "ANUAL" },
                        ]}
                        placeholder="Periodicidad"
                        style={{ minWidth: 180 }}
                    />
                </div>
            </div>

            <DataTable
                value={rows}
                loading={loading}
                globalFilter={globalFilter}
                globalFilterFields={[
                    "posicion_id", "equipo", "registro", "periodicidad",
                    "estado", "ultimo_mantenimiento", "proximo_mantenimiento",
                ]}
                paginator rows={10} rowsPerPageOptions={[5, 10, 25]}
                dataKey="id" showGridlines
                paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                currentPageReportTemplate="Mostrando del {first} al {last} de {totalRecords} Registros"
                emptyMessage="No hay registros para mostrar"
            >
                <Column field="posicion_id" header="Posición" sortable />
                <Column field="equipo" header="Equipo" sortable />
                <Column field="registro" header="Registro" />
                <Column field="periodicidad" header="Periodicidad" />
                <Column header="Último Mantenimiento" body={(r) => fmtDMY(r.ultimo_mantenimiento)} sortable />
                <Column header="Próximo Mantenimiento" body={(r) => fmtDMY(r.proximo_mantenimiento)} sortable />
                <Column header="Semana" body={semanaBody} />
                <Column field="estado" header="Estado" />
                <Column header="Acciones" body={accionesBody} style={{ width: "10rem" }} />
            </DataTable>
        </div>
    );
}
