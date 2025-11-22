import { useEffect, useRef, useState } from "react";
import supabase from "../../../supabaseClient";

/**
 * Polling simple para alertas de mantenimiento periódico.
 * - table: nombre de tabla en supabase
 * - frequencyDays: cada cuántos días toca (mensual≈30)
 * - leadDays: cuántos días antes avisar como "próximo"
 * Devuelve: { nextDue, status: "ok" | "due_soon" | "overdue", lastDate }
 */
export default function useMaintenanceAlerts({ table, frequencyDays = 30, leadDays = 7, pollMs = 60_000 }) {
  const [state, setState] = useState({ nextDue: null, status: "ok", lastDate: null, error: null });
  const timer = useRef(null);

  async function compute() {
    try {
      // último registro por fecha_registro (string YYYY-MM-DD)
      const { data, error } = await supabase
        .from(table)
        .select("fecha_registro")
        .order("fecha_registro", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;

      const lastDate = data?.fecha_registro ? new Date(data.fecha_registro + "T00:00:00") : null;
      const today = new Date();
      let nextDue = null;
      if (lastDate) {
        nextDue = new Date(lastDate);
        nextDue.setDate(nextDue.getDate() + frequencyDays);
      } else {
        // si nunca se ha hecho: vencerá hoy mismo
        nextDue = today;
      }

      const diffDays = Math.floor((nextDue - today) / (1000 * 60 * 60 * 24));
      let status = "ok";
      if (diffDays < 0) status = "overdue";
      else if (diffDays <= leadDays) status = "due_soon";

      setState({ nextDue, status, lastDate: lastDate || null, error: null });
    } catch (e) {
      setState((s) => ({ ...s, error: e.message || "Error" }));
    }
  }

  useEffect(() => {
    compute();
    timer.current = setInterval(compute, pollMs);
    return () => clearInterval(timer.current);
  }, [table, frequencyDays, leadDays, pollMs]);

  return state;
}
