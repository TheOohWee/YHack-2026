import "./globals.css";

export const metadata = {
  title: "WattWise - Home Energy Advisor",
  description: "Understand your home energy use and discover savings",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
