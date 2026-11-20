// Site edit: battery fitment form simplified, with a photo next to each field it proves.
// Removed: seller branch and contact, fitted by and technician, customer company, engine fuel and size, the start-stop question,
// and the battery, starting, charging and ripple test result choices. Each reading (battery voltage before fitting, lowest
// cranking voltage, charging voltage) has its own mandatory photo; the invoice and registration plate or VIN photos sit next to
// their fields. Changes assets/warranty.js, tools/build-pages.js and admin/m-warranty.js.
// The patch is read from the Master Data database (public.stravik_site_patches, id warranty-form-photos) and checked against
// its SHA-256 below before it is applied. If anything does not match, nothing changes.
"use strict";
const { execSync } = require("child_process"), fs = require("fs"), crypto = require("crypto");
const SB = "https://kyegujgvlsbttyrlibgn.supabase.co";
const SHA = "ce4c9d715b105825b56a5dc900c0d1225d03b7fac780ce657e27c11acf86988f";
(async () => {
  const key = fs.readFileSync("assets/warranty.js", "utf8").match(/SB_KEY="([^"]+)"/)[1];
  const r = await fetch(SB + "/rest/v1/stravik_site_patches?id=eq.warranty-form-photos&select=body", { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error("Patch not readable: status " + r.status);
  const rows = await r.json();
  if (!rows.length) throw new Error("Patch warranty-form-photos not found");
  const body = rows[0].body;
  const got = crypto.createHash("sha256").update(body, "utf8").digest("hex");
  if (got !== SHA) throw new Error("Patch checksum does not match: " + got);
  fs.writeFileSync("/tmp/warranty-form-photos.patch", body);
  execSync("git apply --check /tmp/warranty-form-photos.patch", { stdio: "inherit" });
  execSync("git apply /tmp/warranty-form-photos.patch", { stdio: "inherit" });
  console.log("Applied the warranty form photos patch");
})().catch(e => { console.error(e.message); process.exit(1); });
