import React from "react";

export default function AlertFrame({ children }) {
    // Frame presentacional: no carga datos ni usa efectos
    return (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
            {children}
        </div>
    );
}
