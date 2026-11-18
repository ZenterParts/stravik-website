// Site edit, 18 Nov 2026: phones and tablets. Adds a block at the end of assets/site.css:
// - page header: the text stays clear of the gold diagonal at every width (it ran under it on phones and tablets);
// - forms: fields never push past the screen (iPhone Safari gives date fields a minimum width that ignores the column);
// - pages never scroll sideways (the home page's slide-in picture starts partly outside the screen).
// Run once from the repository root by .github/workflows/apply-site-edits.yml, which then deletes this file.
"use strict";
const fs = require("fs"), f = "assets/site.css";
let s = fs.readFileSync(f, "utf8");
const MARK = "/* ---- phones and tablets (18 Nov 2026) ---- */";
if (s.includes(MARK)) throw new Error("already applied");
s = s.replace(/\s*$/, "\n") + MARK + `
/* page header: room for the gold diagonal on the right, slimmer diagonal on phones */
.pagehead{--wedge:120px}
.pagehead::after{width:var(--wedge)}
.pagehead .wrap{padding-right:max(0px,calc(var(--wedge) + 16px - (100vw - min(1200px,100vw - 40px)) / 2))}
@media (max-width:760px){.pagehead{--wedge:40px;padding:34px 0 30px}}
/* forms: a field can shrink to its column; date fields on iPhone Safari included */
form.enq>*,.enq>*{min-width:0}
form.enq input[type=date],form.enq input[type=time],.enq input[type=date]{-webkit-appearance:none;appearance:none;display:block;min-width:0;max-width:100%;min-height:48px;text-align:left}
form.enq input[type=date]::-webkit-date-and-time-value{text-align:left}
/* the page never scrolls sideways (clip, not hidden, so sticky bars keep working) */
main{overflow-x:clip}
`;
fs.writeFileSync(f, s);
console.log("Edited: " + f);
