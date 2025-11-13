// src/Components/MantenimientoAlertas/Alertas/ContenedorAlertas.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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

/* ================== Helpers de fecha — SEGUROS ================== */
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = String(isoDateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const fmtDMY = (iso) => {
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};
const semanaIso = (isoStr) => {
    const d = parseYMD(isoStr);
    if (!d) return { semana: "—", anio: "" };
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

/* ================== Rutas de formularios ================== */
const FORM_MAP = {
    IN1: "/MantenimientoAlertas/PanelElectrico",
    IN2: "/MantenimientoAlertas/Iluminacion",
    IN3: "/MantenimientoAlertas/CuartosElectricos",
    "H-EL-SN": "/MantenimientoAlertas/Horno/SistemaNeumatico",
    "H-EL-MR": "/MantenimientoAlertas/Horno/MotorReductor",
    "H-EL-V": "/MantenimientoAlertas/Horno/Vibrador",
    "H-ENF-MR": "/MantenimientoAlertas/Horno/MotorReductorEnfriador",
    "H-ENF-LB": "/MantenimientoAlertas/Horno/LubricacionBandasEnfriador",
    "H-ENF-V": "/MantenimientoAlertas/Horno/VibradorEnfriador",
    "H-BS-G": "/MantenimientoAlertas/Horno/BandaSalidaGeneral",
    "H-BE-G": "/MantenimientoAlertas/Horno/BandaEntradaGeneral",
    "H-V-HM": "/MantenimientoAlertas/Horno/VibradorHornoMultilevel",
    "H-HM-LG": "/MantenimientoAlertas/Horno/LineaGasGLPHornoMultilevel",
    "H-HM-TT": "/MantenimientoAlertas/Horno/TransmisionTurbinaHornoMultilevel",
    "H-HM-LB": "/MantenimientoAlertas/Horno/LubricacionBandasHornoMultilevel",
    "H-SBC-G": "/MantenimientoAlertas/Horno/SelladoraBandaContinuaGeneral",
    "H-HM-SPT": "/MantenimientoAlertas/Horno/SensorPT100",
    "H-HM-TT": "/MantenimientoAlertas/Horno/TransmisionTurbinaHornoMultilevel",
    "D-BSG-G": "/MantenimientoAlertas/Dieta/BombaSumergibleGeneral",
};

export default function ContenedorAlertas() {
    const toast = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Trae el departamento; si no viene, habilita todos por defecto
    const depState = location.state?.departamento;
    const departamento =
        depState ||
        "Hatchery,Dieta,Horno,Calidad,Cosecha,Mantenimiento,Inocuidad,Gerencia,Visualizar,MantenimientoAlertas";

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
                .from("vw_alertas_unificado")
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

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [periodo]);

    // Debounce de buscador
    useEffect(() => {
        const t = setTimeout(() => setGlobalFilter(searchInput), 220);
        return () => clearTimeout(t);
    }, [searchInput]);

    const semanaBody = (r) =>
        r.proximo_mantenimiento ? `${r.semana_proximo} año ${r.anio_proximo}` : "—";

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
            <div
                className="flex align-items-center justify-content-center"
                style={{ gap: 12, position: "relative" }}
            >
                <h1 className="m-0 flex align-items-center" style={{ gap: 12 }}>
                    <img src={logo2} alt="mosca" className="logo2" />
                    <span>Alertas de Mantenimiento</span>
                </h1>
                <span style={{ position: "absolute", right: 0 }}>
                    <NotificationBell navigate={navigate} />
                </span>
            </div>

            {/* Acciones superiores — CENTRADAS (wrapper grid) */}
            <div style={{ display: "grid", placeItems: "center", margin: "14px 0" }}>
                <div
                    style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        justifyContent: "center",
                        alignItems: "center",
                        width: "100%",
                        maxWidth: 900,
                    }}
                >
                    {/* ← Volver al Menú de Registros (SIN cambios) */}
                    <Button
                        label="Menú de Registros"
                        icon="pi pi-arrow-left"
                        onClick={() => navigate("/MantenimientoAlertas")}
                        style={{ width: 280, height: 44 }}
                    />
                    {/* ⌂ Volver al Menú Principal (reenviando departamento) */}
                    <Button
                        label="⌂ Volver al Menú Principal"
                        icon="pi pi-home"
                        className="p-button-secondary"
                        onClick={() =>
                            navigate("/MenuPrincipal", {
                                state: { departamento },
                                replace: false,
                            })
                        }
                        style={{ width: 280, height: 44 }}
                    />
                    {/* Cerrar sesión */}
                    <Button
                        label="Cerrar sesión"
                        icon="pi pi-sign-out"
                        severity="danger"
                        onClick={() => navigate("/", { replace: true })}
                        style={{ width: 280, height: 44 }}
                    />
                </div>
            </div>

            {/* Controles */}
            <div
                className="flex flex-wrap gap-2 align-items-center justify-content-between"
                style={{ marginBottom: 12 }}
            >
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
                    "posicion_id",
                    "equipo",
                    "registro",
                    "periodicidad",
                    "estado",
                    "ultimo_mantenimiento",
                    "proximo_mantenimiento",
                ]}
                paginator
                rows={10}
                rowsPerPageOptions={[5, 10, 25]}
                dataKey="id"
                showGridlines
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
