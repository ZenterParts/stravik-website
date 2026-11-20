// Site edit: battery fitment and warranty registration form for warranty policy V1.1.
// Changes assets/warranty.js (new form logic), tools/build-pages.js (form layout, battery page warranty text, policy page header),
// tools/warranty-terms.html (policy V1.1 text) and admin/m-warranty.js (V1.1 fields, one QR code per serial in the factory file).
// The patch is too large to send here, so it is read from the Master Data database (public.stravik_site_patches, id warranty-v1-1)
// and checked against its SHA-256 below before it is applied. If anything does not match, nothing changes.
"use strict";
const { execSync } = require("child_process"), fs = require("fs"), crypto = require("crypto");
const SB = "https://kyegujgvlsbttyrlibgn.supabase.co";
const SHA = "b61bf45d3bf6edba6dacc2721a7c1f29073aeaa2b6cd39bac36a5218b260d9f2";
(async () => {
  const key = fs.readFileSync("assets/warranty.js", "utf8").match(/SB_KEY="([^"]+)"/)[1];
  const r = await fetch(SB + "/rest/v1/stravik_site_patches?id=eq.warranty-v1-1&select=body", { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error("Patch not readable: status " + r.status);
  const rows = await r.json();
  if (!rows.length) throw new Error("Patch warranty-v1-1 not found");
  const body = rows[0].body;
  const got = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  if (got !== SHA) throw new Error("Patch checksum does not match: " + got);
  fs.writeFileSync("/tmp/warranty-v1-1.patch", body);
  execSync("git apply --check /tmp/warranty-v1-1.patch", { stdio: "inherit" });
  execSync("git apply /tmp/warranty-v1-1.patch", { stdio: "inherit" });
  console.log("Applied the warranty V1.1 form patch");
})().catch(e => { console.error(e.message); process.exit(1); });
