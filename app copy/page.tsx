"use client";

import { useState } from "react";
import { UserInput, ApplianceKey } from "@/lib/types";
import { DEMO_USER, APPLIANCES, TIME_SLOTS, formatHour } from "@/lib/data";
import Dashboard from "@/components/Dashboard";
import clsx from "clsx";

const HOME_TYPES = [
  { value: "apartment", label: "Apartment", icon: "🏢" },
  { value: "house", label: "House", icon: "🏠" },
  { value: "dorm", label: "Dorm", icon: "🎓" },
] as const;

const APPLIANCE_KEYS = Object.keys(APPLIANCES) as ApplianceKey[];

export default function Home() {
  const [submitted, setSubmitted] = useState(false);
  const [userInput, setUserInput] = useState<UserInput>(DEMO_USER);
  const [step, setStep] = useState(1); // 1 = home info, 2 = habits, 3 = review

  function toggleAppliance(key: ApplianceKey) {
    setUserInput((prev) => {
      const has = prev.appliances.includes(key);
      return {
        ...prev,
        appliances: has
          ? prev.appliances.filter((a) => a !== key)
          : [...prev.appliances, key],
      };
    });
  }

  function setTiming(key: ApplianceKey, hour: number) {
    setUserInput((prev) => ({
      ...prev,
      timings: { ...prev.timings, [key]: hour },
    }));
  }

  if (submitted) {
    return <Dashboard input={userInput} onReset={() => setSubmitted(false)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">⚡</span>
            <span className="text-3xl font-extrabold text-white tracking-tight">
              GridWise
            </span>
          </div>
          <p className="text-slate-400 text-sm">
            Small shifts in <em>when</em> you use energy can lower your bill and your carbon footprint.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Progress bar */}
          <div className="h-1 bg-slate-100">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>

          <div className="p-8">
            {/* Step 1 — Home info */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">About your home</h2>
                  <p className="text-sm text-slate-500 mt-1">Step 1 of 3</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    ZIP code
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g. 94102"
                    value={userInput.zipCode}
                    onChange={(e) =>
                      setUserInput((p) => ({ ...p, zipCode: e.target.value }))
                    }
                    className="w-full border border-slate-200 rounded-lg px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Home type
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {HOME_TYPES.map((ht) => (
                      <button
                        key={ht.value}
                        onClick={() =>
                          setUserInput((p) => ({ ...p, homeType: ht.value }))
                        }
                        className={clsx(
                          "flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 transition-all",
                          userInput.homeType === ht.value
                            ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 text-slate-600 hover:border-slate-300"
                        )}
                      >
                        <span className="text-2xl">{ht.icon}</span>
                        <span className="text-sm font-medium">{ht.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Estimated monthly bill{" "}
                    <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      placeholder="130"
                      value={userInput.monthlyBill ?? ""}
                      onChange={(e) =>
                        setUserInput((p) => ({
                          ...p,
                          monthlyBill: e.target.value
                            ? Number(e.target.value)
                            : undefined,
                        }))
                      }
                      className="w-full border border-slate-200 rounded-lg pl-7 pr-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setUserInput(DEMO_USER);
                      setStep(2);
                    }}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                  >
                    Load demo
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!userInput.zipCode}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Appliances + timing */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Your habits</h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Step 2 of 3 — Select appliances and roughly when you use them
                  </p>
                </div>

                <div className="space-y-3">
                  {APPLIANCE_KEYS.map((key) => {
                    const spec = APPLIANCES[key];
                    const selected = userInput.appliances.includes(key);
                    return (
                      <div
                        key={key}
                        className={clsx(
                          "rounded-xl border-2 transition-all overflow-hidden",
                          selected
                            ? "border-emerald-400 bg-emerald-50"
                            : "border-slate-200 bg-white"
                        )}
                      >
                        <button
                          className="w-full flex items-center gap-3 p-4 text-left"
                          onClick={() => toggleAppliance(key)}
                        >
                          <div
                            className={clsx(
                              "w-5 h-5 rounded border-2 flex items-center justify-center shrink-0",
                              selected
                                ? "border-emerald-500 bg-emerald-500"
                                : "border-slate-300"
                            )}
                          >
                            {selected && (
                              <svg
                                className="w-3 h-3 text-white"
                                viewBox="0 0 12 12"
                                fill="none"
                              >
                                <path
                                  d="M2 6l3 3 5-5"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </div>
                          <span className="text-xl">{spec.emoji}</span>
                          <div>
                            <p className="font-medium text-slate-900 text-sm">
                              {spec.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {spec.description} · ~{spec.kWhPerUse} kWh/use
                            </p>
                          </div>
                        </button>

                        {selected && (
                          <div className="px-4 pb-4 flex items-center gap-3">
                            <span className="text-xs text-slate-500 whitespace-nowrap">
                              Typically used:
                            </span>
                            <select
                              className="flex-1 text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              value={userInput.timings[key] ?? 18}
                              onChange={(e) =>
                                setTiming(key, Number(e.target.value))
                              }
                            >
                              {TIME_SLOTS.map((ts) => (
                                <option key={ts.hour} value={ts.hour}>
                                  {ts.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setStep(1)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setStep(3)}
                    disabled={userInput.appliances.length === 0}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-40"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 — Review */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Ready to analyze</h2>
                  <p className="text-sm text-slate-500 mt-1">Step 3 of 3</p>
                </div>

                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <Row label="ZIP code" value={userInput.zipCode} />
                  <Row
                    label="Home type"
                    value={
                      HOME_TYPES.find((h) => h.value === userInput.homeType)?.label ??
                      ""
                    }
                  />
                  <Row
                    label="Monthly bill"
                    value={
                      userInput.monthlyBill
                        ? `$${userInput.monthlyBill}`
                        : "Not provided"
                    }
                  />
                  <Row
                    label="Appliances"
                    value={userInput.appliances
                      .map((k) => `${APPLIANCES[k].emoji} ${APPLIANCES[k].name}`)
                      .join(", ")}
                  />
                  <div className="pt-1 space-y-1">
                    {userInput.appliances.map((k) => (
                      <div key={k} className="flex justify-between text-sm">
                        <span className="text-slate-500">
                          {APPLIANCES[k].emoji} {APPLIANCES[k].name}
                        </span>
                        <span className="text-slate-700 font-medium">
                          ~{formatHour(userInput.timings[k] ?? 18)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => setSubmitted(true)}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-base hover:bg-emerald-600 transition shadow-lg shadow-emerald-500/20"
                  >
                    See my energy report →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-4">
          Estimates use modeled TOU pricing and EPA emissions factors. Not financial advice.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-800 font-medium text-right max-w-[60%]">
        {value}
      </span>
    </div>
  );
}
