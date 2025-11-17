// src/Components/MantenimientoAlertas/Alertas/NotificationBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../../../supabaseClient.js";
import { Button } from "primereact/button";

// Tablas habilitadas para acciones rápidas
const ALLOWED_TABLES = new Set([
    "mto_paneles_electrico",
    "mto_iluminacion",
    "mto_cuartos_electricos",
    "mto_horno_empacadora_sistema_neumatico",
    "mto_horno_empacadora_motor_reductor",
    "mto_horno_empacadora_vibrador",
    "mto_horno_empacadora_motor_reductor_enfriador",
    "mto_horno_enfriador_motor_reductor",
    "mto_horno_enfriador_lubricacion_bandas",
    "mto_horno_enfriador_vibrador",
    "mto_horno_banda_salida_general",
    "mto_horno_banda_entrada_general",
    "mto_horno_vibrador_horno_multilevel",
    "mto_horno_linea_gas_glp_horno_multilevel",
    "mto_horno_transmision_turbina_horno_multilevel",
    "mto_horno_lubricacion_bandas_horno_multilevel",
    "mto_horno_selladora_banda_continua_general",
    "mto_horno_multilevel_sensor_pt100",
    "mto_dieta_bomba_sumergible_general",
    "mto_dieta_mezcladora_general",
    "mto_dieta_bandas_lubricacion",
    "mto_dieta_contenedores_cascara_general",
    "mto_crecimiento_extractores_inyectores_general",
    "mto_crecimiento_paneles_general",
    "mto_crecimiento_cadenas_conveyor_general",
    "mto_crecimiento_registros_carro_rs",
    "mto_crecimiento_registros_carro_as",
    "mto_cosecha_tamiz_revision_estructura_malla",
    "mto_cosecha_tamiz_motor",
    "mto_cosecha_panel_control_general",

]);

/* ===== Helpers de fecha seguros ===== */
const parseYMD = (s) => {
    if (!s) return null;
    const [y, m, d] = String(s).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};
const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;
const addDaysISO = (base, days) => {
    let d =
        typeof base === "string" ? parseYMD(base) : base instanceof Date ? new Date(base) : new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Number(days || 0));
    return toDateISO(d);
};
const addYearsISO = (base, years) => {
    let d =
        typeof base === "string" ? parseYMD(base) : base instanceof Date ? new Date(base) : new Date();
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() + Number(years || 0));
    return toDateISO(d);
};
const fmtDMY = (iso) => {
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};

export default function NotificationBell({ navigate }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState([]);
    const anchorRef = useRef(null);

    const dangerCount = useMemo(
        () => items.filter((i) => i.estado === "VENCIDO").length,
        [items]
    );

    const load = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("vw_alertas_unificado")
                .select(
                    "tabla,id,posicion_id,equipo,registro,estado,proximo_mantenimiento"
                )
                .in("estado", ["VENCIDO", "PROX7"])
                .order("estado", { ascending: true });
            if (error) throw error;
            setItems(data || []);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open) load();
    }, [open]);

    useEffect(() => {
        const onDocClick = (e) => {
            if (!open) return;
            if (
                anchorRef.current &&
                !anchorRef.current.contains(e.target) &&
                !e.target.closest?.(".nbell-panel")
            )
                setOpen(false);
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    const goToForm = (pos) => {
        const map = {
            //Infraestructura de Planta JV

            IN1: "/MantenimientoAlertas/PanelElectrico",
            IN2: "/MantenimientoAlertas/Iluminacion",
            IN3: "/MantenimientoAlertas/CuartosElectricos",
            //Horno JV
            "H-EL-SN": "/MantenimientoAlertas/Horno/SistemaNeumatico",
            "H-EL-MR": "/MantenimientoAlertas/Horno/MotorReductor",
            "H-EL-V": "/MantenimientoAlertas/Horno/Vibrador",
            "H-ENF-MR": "/MantenimientoAlertas/Horno/MotorReductorEnfriador",
            "H-ENF-LB": "/MantenimientoAlertas/Horno/LubricacionBandasEnfriador",
            "H-ENF-V": "/MantenimientoAlertas/Horno/VibradorEnfriador",
            "H-BS-G": "/MantenimientoAlertas/Horno/BandaSalidaGeneral",
            "H-BE-G": "/MantenimientoAlertas/Horno/BandaEntradaGeneral",
            "H-V-HM": "/MantenimientoAlertas/Horno/VibradorHornoMultilevel",
            "H-HM-TT": "/MantenimientoAlertas/Horno/TransmisionTurbinaHornoMultilevel",
            "H-HM-LB": "/MantenimientoAlertas/Horno/LubricacionBandasHornoMultilevel",
            "H-SBC-G": "/MantenimientoAlertas/Horno/SelladoraBandaContinuaGeneral",
            "H-HM-LG": "/MantenimientoAlertas/Horno/LineaGasGLPHornoMultilevel",
            "H-HM-SPT": "/MantenimientoAlertas/Horno/SensorPT100",

            //Dieta JV
            "D-BSG-G": "/MantenimientoAlertas/Dieta/BombaSumergibleGeneral",
            "D-MEZ-G": "/MantenimientoAlertas/Dieta/MezcladoraGeneral",
            "D-B-L": "/MantenimientoAlertas/Dieta/BandasLubricacion",
            "D-CC-G": "/MantenimientoAlertas/Dieta/ContenedoresCascaraGeneral",

            // Crecimiento
            "CRE-EY-G": "/MantenimientoAlertas/Crecimiento/ExtractoresInyectoresGeneral",
            "CRE-P-G": "/MantenimientoAlertas/Crecimiento/PanelesGeneral",
            "CRE-CC-G": "/MantenimientoAlertas/Crecimiento/CadenasConveyorGeneral",
            "CRE-C-RS": "/MantenimientoAlertas/Crecimiento/CarroRS",
            "CRE-C-AS": "/MantenimientoAlertas/Crecimiento/CarroAS",

            //Cosecha JV
            "COS-PC-G": "/MantenimientoAlertas/Cosecha/PanelControlGeneral",
            "COS-T-M": "/MantenimientoAlertas/Cosecha/TamizMotor",
            "COS-T-REM": "/MantenimientoAlertas/Cosecha/TamizRevisionEstructuraMalla",
        };
        const ruta = map[pos];
        if (ruta) navigate(ruta);
    };

    const snooze7Days = async (n) => {
        if (n.estado !== "VENCIDO") return;
        if (!ALLOWED_TABLES.has(n.tabla)) return;
        try {
            const today = toDateISO(new Date());
            const next = addDaysISO(today, 7);
            const { error } = await supabase
                .from(n.tabla)
                .update({ proximo_mantenimiento: next })
                .eq("id", n.id);
            if (error) throw error;
            setItems((prev) => prev.filter((it) => !(it.id === n.id && it.tabla === n.tabla)));
        } catch (e) {
            console.error("No se pudo posponer 7 días:", e.message || e);
        }
    };

    const markCompleted = async (n) => {
        if (!ALLOWED_TABLES.has(n.tabla)) return;
        const today = toDateISO(new Date());
        try {
            const { error } = await supabase
                .from(n.tabla)
                .update({
                    estado: "COMPLETADO",
                    ultimo_mantenimiento: today,
                    proximo_mantenimiento: null,
                })
                .eq("id", n.id);

            if (error) {
                const { error: fbErr } = await supabase
                    .from(n.tabla)
                    .update({
                        ultimo_mantenimiento: today,
                        proximo_mantenimiento: addYearsISO(today, 100), // evitar alerta futuras poniendole 100 años jeje 
                    })
                    .eq("id", n.id);
                if (fbErr) throw fbErr;
            }
            setItems((prev) => prev.filter((it) => !(it.id === n.id && it.tabla === n.tabla)));
        } catch (e) {
            console.error("No se pudo completar:", e.message || e);
        }
    };

    return (
        <div ref={anchorRef} style={{ position: "relative" }}>
            {/* Botón campana */}
            <button
                onClick={() => setOpen((o) => !o)}
                title="Notificaciones"
                style={{
                    position: "relative",
                    width: 40,
                    height: 40,
                    borderRadius: "999px",
                    border: "none",
                    background: "#f1f5f9",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    boxShadow: "0 1px 2px rgba(0,0,0,.08)",
                }}
            >
                <i className="pi pi-bell" style={{ fontSize: 18 }} />
                {!!items.length && (
                    <span
                        style={{
                            position: "absolute",
                            top: -2,
                            right: -2,
                            background: dangerCount ? "#dc2626" : "#64748b",
                            color: "white",
                            borderRadius: 999,
                            fontSize: 11,
                            minWidth: 18,
                            height: 18,
                            padding: "0 6px",
                            display: "grid",
                            placeItems: "center",
                            border: "2px solid white",
                        }}
                    >
                        {items.length}
                    </span>
                )}
            </button>

            {/* Panel grande y legible */}
            {open && (
                <div
                    className="nbell-panel"
                    style={{
                        position: "absolute",
                        top: 48,
                        right: 0,
                        width: 768,                // ← más ancho
                        maxWidth: "calc(100vw - 24px)",
                        background: "white",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(0,0,0,.12)",
                        border: "1px solid #e5e7eb",
                        padding: 16,
                        zIndex: 50,
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                        }}
                    >
                        <div style={{ fontWeight: 700, fontSize: 18, color: "#111827" }}>
                            Notificaciones
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={load}
                                title="Actualizar"
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    padding: 6,
                                    borderRadius: 8,
                                }}
                            >
                                <i
                                    className={`pi ${loading ? "pi-spin pi-spinner" : "pi-refresh"}`}
                                    style={{ fontSize: 16 }}
                                />
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                title="Cerrar"
                                style={{
                                    border: "none",
                                    background: "transparent",
                                    cursor: "pointer",
                                    padding: 6,
                                    borderRadius: 8,
                                }}
                            >
                                <i className="pi pi-times" style={{ fontSize: 16 }} />
                            </button>
                        </div>
                    </div>

                    <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0 12px" }} />

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            maxHeight: 560,        // ← más alto
                            overflowY: "auto",
                            paddingRight: 4,
                        }}
                    >
                        {!items.length && !loading && (
                            <div
                                style={{
                                    color: "#6b7280",
                                    fontSize: 14,
                                    textAlign: "center",
                                    padding: "12px 0",
                                }}
                            >
                                Sin notificaciones pendientes.
                            </div>
                        )}

                        {items.map((n) => (
                            <div
                                key={`${n.tabla}-${n.id}`}
                                style={{
                                    background: "#f8fafc",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: 10,
                                    padding: 14,
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: 12,
                                    alignItems: "center",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 10,
                                            alignItems: "center",
                                            marginBottom: 6,
                                            flexWrap: "wrap",
                                        }}
                                    >
                                        <span
                                            style={{
                                                background: n.estado === "VENCIDO" ? "#fee2e2" : "#dbeafe",
                                                color: n.estado === "VENCIDO" ? "#991b1b" : "#1e40af",
                                                fontSize: 12,
                                                fontWeight: 700,
                                                padding: "4px 8px",
                                                borderRadius: 999,
                                            }}
                                        >
                                            {n.estado}
                                        </span>
                                        <div
                                            style={{
                                                fontWeight: 700,
                                                color: "#111827",
                                                // ← sin recorte: se envuelve y se lee completo
                                                whiteSpace: "normal",
                                                wordBreak: "break-word",
                                                fontSize: 15,
                                                lineHeight: 1.25,
                                            }}
                                        >
                                            {n.posicion_id} — {n.equipo}
                                        </div>
                                    </div>

                                    <div style={{ color: "#374151", fontSize: 14, lineHeight: 1.5 }}>
                                        <b>Fecha objetivo:</b> {fmtDMY(n.proximo_mantenimiento)}
                                        {n.registro ? (
                                            <> • <b>Registro:</b> <i>{n.registro}</i></>
                                        ) : null}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                    {n.estado === "VENCIDO" && (
                                        <Button
                                            icon="pi pi-plus"
                                            tooltip="Posponer 7 días"
                                            onClick={() => snooze7Days(n)}
                                            size="small"
                                            outlined
                                        />
                                    )}
                                    <Button
                                        icon="pi pi-check"
                                        tooltip="Marcar como completado"
                                        onClick={() => markCompleted(n)}
                                        size="small"
                                        severity="success"
                                        outlined
                                    />
                                    <Button
                                        label="Abrir"
                                        icon="pi pi-external-link"
                                        onClick={() => goToForm(n.posicion_id)}
                                        size="small"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
