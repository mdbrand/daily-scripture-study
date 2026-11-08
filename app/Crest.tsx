import { useId } from 'react';

// The Morning Lamp crest: an open book under a rising sun, ringed with the name, year, and Psalm 119:105.
export default function Crest({ size = 96, title = 'Morning Lamp crest' }: { size?: number; title?: string }) {
  const id = useId().replace(/:/g, '');
  const ring = `crest-ring-${id}`;
  const small = size < 56;
  return (
    <svg
      className="crest"
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title || undefined}
    >
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="60" cy="60" r="42" fill="none" stroke="currentColor" strokeWidth="1" />
      {!small && (
        <>
          <defs>
            {/* top arc runs left→right over the top; bottom arc runs left→right under, so both read upright */}
            <path id={`${ring}-top`} d="M13.5,60 a46.5,46.5 0 0,1 93,0" />
            <path id={`${ring}-bottom`} d="M7,60 a53,53 0 0,0 106,0" />
          </defs>
          <text className="crest-text crest-top" fill="currentColor" textAnchor="middle">
            <textPath href={`#${ring}-top`} startOffset="50%">
              MORNING LAMP
            </textPath>
          </text>
          <text className="crest-text" fill="currentColor" textAnchor="middle">
            <textPath href={`#${ring}-bottom`} startOffset="50%">
              EST. MMXXVI ✦ PSALM 119:105
            </textPath>
          </text>
          <text x="10.5" y="63" className="crest-star" fill="currentColor" textAnchor="middle">✦</text>
          <text x="109.5" y="63" className="crest-star" fill="currentColor" textAnchor="middle">✦</text>
        </>
      )}
      {/* rising sun */}
      <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none">
        <path d="M45,60 a15,15 0 0,1 30,0" />
        <line x1="60" y1="36" x2="60" y2="41" />
        <line x1="45.5" y1="42" x2="48.5" y2="45.5" />
        <line x1="74.5" y1="42" x2="71.5" y2="45.5" />
        <line x1="38" y1="53" x2="42.5" y2="54.5" />
        <line x1="82" y1="53" x2="77.5" y2="54.5" />
      </g>
      {/* open book */}
      <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M60,66 C53,62 44,61 36,63 L36,80 C44,78 53,79 60,83 Z" />
        <path d="M60,66 C67,62 76,61 84,63 L84,80 C76,78 67,79 60,83 Z" />
        <line x1="60" y1="66" x2="60" y2="83" />
      </g>
    </svg>
  );
}
