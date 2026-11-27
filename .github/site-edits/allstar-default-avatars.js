// All Star: a default avatar for every Hero without a photo (on the Hero cards and on the Hero's own page),
// drawn in the page and picked from the Hero's id so each Hero keeps the same one. "Not linked to a Hero" keeps its "?".
const fs = require("fs");
function edit(file, pairs) {
  let s = fs.readFileSync(file, "utf8");
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${file}: expected 1 match, found ${n}: ${a.slice(0, 80)}`);
    s = s.replace(a, () => b);
  }
  fs.writeFileSync(file, s);
}
edit("assets/allstar.js", [
 [
  "const avatar=(name,url,cls)=>`<span class=\"hz-av ${cls||\"\"}\">${url?`<img src=\"${esc(url)}\" alt=\"\">`:`<span>${esc(initials(name))}</span>`}</span>`;",
  "// default Hero avatar when there is no photo: a friendly counter person, picked from the Hero's id so it never changes\nconst heroArt=seed=>{\n  let h=2166136261;for(const ch of String(seed||\"\"))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;\n  const ix=(n,k)=>(h>>>k)%n,BG=[\"#F3D27A\",\"#BBD3EA\",\"#F4C3A2\",\"#C7E2C1\",\"#D6CCEE\",\"#F0B9B4\"],SKIN=[\"#F6D2B8\",\"#E9B48E\",\"#C98B5F\",\"#9C6440\",\"#6E4329\"],\n    HAIR=[\"#1E1A18\",\"#3B2416\",\"#6B4325\",\"#B98A4C\",\"#8A8580\"],SHIRT=[\"#1F3A68\",\"#C8981E\",\"#2F6F6A\",\"#B5482F\",\"#3E4C59\"];\n  const bg=BG[ix(6,0)],si=ix(5,4),skin=SKIN[si],hi=ix(5,8),hair=si>=3&&(hi===1||hi===2)?HAIR[0]:HAIR[hi],shirt=SHIRT[ix(5,12)],style=ix(6,16);\n  const head=`<rect x=\"28\" y=\"34\" width=\"8\" height=\"9\" rx=\"3\" fill=\"${skin}\"/><circle cx=\"32\" cy=\"27\" r=\"11\" fill=\"${skin}\"/>`;\n  const face=`<circle cx=\"28\" cy=\"27.5\" r=\"1.3\" fill=\"#2A2320\"/><circle cx=\"36\" cy=\"27.5\" r=\"1.3\" fill=\"#2A2320\"/><path d=\"M28.6 31.6q3.4 2.6 6.8 0\" fill=\"none\" stroke=\"#2A2320\" stroke-width=\"1.3\" stroke-linecap=\"round\"/>`;\n  const back=style===2?`<path d=\"M20.5 26c0-8 5-13.5 11.5-13.5S43.5 18 43.5 26v14h-23z\" fill=\"${hair}\"/>`:\"\";\n  const top=[\n    `<path d=\"M21 26c0-7.5 4.8-12 11-12s11 4.5 11 12c-2-4-5.5-5.6-11-5.6S23 22 21 26z\" fill=\"${hair}\"/>`,\n    `<path d=\"M21.2 24.5c0-7 4.8-11 10.8-11s10.8 4 10.8 11z\" fill=\"#1F3A68\"/><path d=\"M30 24.5h17.5c1 0 1 1.8 0 1.8H30z\" fill=\"#16294A\"/><circle cx=\"32\" cy=\"18.6\" r=\"2\" fill=\"#C8981E\"/>`,\n    `<path d=\"M21 26c0-7.5 4.8-12 11-12s11 4.5 11 12c-3-4.6-6.8-6.4-12.4-6.4-1.8 2.2-5.2 4.6-9.6 6.4z\" fill=\"${hair}\"/>`,\n    `<circle cx=\"32\" cy=\"12.5\" r=\"4.6\" fill=\"${hair}\"/><path d=\"M21 26c0-7.5 4.8-12 11-12s11 4.5 11 12c-2-4-5.5-5.6-11-5.6S23 22 21 26z\" fill=\"${hair}\"/>`,\n    `<path d=\"M21.4 24c.8-6.2 5-10 10.6-10s9.8 3.8 10.6 10c-2.6-3-6-4.2-10.6-4.2S24 21 21.4 24z\" fill=\"${hair}\" opacity=\".85\"/>`,\n    `<path d=\"M21 25c0-7.2 4.9-11.6 11-11.6S43 17.8 43 25z\" fill=\"#B5482F\"/><rect x=\"20.4\" y=\"22.4\" width=\"23.2\" height=\"4.4\" rx=\"2.2\" fill=\"#8E3522\"/>`][style];\n  const body=`<path d=\"M9 66c0-14 10.3-23.5 23-23.5S55 52 55 66z\" fill=\"${shirt}\"/><path d=\"M27 42.8l5 6.2 5-6.2\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".55\" stroke-width=\"1.6\" stroke-linejoin=\"round\"/><rect x=\"40\" y=\"51\" width=\"6\" height=\"3.2\" rx=\"1\" fill=\"#fff\" fill-opacity=\".75\"/>`;\n  return `<svg viewBox=\"0 0 64 64\" aria-hidden=\"true\" focusable=\"false\"><rect width=\"64\" height=\"64\" fill=\"${bg}\"/><g transform=\"translate(32 64) scale(1.3) translate(-32 -60)\">${back}${body}${head}${face}${top}</g></svg>`;\n};\nconst avatar=(name,url,cls,seed)=>`<span class=\"hz-av ${cls||\"\"}\">${url?`<img src=\"${esc(url)}\" alt=\"\">`:seed?heroArt(seed):`<span>${esc(initials(name))}</span>`}</span>`;"
 ],
 [
  "avatar(cm.name,pic,\"big\"+(last&&last.heroes>1&&last.rank<=3?\" r\"+last.rank:\"\"))",
  "avatar(cm.name,pic,\"big\"+(last&&last.heroes>1&&last.rank<=3?\" r\"+last.rank:\"\"),(D&&D.id)||cm.name)"
 ],
 [
  "avatar(r.s.name,O.pics[r.s.id],rank?\"r\"+rank:\"\")",
  "avatar(r.s.name,O.pics[r.s.id],rank?\"r\"+rank:\"\",r.s.id)"
 ]
]);
edit("assets/allstar.css", [[".hz-av img{width:100%;height:100%;object-fit:cover}", ".hz-av img{width:100%;height:100%;object-fit:cover}\n.hz-av svg{width:100%;height:100%;display:block}"]]);
edit("allstar/index.html", [["/assets/allstar.js?v=17\"", "/assets/allstar.js?v=18\""], ["/assets/allstar.css?v=8\"", "/assets/allstar.css?v=9\""]]);
console.log("All Star: default Hero avatars");
