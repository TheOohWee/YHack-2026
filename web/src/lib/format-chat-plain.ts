/** Strip markdown-style noise so chat bubbles and Slack-style UIs read cleanly. */
export function formatChatPlainText(text: string): string {
  if (!text || typeof text !== "string") return (text ?? "").trim();
  let s = text.trim();
  s = s.replace(/^```(?:\w*)?\s*/gm, "").replace(/\s*```$/gm, "");
  s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  s = s
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, ""))
    .join("\n");
  s = s.replace(/\*\*/g, "").replace(/__/g, "");
  s = s.replace(/`+/g, "");
  s = s
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\*|-)\s+(.+)$/);
      return m ? `• ${m[2]}` : line;
    })
    .join("\n");
  s = s.replace(/[ \t]+\n/g, "\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/ {2,}/g, " ");
  return s.trim();
}
