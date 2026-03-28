const BASE = "/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadPdf(file) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${BASE}/parse-bill-pdf`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}

export const api = {
  parseHome: (text, zipCode) => post("/parse-home-text", { text, zip_code: zipCode }),
  parseBill: (text) => post("/parse-bill-text", { text }),
  uploadBillPdf: uploadPdf,
  estimate: (home, bill) => post("/estimate", { home, bill }),
  recommend: (home, estimate, bill) => post("/recommend", { home, estimate, bill }),
  simulate: (home, bill, changes) => post("/simulate", { home, bill, changes }),
};
