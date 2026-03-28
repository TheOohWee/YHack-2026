const express = require("express");
const cors = require("cors");
const { parseHome } = require("./routes/parseHome");
const { parseBill } = require("./routes/parseBill");
const { estimate } = require("./routes/estimate");
const { recommend } = require("./routes/recommend");

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/parse-home", parseHome);
app.post("/api/parse-bill", parseBill);
app.post("/api/estimate", estimate);
app.post("/api/recommend", recommend);

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`WattWise API running on :${PORT}`));
