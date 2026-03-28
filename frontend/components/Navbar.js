"use client";
import Link from "next/link";

export default function Navbar({ actions }) {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-brand-600 hover:text-brand-700 transition">
          <span className="text-2xl">⚡</span>
          <span>WattWise</span>
        </Link>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </nav>
  );
}
