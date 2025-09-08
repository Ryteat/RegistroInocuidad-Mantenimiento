// Components/Inocuidad/Registros/session/userSession.js
export function getCurrentUsername() {
    const keys = ["username", "usuario", "user"];
    for (const k of keys) {
        const v = sessionStorage.getItem(k) || localStorage.getItem(k);
        if (v && typeof v === "string" && v.trim()) return v.trim();
    }
    return null;
}

export function setCurrentUsername(username) {
    if (username) localStorage.setItem("username", String(username).trim());
}

export function clearCurrentUsername() {
    ["username", "usuario", "user"].forEach((k) => {
        localStorage.removeItem(k);
        sessionStorage.removeItem(k);
    });
}
