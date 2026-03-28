const BASE = "/api";

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  parseHome: (description) => post("/parse-home", { description }),
  parseBill: (billText) => post("/parse-bill", { billText }),
  estimate: (home, bill) => post("/estimate", { home, bill }),
  recommend: (home, estimate) => post("/recommend", { home, estimate }),
};
