import "./globals.css";

export const metadata = {
  title: "WattWise — Home Energy Advisor",
  description: "Understand and reduce your home energy costs and carbon footprint",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen">{children}</body>
    </html>
  );
}
