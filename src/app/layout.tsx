import type { Metadata } from "next";
import { DM_Sans, Manrope } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "Luz en claro · Tu electricidad, bajo control",
  description:
    "Compara tarifas de luz con tu consumo real. Guarda tus precios, consulta tus facturas y encuentra tu próximo ahorro.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
