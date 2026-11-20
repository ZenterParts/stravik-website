// Site edit: faint Stravik logo watermark behind the battery fitment and warranty registration form.
// It stays in the middle of the screen while the form scrolls; light and dark mode each get their own strength.
"use strict";
const fs = require("fs"), p = "tools/build-pages.js";
let s = fs.readFileSync(p, "utf8");
const a = "<style>form.enq [hidden]{display:none!important}";
const css = ".wform{position:relative;isolation:isolate}" +
  ".wform::before{content:\"\";position:fixed;inset:0;margin:auto;width:min(72vw,560px);height:min(65vw,500px);" +
  "background:url(/assets/img/logo-mark.webp) center/contain no-repeat;opacity:.07;filter:grayscale(1);z-index:-1;pointer-events:none}" +
  "@media (prefers-color-scheme:dark){.wform::before{opacity:.09;filter:grayscale(1) brightness(2.2)}}" +
  "@media print{.wform::before{display:none}}";
if (s.split(a).length !== 2) { console.error("Text not found once in " + p + ": " + a); process.exit(1); }
if (s.includes(".wform::before")) { console.log("Watermark already in place"); process.exit(0); }
s = s.replace(a, a + css);
fs.writeFileSync(p, s);
console.log("Warranty form: Stravik watermark added");
