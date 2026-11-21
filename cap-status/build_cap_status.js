// Refreshes the CAP status artifact.
//   node build_cap_status.js <template.html> <output.html>
// Fetches both park pages, parses them with the same code the page uses (via jsdom),
// and writes the result into the /*SNAPSHOT*/ … /*END*/ slot of the HTML.
const fs = require("fs");
const { JSDOM } = require("jsdom");

const [, , templatePath, outPath] = process.argv;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) CAPStatusApp/1.0";
const MARK = /\/\*SNAPSHOT\*\/[\s\S]*?\/\*END\*\//;

async function get(url) {
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(15000) });
    return r.ok ? await r.text() : null;
  } catch { return null; }
}

(async () => {
  const html = fs.readFileSync(templatePath, "utf8");
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(outPath, "utf8").match(MARK)[0].slice(12, -7)); } catch {}

  const dom = new JSDOM(html.replace(MARK, "/*SNAPSHOT*/null/*END*/"), { url: "https://localhost/", runScripts: "dangerously" });
  const [park, trail] = await Promise.all([
    get("https://christchurchadventurepark.com/park-status"),
    get("https://christchurchadventurepark.com/bike/trail-information"),
  ]);
  const snap = dom.window.buildSnapshot(park, trail, prev);
  const json = JSON.stringify(snap).replace(/</g, "\\u003c");
  fs.writeFileSync(outPath, html.replace(MARK, `/*SNAPSHOT*/${json}/*END*/`));
  console.log(`trails: ${snap.trails?.length ?? 0}, park items: ${snap.park?.items.length ?? 0}, errors: ${snap.errors.join(" | ") || "none"}`);
})();
