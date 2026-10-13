import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "DieselPro · Centro de servicio diésel",
  description: "Gestión de órdenes de trabajo, inventario, terceros, facturación y finanzas del centro de servicio diésel",
};

// Aplica el tema oscuro según la preferencia del sistema antes del primer render.
const themeScript = `(function(){try{var m=window.matchMedia('(prefers-color-scheme: dark)');var a=function(){document.documentElement.classList.toggle('dark',m.matches)};a();m.addEventListener('change',a);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
