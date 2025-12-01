// src/Components/MantenimientoAlertas/Alertas/NotificationBell.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import supabase from "../../../supabaseClient.js";

import "primereact/resources/themes/lara-light-indigo/theme.css";
import "primeicons/primeicons.css";
import { Toast } from "primereact/toast";
import { Dialog } from "primereact/dialog";
import { Button } from "primereact/button";

import "./NotificationBell.css";

/* === Helpers básicos de fecha === */
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
const fmtDMY = (iso) => {
    const d = parseYMD(iso);
    if (!d) return "—";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    return `${dd}/${mm}/${yy}`;
};
const addDays = (ymd, days) => {
    const b = parseYMD(ymd);
    b.setDate(b.getDate() + Number(days || 0));
    return toDateISO(b);
};

/**
 * IMPORTANTE:
 * Ajusta / extiende esta lista con TODAS las tablas que quieres que aparezcan
 * en la campanita. Debe coincidir con las tablas que están en vw_alertas_unificado.
 */
const ALLOWED_TABLES = [
    // Infraestructura
    "mto_paneles_electrico",
    "mto_iluminacion",
    "mto_cuartos_electricos",
    // Horno - Empacadora
    "mto_horno_empacadora_sistema_neumatico",
    "mto_horno_empacadora_motor_reductor",
    "mto_horno_empacadora_vibrador",
    // Horno - Enfriador
    "mto_horno_enfriador_motor_reductor",
    "mto_horno_enfriador_lubricacion_bandas",
    "mto_horno_enfriador_vibrador",
    // Horno - Multilevel
    "mto_horno_multilevel_vibrador",
    "mto_horno_linea_gas_glp_horno_multilevel",
    "mto_horno_multilevel_sensor_pt100",
    "mto_horno_multilevel_lubricacion_bandas",
    "mto_horno_multilevel_transmision_turbina",
    "mto_horno_banda_entrada_general",
    "mto_horno_banda_salida_general",
    //Horno - Selladora Banda 
    "mto_horno_selladora_banda_continua_general",


    // Dieta
    "mto_dieta_bomba_sumergible_general",
    "mto_dieta_mezcladora_general",
    "mto_dieta_bandas_lubricacion",
    "mto_dieta_contenedores_cascara_general",

    // Crecimiento
    "mto_crecimiento_extractores_inyectores_general",
    "mto_crecimiento_paneles_general",
    "mto_crecimiento_cadenas_conveyor_general",
    "mto_crecimiento_carro_rs",
    "mto_crecimiento_carro_as",
    // Cosecha
    "mto_cosecha_panel_control_general",
    "mto_cosecha_tamiz_motor",
    "mto_cosecha_tamiz_revision_estructura_malla",
];

/**
 * FORM_MAP:
 * Mapear POSICION_ID base → ruta del formulario.
 * Usa el ID base (sin el -01/-02) para que funcione con cantidades.
 */
const FORM_MAP = {
    // Crecimiento
    "CRE-EY-G": "/MantenimientoAlertas/Crecimiento/ExtractoresInyectoresGeneral",
    "CRE-P-G": "/MantenimientoAlertas/Crecimiento/PanelesGeneral",
    "CRE-CC-G": "/MantenimientoAlertas/Crecimiento/CadenasConveyorGeneral",
    "CRE-C-RS": "/MantenimientoAlertas/Crecimiento/CarroRS",
    "CRE-C-AS": "/MantenimientoAlertas/Crecimiento/CarroAS",
    // Dieta
    "D-BS-G": "/MantenimientoAlertas/Dieta/BombaSumergibleGeneral",
    "D-M-G": "/MantenimientoAlertas/Dieta/MezcladoraGeneral",
    "D-B-L": "/MantenimientoAlertas/Dieta/BandasLubricacion",
    "D-CC-G": "/MantenimientoAlertas/Dieta/ContenedoresCascaraGeneral",
    // Cosecha
    "COS-PC-G": "/MantenimientoAlertas/Cosecha/PanelControlGeneral",
    "COS-T-M": "/MantenimientoAlertas/Cosecha/TamizMotor",
    "COS-T-REM": "/MantenimientoAlertas/Cosecha/TamizRevisionEstructuraMalla",

    //Horno TODOS

    // Empacadora
    "H-EL-V": "/MantenimientoAlertas/Horno/Vibrador",
    "H-EL-MR": "/MantenimientoAlertas/Horno/MotorReductor",
    "H-EL-SN": "/MantenimientoAlertas/Horno/SistemaNeumatico",
    //Multilevel
    "H-HM-V": "/MantenimientoAlertas/Horno/VibradorHornoMultilevel",
    "H-HM-LG": "/MantenimientoAlertas/Horno/LineaGasGLPHornoMultilevel",
    "H-HM-LB": "/MantenimientoAlertas/Horno/LubricacionBandasHornoMultilevel",
    "H-ML-SPT100": "/MantenimientoAlertas/HornoMultilevel/SensorPT100",
    "H-ML-V": "/MantenimientoAlertas/Horno/Vibrador",
    "H-HM-TT": "/MantenimientoAlertas/Horno/TransmisionTurbinaHornoMultilevel",
    "H-E-SN": "/MantenimientoAlertas/HornoEmpacadora/SistemaNeumatico",
    "H-E-MR": "/MantenimientoAlertas/HornoEmpacadora/MotorReductor",
    "H-E-V": "/MantenimientoAlertas/HornoEmpacadora/Vibrador",
    "H-EN-MR": "/MantenimientoAlertas/Horno/MotorReductor",
    "H-EN-LB": "/MantenimientoAlertas/HornoEnfriador/LubricacionBandas",
    "H-EN-V": "/MantenimientoAlertas/HornoEnfriador/Vibrador",
    "H-BE-G": "/MantenimientoAlertas/Horno/BandaEntradaGeneral",
    "H-BS-G": "/MantenimientoAlertas/Horno/BandaSalidaGeneral",
    "H-SBC-G": "/MantenimientoAlertas/Horno/SelladoraBandaContinuaGeneral",
    "H-ENF-V": "/MantenimientoAlertas/Horno/VibradorEnfriador",
    "H-ENF-LB": "/MantenimientoAlertas/Horno/LubricacionBandasEnfriador",
    "H-ENF-MR": "/MantenimientoAlertas/Horno/MotorReductorEnfriador",







};

/** Recorta un POSICION_ID con consecutivo, ej. COS-T-M-02 → COS-T-M */
const getBasePosicionId = (posicion_id = "") =>
    posicion_id.split("-").slice(0, 3).join("-");

export default function NotificationBell() {
    const navigate = useNavigate();
    const toast = useRef(null);

    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [pendingEdit, setPendingEdit] = useState(null);
    const [showHasNoDialog, setShowHasNoDialog] = useState(false);

    const [panelOpen, setPanelOpen] = useState(false);

    // Dialog de "registro completado, crea uno nuevo"
    const [showCompletedDialog, setShowCompletedDialog] = useState(false);
    const [completedAlert, setCompletedAlert] = useState(null);

    const showToast = (sev, sum, det, life = 3000) =>
        toast.current?.show({ severity: sev, summary: sum, detail: det, life });

    const fetchAlerts = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("vw_alertas_unificado")
                .select(
                    `
          tabla,
          id,
          posicion_id,
          equipo,
          registro,
          periodicidad,
          ultimo_mantenimiento,
          proximo_mantenimiento,
          estado,
          completado,
          pendiente_nuevo
        `
                )
                .in("tabla", ALLOWED_TABLES)
                .order("estado", { ascending: true })
                .order("proximo_mantenimiento", { ascending: true });

            if (error) throw error;

            // 🔴 En la campanita NO queremos ver OK
            // Solo VENCIDO, PROX7 y COMPLETADO que sigan pendientes de crear nuevo mantenimiento.
            const filtered = (data || []).filter((a) => {
                if (a.estado === "VENCIDO" || a.estado === "PROX7") {
                    return true;
                }
                if (
                    a.estado === "COMPLETADO" &&
                    (a.pendiente_nuevo === true ||
                        a.pendiente_nuevo === null ||
                        a.pendiente_nuevo === undefined)
                ) {
                    // COMPLETADO aún marcado como pendiente_nuevo (el trigger se encargará de ponerlo en false
                    // cuando se inserte un nuevo mantenimiento de la misma posición)
                    return true;
                }
                return false;
            });

            setAlerts(filtered);
        } catch (e) {
            console.error(e);
            showToast(
                "error",
                "Error",
                "No se pudieron cargar las alertas"
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleSnooze7d = async (alerta) => {
        try {
            if (alerta.estado !== "VENCIDO") return;

            const base = toDateISO();
            const next = addDays(base, 7);

            const { error } = await supabase
                .from(alerta.tabla)
                .update({ proximo_mantenimiento: next })
                .eq("id", alerta.id);

            if (error) throw error;

            showToast(
                "success",
                "+7 días",
                "Se reprogramó el próximo mantenimiento."
            );
            await fetchAlerts();
        } catch (e) {
            console.error(e);
            showToast("error", "Error", "No se pudo reprogramar");
        }
    };

    /** Validar NO + bloquear completar + mostrar dialog si hay problemas.
     *
     * Si todo está en "SI" y ejecutado = "SI", marcamos el registro como COMPLETADO
     * (pendiente de crear un nuevo mantenimiento) y mostramos el diálogo
     * que obliga al técnico a ir a crear el registro nuevo.
     */
    const handleComplete = async (alerta) => {
        try {
            const { data, error } = await supabase
                .from(alerta.tabla)
                .select(
                    `
          id,
          posicion_id,
          equipo,
          registro,
          cantidad,
          periodicidad,
          fecha_registro,
          ejecutado,
          completado,
          pendiente_nuevo,
          ${Array.from({ length: 14 }, (_, i) => `respuesta_q${i + 1}`).join(
                        ", "
                    )}
        `
                )
                .eq("id", alerta.id)
                .maybeSingle();

            if (error || !data) {
                showToast(
                    "error",
                    "Error",
                    "No se pudo leer el registro para validar."
                );
                return;
            }

            const respuestas = Array.from(
                { length: 14 },
                (_, i) => data[`respuesta_q${i + 1}`]
            );
            const tieneNo = respuestas.some((v) => v === "NO");

            if (data.ejecutado !== "SI" || tieneNo) {
                // Tiene NO o no se ejecutó → no se puede marcar como completado todavía
                setPendingEdit({
                    tabla: alerta.tabla,
                    id: alerta.id,
                    posicion_id: alerta.posicion_id,
                });
                setShowHasNoDialog(true);
                return;
            }

            // Todo en SI y ejecutado = SI → marcamos como COMPLETADO (pendiente_nuevo = true)
            const today = toDateISO();
            const { error: updError } = await supabase
                .from(alerta.tabla)
                .update({
                    completado: true,
                    pendiente_nuevo: true,
                    fecha_completado: today,
                })
                .eq("id", alerta.id);

            if (updError) throw updError;

            setCompletedAlert({
                ...alerta,
                fecha_completado: today,
            });
            setShowCompletedDialog(true);

            showToast(
                "success",
                "Completado",
                "Se marcó el registro como COMPLETADO. Debes crear un registro nuevo de mantenimiento."
            );

            await fetchAlerts();
        } catch (e) {
            console.error(e);
            showToast(
                "error",
                "Error",
                "No se pudo completar el registro."
            );
        }
    };

    const goToRegistro = () => {
        if (!pendingEdit) {
            setShowHasNoDialog(false);
            return;
        }
        const baseId = getBasePosicionId(pendingEdit.posicion_id);
        const ruta = FORM_MAP[baseId];

        if (!ruta) {
            showToast(
                "warn",
                "Ruta no configurada",
                `No hay ruta mapeada para el ID base ${baseId}.`
            );
            setShowHasNoDialog(false);
            return;
        }

        navigate(ruta, {
            state: { focusId: pendingEdit.id },
        });
        setShowHasNoDialog(false);
    };

    /** Ir a crear el registro nuevo de mantenimiento */
    const goToCrearNuevo = () => {
        if (!completedAlert) {
            setShowCompletedDialog(false);
            return;
        }

        const baseId = getBasePosicionId(completedAlert.posicion_id);
        const ruta = FORM_MAP[baseId];

        if (!ruta) {
            showToast(
                "warn",
                "Ruta no configurada",
                `No hay ruta mapeada para el ID base ${baseId}.`
            );
            setShowCompletedDialog(false);
            return;
        }

        // Lo enviamos al formulario del registro (Tamiz Motor en este caso).
        // El técnico deberá crear el nuevo mantenimiento manualmente.
        navigate(ruta);
        setShowCompletedDialog(false);
    };

    const colorByEstado = (estado) => {
        switch (estado) {
            case "VENCIDO":
                return "#fee2e2";
            case "PROX7":
                return "#fef3c7";
            case "COMPLETADO":
                return "#dcfce7"; // verde claro
            default:
                return "#e0f2fe";
        }
    };

    const badgeCount = alerts.filter(
        (a) =>
            a.estado === "VENCIDO" ||
            a.estado === "PROX7" ||
            a.estado === "COMPLETADO"
    ).length;

    return (
        <>
            <Toast ref={toast} />

            {/* Campanita + panel */}
            <div className="notification-bell-wrapper">
                <button
                    className="notification-bell-button"
                    onClick={() => setPanelOpen((v) => !v)}
                >
                    <i className="pi pi-bell" />
                    {badgeCount > 0 && (
                        <span className="notification-bell-badge">
                            {badgeCount}
                        </span>
                    )}
                </button>
            </div>

            {panelOpen && (
                <div className="notification-bell-panel">
                    <div className="notification-bell-header">
                        <span>Alertas de mantenimiento</span>
                        <button
                            className="notification-bell-close"
                            onClick={() => setPanelOpen(false)}
                        >
                            <i className="pi pi-times" />
                        </button>
                    </div>

                    <div className="notification-bell-panel-scroll">
                        {loading && <p>Cargando alertas...</p>}
                        {!loading && !alerts.length && (
                            <p>No hay alertas pendientes.</p>
                        )}

                        {!loading &&
                            alerts.map((a) => (
                                <div
                                    key={`${a.tabla}-${a.id}`}
                                    className="notification-card"
                                    style={{
                                        backgroundColor: colorByEstado(
                                            a.estado
                                        ),
                                    }}
                                >
                                    <div className="flex justify-content-between align-items-center mb-2">
                                        <div>
                                            <strong>{a.posicion_id}</strong>
                                            <div
                                                style={{ fontSize: "0.85rem" }}
                                            >
                                                {a.equipo} — {a.registro} (
                                                {a.periodicidad || "—"})
                                            </div>
                                        </div>
                                        <span
                                            style={{
                                                fontSize: "0.75rem",
                                                fontWeight: 700,
                                                padding: "2px 6px",
                                                borderRadius: 999,
                                                background:
                                                    a.estado === "VENCIDO"
                                                        ? "#b91c1c"
                                                        : a.estado === "PROX7"
                                                            ? "#d97706"
                                                            : a.estado ===
                                                                "COMPLETADO"
                                                                ? "#15803d"
                                                                : "#0369a1",
                                                color: "white",
                                            }}
                                        >
                                            {a.estado}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "0.85rem",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <div>
                                            <b>Último:</b>{" "}
                                            {fmtDMY(a.ultimo_mantenimiento)}
                                        </div>
                                        <div>
                                            <b>Próximo:</b>{" "}
                                            {fmtDMY(a.proximo_mantenimiento)}
                                        </div>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            label="Abrir formulario"
                                            icon="pi pi-external-link"
                                            text
                                            onClick={() => {
                                                const baseId =
                                                    getBasePosicionId(
                                                        a.posicion_id
                                                    );
                                                const ruta = FORM_MAP[baseId];
                                                if (!ruta) {
                                                    showToast(
                                                        "warn",
                                                        "Ruta no configurada",
                                                        `No hay ruta mapeada para el ID base ${baseId}.`
                                                    );
                                                    return;
                                                }
                                                navigate(ruta, {
                                                    state: { focusId: a.id },
                                                });
                                            }}
                                        />
                                        <Button
                                            label="Completar"
                                            icon="pi pi-check"
                                            text
                                            onClick={() => handleComplete(a)}
                                        />
                                        {a.estado === "VENCIDO" && (
                                            <Button
                                                label="+7 días"
                                                icon="pi pi-clock"
                                                text
                                                onClick={() =>
                                                    handleSnooze7d(a)
                                                }
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}

            {/* Dialog cuando hay NO o no ejecutado */}
            <Dialog
                visible={showHasNoDialog}
                onHide={() => setShowHasNoDialog(false)}
                header="Registro con puntos pendientes"
                style={{ width: "40vw", maxWidth: 600 }}
                modal
            >
                <p>
                    Este registro tiene respuestas en <b>NO</b> o no ha sido
                    ejecutado. Debe corregir el registro antes de marcarlo como{" "}
                    <b>Completado</b>.
                </p>

                {pendingEdit && (
                    <>
                        <p className="mt-3">
                            <b>ID:</b> {pendingEdit.posicion_id}
                        </p>

                        <div className="flex justify-content-end gap-2 mt-4">
                            <Button
                                label="Cerrar"
                                icon="pi pi-times"
                                outlined
                                onClick={() => setShowHasNoDialog(false)}
                            />
                            <Button
                                label="Ir al registro"
                                icon="pi pi-external-link"
                                onClick={goToRegistro}
                            />
                        </div>
                    </>
                )}
            </Dialog>

            {/* Dialog cuando el registro ya está COMPLETADO y debe crear uno nuevo */}
            <Dialog
                visible={showCompletedDialog}
                // 👇 No dejamos cerrarlo con la X ni con ESC, para "obligar" a ir a crear el nuevo registro
                onHide={() => { }}
                header="Registro completado"
                style={{ width: "40vw", maxWidth: 600 }}
                modal
                closable={false}
            >
                <p>
                    Has completado este registro. Para mantener la continuidad
                    del mantenimiento de este equipo, debes crear un{" "}
                    <b>registro nuevo de mantenimiento</b>.
                </p>

                {completedAlert && (
                    <p className="mt-3">
                        <b>ID:</b> {completedAlert.posicion_id}
                    </p>
                )}

                <div className="flex justify-content-end gap-2 mt-4">
                    <Button
                        label="Crear registro nuevo"
                        icon="pi pi-plus"
                        onClick={goToCrearNuevo}
                    />
                </div>
            </Dialog>
        </>
    );
}
