// src/Components/MantenimientoAlertas/Alertas/NotificationBell.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import supabase from "../../../supabaseClient.js";
import { Button } from "primereact/button";

const ALLOWED_TABLES = new Set([
    "mto_paneles_electrico",
    "mto_iluminacion",
    "mto_cuartos_electricos",
]);

const addDays = (isoOrDate, days) => {
    const d = new Date(isoOrDate || new Date());
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
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
                .from("vw_infra_registros_unificado")
                .select(
                    // incluye 'tabla' para poder actualizar la tabla real
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
            ) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onDocClick);
        return () => document.removeEventListener("mousedown", onDocClick);
    }, [open]);

    const pill = (estado) => {
        const styles = {
            base: {
                display: "inline-block",
                padding: "4px 8px",
                fontSize: 12,
                fontWeight: 700,
                borderRadius: 999,
                letterSpacing: 0.3,
            },
            VENCIDO: { background: "#fee2e2", color: "#991b1b" },
            PROX7: { background: "#dbeafe", color: "#1e40af" },
        };
        return (
            <span style={{ ...styles.base, ...(styles[estado] || {}) }}>
                {estado}
            </span>
        );
    };

    const goToForm = (pos) => {
        const map = {
            IN1: "/MantenimientoAlertas/PanelElectrico",
            IN2: "/MantenimientoAlertas/Iluminacion",
            IN3: "/MantenimientoAlertas/CuartosElectricos",
        };
        const ruta = map[pos];
        if (ruta) navigate(ruta);
    };

    const snooze7Days = async (n) => {
        // Solo permitir si viene marcado VENCIDO
        if (n.estado !== "VENCIDO") return;
        // Seguridad: solo tablas conocidas
        if (!ALLOWED_TABLES.has(n.tabla)) return;

        try {
            // Nuevo próximo mantenimiento = hoy + 7 días
            const newDate = addDays(new Date(), 7);

            const { error } = await supabase
                .from(n.tabla)
                .update({ proximo_mantenimiento: newDate })
                .eq("id", n.id);
            if (error) throw error;

            // Remueve la tarjeta del panel inmediatamente
            setItems((prev) => prev.filter((it) => !(it.id === n.id && it.tabla === n.tabla)));
        } catch (e) {
            // opcional: podrías mostrar un toast aquí si lo deseas
            console.error("No se pudo posponer 7 días:", e.message || e);
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

            {/* Panel */}
            {open && (
                <div
                    className="nbell-panel"
                    style={{
                        position: "absolute",
                        top: 48,
                        right: 0,
                        width: 420,
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

                    <div style={{ height: 1, background: "#e5e7eb", margin: "8px 0 12px" }} />

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                            maxHeight: 360,
                            overflowY: "auto",
                            paddingRight: 4,
                        }}
                    >
                        {!items.length && !loading && (
                            <div style={{ color: "#6b7280", fontSize: 14, textAlign: "center", padding: "12px 0" }}>
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
                                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                                        {pill(n.estado)}
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
                                        Fecha objetivo: <b>{n.proximo_mantenimiento || "—"}</b>
                                        {n.registro ? <> • Registro: <i>{n.registro}</i></> : null}
                                    </div>
                                </div>

                                <div style={{ display: "flex", gap: 8 }}>
                                    {/* Mini botón +7d (solo VENCIDO) */}
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
