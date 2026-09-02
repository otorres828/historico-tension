import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "TensioCare | Control de presión arterial",
  description: "Registro privado y seguimiento de presión arterial.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
