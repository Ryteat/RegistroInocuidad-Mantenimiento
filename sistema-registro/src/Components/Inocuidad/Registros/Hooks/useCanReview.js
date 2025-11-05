// src/Components/Inocuidad/Registros/Hooks/useCanReview.js
import { useEffect, useState } from "react";
import { getCurrentUsername } from "../session/userSession.js";

// Lista blanca (tú pediste estos 2)
const ALLOWED_USERNAMES = ["Mantenimiento01", "Produccion01", "VictoriaV", "Calidad01"];
const ALLOWED_CANON = new Set(ALLOWED_USERNAMES.map(u => u.trim().toUpperCase()));

export default function useCanReview() {
    const [canReview, setCanReview] = useState(false);
    const [username, setUsername] = useState(null);

    useEffect(() => {
        const raw = getCurrentUsername();                    // lee de storage
        const canon = raw ? raw.trim().toUpperCase() : null; // normaliza
        const ok = !!canon && ALLOWED_CANON.has(canon);      // compara case-insensitive

        // Debug en consola para verificar rápido
        console.log("[PRONUVO] useCanReview -> raw:", raw, "canon:", canon, "canReview:", ok);

        setUsername(raw || null);
        setCanReview(ok);
    }, []);

    return { canReview, username };
}
