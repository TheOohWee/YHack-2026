// Rule-based parser: extracts structured home data from a free-text description.
function parseHome(req, res) {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: "description is required" });

  const text = description.toLowerCase();

  const sqftMatch = text.match(/([\d,]+)\s*(?:sq\.?\s*ft|square\s*feet)/);
  const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : 1500;

  const bedroomMatch = text.match(/(\d+)\s*(?:bed(?:room)?s?|br)/);
  const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1], 10) : 3;

  const yearMatch = text.match(/(?:built\s*(?:in\s*)?|from\s*)(\d{4})/);
  const yearBuilt = yearMatch ? parseInt(yearMatch[1], 10) : 1990;

  const heatingTypes = ["gas", "electric", "heat pump", "oil", "propane"];
  const heating = heatingTypes.find((h) => text.includes(h)) || "gas";

  const hasAC = /\b(ac|air\s*condition|cooling|central\s*air)\b/.test(text);
  const hasSolar = /\bsolar\b/.test(text) && !/\bno\s+solar\b/.test(text);
  const hasPool = /\bpool\b/.test(text) && !/\bno\s+pool\b/.test(text);

  const home = { sqft, bedrooms, yearBuilt, heating, hasAC, hasSolar, hasPool };
  res.json({ home });
}

module.exports = { parseHome };
