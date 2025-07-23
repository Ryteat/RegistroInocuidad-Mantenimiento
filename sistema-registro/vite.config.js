import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/ProNuvo/", // 👈 Se cambia la base para que funcione en XAMPP
  server: {
    host: "0.0.0.0", // Escucha en todas las interfaces
    port: 5173, // Puerto de tu elección
  },
});
