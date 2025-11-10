// src/Components/MantenimientoAlertas/Alertas/NotificationBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../../../supabaseClient.js";
import { Button } from "primereact/button";

// Tablas que pueden actualizarse desde la campanita
const ALLOWED_TABLES = new Set([
    "mto_paneles_electrico",
    "mto_iluminacion",
    "mto_cuartos_electricos",
    "mto_horno_empacadora_sistema_neumatico",
]);

/* ===================== Helpers de fecha SEGUROS ===================== */
// Construye Date local a partir de YYYY-MM-DD (evita TZ shift)
const parseYMD = (isoDateStr) => {
    if (!isoDateStr) return null;
    const [y, m, d] = String(isoDateStr).split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d, 0, 0, 0, 0);
};

// YYYY-MM-DD desde Date local
const toDateISO = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
        d.getDate()
    ).padStart(2, "0")}`;

// Suma de días robusta para base Date o 'YYYY-MM-DD'
const addDaysISO = (base, days) => {
    let d;
    if (typeof base === "string" && /^\d{4}-\d{2}-\d{2}$/.test(base)) {
        d = parseYMD(base);
    } else if (base instanceof Date) {
        d = new Date(base);
    } else {
        d = new Date();
    }
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + Number(days || 0));
    return toDateISO(d);
};

// Suma de años robusta para base Date o 'YYYY-MM-DD'
const addYearsISO = (base, years) => {
    let d;
    if (typeof base === "string" && /^\d{4}-\d{2}-\d{2}$/.test(base)) {
        d = parseYMD(base);
    } else if (base instanceof Date) {
        d = new Date(base);
    } else {
        d = new Date();
    }
    d.setHours(0, 0, 0, 0);
    d.setFullYear(d.getFullYear() + Number(years || 0));
    return toDateISO(d);
};

// Formato DD/MM/AAAA (para mostrar)
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
            IN1: "/MantenimientoAlertas/PanelElectrico",
            IN2: "/MantenimientoAlertas/Iluminacion",
            IN3: "/MantenimientoAlertas/CuartosElectricos",
            "H-EL-SN": "/MantenimientoAlertas/Horno/SistemaNeumatico",
        };
        const ruta = map[pos];
        if (ruta) navigate(ruta);
    };

    // +7 días (VENCIDO -> posponer una semana)
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

            // Remueve la tarjeta del panel
            setItems((prev) =>
                prev.filter((it) => !(it.id === n.id && it.tabla === n.tabla))
            );
        } catch (e) {
            console.error("No se pudo posponer 7 días:", e.message || e);
        }
    };

    // ✔ Completar — lo marca como completado y lo saca del panel
    const markCompleted = async (n) => {
        if (!ALLOWED_TABLES.has(n.tabla)) return;
        const today = toDateISO(new Date());
        try {
            // Intento ideal: si existe columna 'estado'
            const { error } = await supabase
                .from(n.tabla)
                .update({
                    estado: "COMPLETADO",
                    ultimo_mantenimiento: today,
                    proximo_mantenimiento: null,
                })
                .eq("id", n.id);

            if (error) {
                // Fallback: sin tocar esquema, empujar próximo mto. lejos
                const { error: fbErr } = await supabase
                    .from(n.tabla)
                    .update({
                        ultimo_mantenimiento: today,
                        proximo_mantenimiento: addYearsISO(today, 100),
                    })
                    .eq("id", n.id);
                if (fbErr) throw fbErr;
            }

            // Quita del panel inmediatamente
            setItems((prev) =>
                prev.filter((it) => !(it.id === n.id && it.tabla === n.tabla))
            );
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

            {/* Panel (más ancho y con scroll) */}
            {open && (
                <div
                    className="nbell-panel"
                    style={{
                        position: "absolute",
                        top: 48,
                        right: 0,
                        width: 640,
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
                        <div style={{ fontWeight: 700, fontSize: 16, color: "#111827" }}>
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

                    <div
                        style={{ height: 1, background: "#e5e7eb", margin: "8px 0 12px" }}
                    />

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            maxHeight: 420,
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
                                    padding: 12,
                                    display: "grid",
                                    gridTemplateColumns: "1fr auto",
                                    gap: 10,
                                    alignItems: "center",
                                }}
                            >
                                <div style={{ minWidth: 0 }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            gap: 8,
                                            alignItems: "center",
                                            marginBottom: 4,
                                        }}
                                    >
                                        <span
                                            style={{
                                                background:
                                                    n.estado === "VENCIDO" ? "#fee2e2" : "#dbeafe",
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
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                            title={`${n.posicion_id} — ${n.equipo}`}
                                        >
                                            {n.posicion_id} — {n.equipo}
                                        </div>
                                    </div>

                                    <div style={{ color: "#374151", fontSize: 13, lineHeight: 1.4 }}>
                                        Fecha objetivo: <b>{fmtDMY(n.proximo_mantenimiento)}</b>
                                        {n.registro ? (
                                            <>
                                                {" "}
                                                • Registro: <i>{n.registro}</i>
                                            </>
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
                                    {/* ✔ Completar */}
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
