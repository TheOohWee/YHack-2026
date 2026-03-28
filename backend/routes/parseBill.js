// Rule-based parser: extracts cost and usage from pasted utility bill text.
function parseBill(req, res) {
  const { billText } = req.body;
  if (!billText) return res.status(400).json({ error: "billText is required" });

  const text = billText.toLowerCase();

  const costMatch = text.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
  const monthlyCost = costMatch ? parseFloat(costMatch[1].replace(/,/g, "")) : null;

  const kwhMatch = text.match(/([\d,]+)\s*kwh/);
  const kwhUsed = kwhMatch ? parseInt(kwhMatch[1].replace(/,/g, ""), 10) : null;

  const thermsMatch = text.match(/([\d,]+)\s*therms?/);
  const thermsUsed = thermsMatch ? parseInt(thermsMatch[1].replace(/,/g, ""), 10) : null;

  const bill = { monthlyCost, kwhUsed, thermsUsed };
  res.json({ bill });
}

module.exports = { parseBill };
