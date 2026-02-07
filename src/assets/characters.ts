type Character = {
  id: string;
  name: string;
  dataUri: string;
};

const buildSvg = (body: string, eye: string, mouth: string) => `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
  <circle cx="60" cy="60" r="52" fill="${body}" stroke="#2d1a0b" stroke-width="6"/>
  <circle cx="42" cy="50" r="6" fill="${eye}" />
  <circle cx="78" cy="50" r="6" fill="${eye}" />
  ${mouth}
  <circle cx="28" cy="70" r="6" fill="rgba(255,255,255,0.6)"/>
</svg>
`.trim();

const encodeSvg = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const mouthSmile = `<path d="M40 72 Q60 90 80 72" stroke="#2d1a0b" stroke-width="6" fill="none" stroke-linecap="round"/>`;
const mouthWow = `<circle cx="60" cy="78" r="8" fill="#2d1a0b" />`;
const mouthGrin = `<rect x="44" y="72" width="32" height="12" rx="6" fill="#2d1a0b" />`;
const mouthWave = `<path d="M42 78 Q60 68 78 78" stroke="#2d1a0b" stroke-width="6" fill="none" stroke-linecap="round"/>`;

export const characters: Character[] = [
  { id: "char-1", name: "にっこり", dataUri: encodeSvg(buildSvg("#ffd66b", "#2d1a0b", mouthSmile)) },
  { id: "char-2", name: "びっくり", dataUri: encodeSvg(buildSvg("#9be7ff", "#2d1a0b", mouthWow)) },
  { id: "char-3", name: "にやり", dataUri: encodeSvg(buildSvg("#b9f6ca", "#2d1a0b", mouthGrin)) },
  { id: "char-4", name: "おだやか", dataUri: encodeSvg(buildSvg("#ffc2e2", "#2d1a0b", mouthWave)) },
  { id: "char-5", name: "うれしい", dataUri: encodeSvg(buildSvg("#ffeaa7", "#2d1a0b", mouthSmile)) },
  { id: "char-6", name: "ぽかん", dataUri: encodeSvg(buildSvg("#a29bfe", "#2d1a0b", mouthWow)) },
  { id: "char-7", name: "えへへ", dataUri: encodeSvg(buildSvg("#fdcb6e", "#2d1a0b", mouthGrin)) },
  { id: "char-8", name: "にこっ", dataUri: encodeSvg(buildSvg("#81ecec", "#2d1a0b", mouthWave)) }
];
