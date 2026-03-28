"use client";

import { motion } from "framer-motion";

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={`space-y-3 ${className}`}
      role="status"
      aria-label="Loading chart"
    >
      <motion.div
        className="h-48 w-full rounded-xl bg-slate-800/80"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            className="h-2 flex-1 rounded-full bg-slate-700"
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.08,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    </div>
  );
}
