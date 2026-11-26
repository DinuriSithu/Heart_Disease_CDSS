import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Heart Disease CDSS",
  description:
    "Academic Clinical Decision Support System using XGBoost, SHAP, and BioMistral RAG",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}