"use client";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Navbar from "../../components/Navbar";
import { api } from "../../lib/api";

const STEPS = ["Input", "ZIP Code", "Analyzing"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [inputMode, setInputMode] = useState(null); // "describe" | "bill" | "pdf"
  const [homeText, setHomeText] = useState("");
  const [billText, setBillText] = useState("");
  const [pdfFile, setPdfFile] = useState(null);
  const [zipCode, setZipCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((accepted) => {
    if (accepted.length > 0) {
      setPdfFile(accepted[0]);
      setInputMode("pdf");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxFiles: 1,
    multiple: false,
  });

  async function handleAnalyze() {
    setStep(2);
    setLoading(true);
    setError(null);

    try {
      let home = null;
      let bill = null;
      let parsedFields = [];

      // Step 1: Parse input with AI
      if (inputMode === "pdf" && pdfFile) {
        const billResult = await api.uploadBillPdf(pdfFile);
        bill = billResult.bill;
        parsedFields = billResult.parsed_fields || [];
      } else if (inputMode === "bill" && billText.trim()) {
        const billResult = await api.parseBill(billText);
        bill = billResult.bill;
        parsedFields = billResult.parsed_fields || [];
      }

      if (homeText.trim()) {
        const homeResult = await api.parseHome(homeText, zipCode || null);
        home = homeResult.home;
        parsedFields = [...parsedFields, ...(homeResult.parsed_fields || [])];
      }

      // If we only have a bill, create default home with zip
      if (!home) {
        home = { zip_code: zipCode || "90210" };
      } else {
        home.zip_code = zipCode || home.zip_code || "90210";
      }

      // Step 2: Estimate energy
      const { estimate } = await api.estimate(home, bill);

      // Step 3: Get recommendations
      const { recommendations } = await api.recommend(home, estimate, bill);

      // Store and navigate
      sessionStorage.setItem(
        "wattwise_results",
        JSON.stringify({ home, bill, estimate, recommendations, parsedFields })
      );
      router.push("/results");
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStep(0);
    } finally {
      setLoading(false);
    }
  }

  const hasInput = inputMode === "pdf" ? !!pdfFile : inputMode === "bill" ? billText.trim() : homeText.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="max-w-2xl mx-auto px-6 pt-10 pb-20">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1.5 rounded-full transition-colors ${i <= step ? "bg-brand-500" : "bg-gray-200"}`} />
              <p className={`text-xs mt-1.5 ${i <= step ? "text-brand-600 font-medium" : "text-gray-400"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Choose input method */}
        {step === 0 && (
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Tell us about your home
            </h1>
            <p className="text-gray-500 mb-8">
              Choose one or combine both — more info means better estimates.
            </p>

            {/* PDF Drop Zone */}
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all mb-6
                ${isDragActive ? "border-brand-500 bg-brand-50" : pdfFile ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-400 hover:bg-gray-50"}`}
            >
              <input {...getInputProps()} />
              <div className="text-4xl mb-3">{pdfFile ? "✅" : "📄"}</div>
              {pdfFile ? (
                <div>
                  <p className="font-semibold text-brand-700">{pdfFile.name}</p>
                  <p className="text-sm text-gray-500 mt-1">PDF ready to analyze</p>
                </div>
              ) : (
                <div>
                  <p className="font-semibold text-gray-700">
                    Drop your utility bill PDF here
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    or click to browse
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-sm text-gray-400 font-medium">or type below</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Tab selector */}
            <div className="flex gap-2 mb-4">
              {[
                { key: "describe", label: "Describe your home" },
                { key: "bill", label: "Paste bill text" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setInputMode(tab.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                    ${inputMode === tab.key ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {inputMode === "describe" && (
              <textarea
                value={homeText}
                onChange={(e) => setHomeText(e.target.value)}
                placeholder="e.g. 2,200 sq ft ranch house built in 1985. Gas furnace, central AC, gas water heater. Single-pane windows, poor insulation. 4 people, no solar. We have a pool and an EV."
                className="w-full min-h-[140px] p-4 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none"
              />
            )}

            {inputMode === "bill" && (
              <textarea
                value={billText}
                onChange={(e) => setBillText(e.target.value)}
                placeholder="e.g. Southern California Edison&#10;Service: Feb 1 - Mar 1, 2024&#10;Total amount due: $187.43&#10;Usage: 1,240 kWh&#10;Rate plan: TOU-D-PRIME"
                className="w-full min-h-[140px] p-4 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none"
              />
            )}

            {/* Also allow home description when bill is primary */}
            {(inputMode === "bill" || inputMode === "pdf") && (
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-2">
                  Optionally describe your home for better estimates:
                </p>
                <textarea
                  value={homeText}
                  onChange={(e) => setHomeText(e.target.value)}
                  placeholder="e.g. 3-bed ranch, gas heat, built 1992, central AC"
                  className="w-full min-h-[80px] p-4 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition resize-none"
                />
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                disabled={!hasInput && !pdfFile && !homeText.trim()}
                onClick={() => setStep(1)}
                className="bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 1: ZIP code */}
        {step === 1 && (
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Where is your home?
            </h1>
            <p className="text-gray-500 mb-8">
              ZIP code helps us account for your local climate and utility rates.
            </p>
            <input
              type="text"
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="e.g. 90210"
              maxLength={5}
              className="w-full p-4 border border-gray-200 rounded-xl text-lg text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition"
            />
            <div className="flex justify-between mt-8">
              <button
                onClick={() => setStep(0)}
                className="text-gray-500 px-6 py-3 rounded-xl font-medium hover:bg-gray-100 transition"
              >
                ← Back
              </button>
              <button
                onClick={handleAnalyze}
                className="bg-brand-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-all"
              >
                {zipCode.length === 5 ? "Analyze My Home →" : "Skip & Analyze →"}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Analyzing */}
        {step === 2 && (
          <div className="animate-fade-up text-center pt-20">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-brand-500 rounded-full animate-spin-slow mx-auto" />
            <h2 className="text-2xl font-bold mt-6 text-gray-900">
              Analyzing your home...
            </h2>
            <p className="text-gray-500 mt-2">
              AI is parsing your input, estimating energy use, and generating recommendations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
