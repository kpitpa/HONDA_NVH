import React from 'react';

export const PARAM_DEFINITIONS = {
  mn: {
    symbol: 'mn',
    unit: 'mm',
    name: 'Normal Module',
    jaName: '正面モジュール',
    desc: 'The fundamental unit of gear tooth size measured on the normal plane perpendicular to the tooth helix. Determines basic tooth thickness, pitch, and root bending strength.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <path d="M 15 85 L 35 85 L 45 35 L 75 35 L 85 85 L 115 85 L 125 35 L 155 35 L 165 85 L 185 85" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
        <line x1="10" y1="60" x2="190" y2="60" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="4 2"/>
        <line x1="45" y1="25" x2="75" y2="25" stroke="#38BDF8" strokeWidth="2"/>
        <line x1="45" y1="20" x2="45" y2="35" stroke="#38BDF8" strokeWidth="1"/>
        <line x1="75" y1="20" x2="75" y2="35" stroke="#38BDF8" strokeWidth="1"/>
        <text x="60" y="18" fill="#38BDF8" fontSize="10" textAnchor="middle" fontWeight="bold">mn = p / π</text>
        <text x="145" y="65" fill="#F59E0B" fontSize="9">Pitch Line</text>
      </svg>
    )
  },
  z1: {
    symbol: 'z1',
    unit: 'teeth',
    name: 'Pinion Teeth Count',
    jaName: '小歯車 歯数',
    desc: 'Number of teeth on the driving input gear. Dictates contact ratio, undercut risk, and meshing frequency excitation fm = (n1 × z1) / 60.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="55" r="35" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
        <circle cx="100" cy="55" r="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 100 + 35 * Math.cos(rad);
          const y1 = 55 + 35 * Math.sin(rad);
          const x2 = 100 + 44 * Math.cos(rad);
          const y2 = 55 + 44 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#38BDF8" strokeWidth="3" strokeLinecap="round"/>;
        })}
        <circle cx="100" cy="55" r="5" fill="#38BDF8"/>
        <text x="100" y="102" fill="#38BDF8" fontSize="11" textAnchor="middle" fontWeight="bold">Driving Pinion (z1)</text>
      </svg>
    )
  },
  z2: {
    symbol: 'z2',
    unit: 'teeth',
    name: 'Wheel Teeth Count',
    jaName: '大歯車 歯数',
    desc: 'Number of teeth on the driven output gear. Works in conjunction with z1 to determine exact kinematic transmission ratio i = z2 / z1.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="80" r="60" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.6"/>
        <circle cx="100" cy="80" r="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
        {[200, 220, 240, 260, 280, 300, 320, 340].map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const x1 = 100 + 60 * Math.cos(rad);
          const y1 = 80 + 60 * Math.sin(rad);
          const x2 = 100 + 72 * Math.cos(rad);
          const y2 = 80 + 72 * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#10B981" strokeWidth="3.5" strokeLinecap="round"/>;
        })}
        <text x="100" y="45" fill="#10B981" fontSize="11" textAnchor="middle" fontWeight="bold">Driven Wheel (z2)</text>
        <text x="100" y="98" fill="var(--text-muted)" fontSize="9" textAnchor="middle">Ratio i = z2 / z1</text>
      </svg>
    )
  },
  beta: {
    symbol: 'β',
    unit: 'deg',
    name: 'Helix Angle',
    jaName: 'ねじれ角',
    desc: 'The inclination angle of the gear teeth relative to the shaft rotational axis. Produces smooth tooth handover, reducing transmission error at the expense of axial thrust.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="50" y="20" width="100" height="70" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
        <line x1="30" y1="55" x2="170" y2="55" stroke="var(--text-muted)" strokeWidth="1" strokeDasharray="5 3"/>
        <line x1="75" y1="20" x2="125" y2="90" stroke="#38BDF8" strokeWidth="3"/>
        <line x1="95" y1="20" x2="145" y2="90" stroke="#38BDF8" strokeWidth="3"/>
        <line x1="100" y1="20" x2="100" y2="90" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="2 2"/>
        <path d="M 100 45 A 25 25 0 0 1 113 47" fill="none" stroke="#F59E0B" strokeWidth="1.5"/>
        <text x="122" y="44" fill="#F59E0B" fontSize="11" fontWeight="bold">β</text>
        <text x="100" y="103" fill="#38BDF8" fontSize="9" textAnchor="middle">Tooth Trace Angle</text>
      </svg>
    )
  },
  b: {
    symbol: 'b',
    unit: 'mm',
    name: 'Face Width',
    jaName: '歯幅',
    desc: 'Axial length of the active gear tooth flank along the gear axis. Directly dictates the specific line load wt = Ft / b and face contact overlap.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <polygon points="50,40 130,40 150,20 70,20" fill="rgba(56, 189, 248, 0.2)" stroke="#38BDF8" strokeWidth="2"/>
        <polygon points="50,40 130,40 130,80 50,80" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
        <polygon points="130,40 150,20 150,60 130,80" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
        <line x1="50" y1="92" x2="130" y2="92" stroke="#F59E0B" strokeWidth="2"/>
        <line x1="50" y1="85" x2="50" y2="97" stroke="#F59E0B" strokeWidth="1.5"/>
        <line x1="130" y1="85" x2="130" y2="97" stroke="#F59E0B" strokeWidth="1.5"/>
        <text x="90" y="105" fill="#F59E0B" fontSize="11" textAnchor="middle" fontWeight="bold">Face Width (b)</text>
      </svg>
    )
  },
  T1: {
    symbol: 'T1',
    unit: 'Nm',
    name: 'Input Torque',
    jaName: '入力トルク',
    desc: 'Torsional operating load transmitted through the driving pinion shaft. Produces tangential tooth contact force Ft and determines elastic tooth deflections.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="95" cy="55" r="28" fill="rgba(255,255,255,0.03)" stroke="currentColor" strokeWidth="2" opacity="0.7"/>
        <path d="M 95 18 A 37 37 0 1 1 58 55" fill="none" stroke="#F59E0B" strokeWidth="3"/>
        <polygon points="54,46 58,62 70,54" fill="#F59E0B"/>
        <text x="148" y="38" fill="#F59E0B" fontSize="12" fontWeight="bold">T1 (Nm)</text>
        <text x="95" y="59" fill="var(--text-muted)" fontSize="9" textAnchor="middle">Shaft Axis</text>
        <text x="95" y="102" fill="#38BDF8" fontSize="9" textAnchor="middle">Ft = 2000 × T1 / d1</text>
      </svg>
    )
  },
  n1: {
    symbol: 'n1',
    unit: 'rpm',
    name: 'Input Rotational Speed',
    jaName: '小歯車 回転数',
    desc: 'Angular velocity of the driving shaft in revolutions per minute. Controls pitch-line velocity v and the gear mesh excitation frequency harmonics.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <circle cx="100" cy="55" r="26" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.5"/>
        <path d="M 72 40 A 35 35 0 0 1 128 40" fill="none" stroke="#38BDF8" strokeWidth="2.5"/>
        <polygon points="125,32 135,42 123,48" fill="#38BDF8"/>
        <path d="M 128 70 A 35 35 0 0 1 72 70" fill="none" stroke="#38BDF8" strokeWidth="2.5"/>
        <polygon points="75,78 65,68 77,62" fill="#38BDF8"/>
        <text x="100" y="58" fill="#38BDF8" fontSize="12" textAnchor="middle" fontWeight="bold">n1 (rpm)</text>
        <text x="100" y="100" fill="var(--text-muted)" fontSize="9" textAnchor="middle">Mesh Freq fm = n1 · z1 / 60</text>
      </svg>
    )
  },
  K_A: {
    symbol: 'KA',
    unit: 'factor',
    name: 'Application Factor',
    jaName: '用途係数',
    desc: 'Empirical service factor accounting for external shock loads, electric motor torque ripple, or driveline inertia fluctuations (ISO 6336-1).',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1="25" y1="75" x2="180" y2="75" stroke="var(--text-muted)" strokeWidth="1"/>
        <line x1="25" y1="20" x2="25" y2="75" stroke="var(--text-muted)" strokeWidth="1"/>
        <line x1="25" y1="55" x2="180" y2="55" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3"/>
        <path d="M 25 55 Q 50 25 75 55 T 125 55 T 175 55" fill="none" stroke="#EF4444" strokeWidth="2.5"/>
        <text x="105" y="28" fill="#EF4444" fontSize="10" fontWeight="bold">Peak Load = KA × Tnom</text>
        <text x="182" y="58" fill="var(--text-muted)" fontSize="8">Nominal</text>
        <text x="100" y="100" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">ISO 6336 Service Factor</text>
      </svg>
    )
  },
  Calpha: {
    symbol: 'Cα',
    unit: 'µm',
    name: 'Tip Relief',
    jaName: '歯先修整',
    desc: 'Involute profile modification removing micro-layers of material toward the tooth tip. Compensates for elastic tooth bending under torque to eliminate premature tip-to-root corner contact.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <path d="M 50 90 Q 75 60 90 20" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.4" strokeDasharray="3 3"/>
        <path d="M 50 90 Q 75 60 83 38 Q 80 25 75 20" fill="none" stroke="#38BDF8" strokeWidth="2.5"/>
        <line x1="75" y1="20" x2="90" y2="20" stroke="#F59E0B" strokeWidth="2"/>
        <line x1="75" y1="16" x2="75" y2="24" stroke="#F59E0B" strokeWidth="1"/>
        <line x1="90" y1="16" x2="90" y2="24" stroke="#F59E0B" strokeWidth="1"/>
        <text x="115" y="24" fill="#F59E0B" fontSize="10" fontWeight="bold">Cα [µm]</text>
        <text x="130" y="55" fill="#38BDF8" fontSize="9">Relieved Involute</text>
        <text x="100" y="102" fill="var(--text-muted)" fontSize="9" textAnchor="middle">Tooth Tip Corner Easing</text>
      </svg>
    )
  },
  Cbeta: {
    symbol: 'Cβ',
    unit: 'µm',
    name: 'Flank Crowning',
    jaName: 'クラウニング',
    desc: 'Lead modification applying a convex barrel curve along the face width. Prevents edge-loading caused by shaft deflection, casing torsion, and manufacturing misalignment.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="55" x2="170" y2="55" stroke="var(--text-muted)" strokeWidth="1.5" strokeDasharray="3 3"/>
        <path d="M 30 55 Q 100 25 170 55" fill="none" stroke="#10B981" strokeWidth="3"/>
        <line x1="100" y1="40" x2="100" y2="55" stroke="#F59E0B" strokeWidth="2"/>
        <line x1="95" y1="40" x2="105" y2="40" stroke="#F59E0B" strokeWidth="1.5"/>
        <line x1="95" y1="55" x2="105" y2="55" stroke="#F59E0B" strokeWidth="1.5"/>
        <text x="122" y="47" fill="#F59E0B" fontSize="11" fontWeight="bold">Cβ [µm]</text>
        <text x="100" y="90" fill="#10B981" fontSize="9" textAnchor="middle">Convex Barrel Profile along Face (b)</text>
        <text x="100" y="103" fill="var(--text-muted)" fontSize="8" textAnchor="middle">Mitigates End-Bearing Edge Loading</text>
      </svg>
    )
  },
  Q: {
    symbol: 'Q',
    unit: 'grade',
    name: 'ISO Quality Grade',
    jaName: 'ISO精度等級',
    desc: 'Manufacturing tolerance band rating per ISO 1328-1. Lower numbers indicate precision ground gears with minimal cumulative pitch and runout deviations.',
    svg: (
      <svg viewBox="0 0 200 110" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <rect x="35" y="30" width="130" height="40" fill="rgba(234, 179, 8, 0.08)" stroke="#EAB308" strokeWidth="1" strokeDasharray="3 3"/>
        <rect x="55" y="40" width="90" height="20" fill="rgba(34, 197, 94, 0.15)" stroke="#22C55E" strokeWidth="1.5"/>
        <line x1="20" y1="50" x2="180" y2="50" stroke="var(--text-muted)" strokeWidth="1"/>
        <text x="100" y="54" fill="#22C55E" fontSize="10" textAnchor="middle" fontWeight="bold">Grade 4–5 (Precision EV)</text>
        <text x="100" y="24" fill="#EAB308" fontSize="9" textAnchor="middle">Grade 7–8 (Standard Commercial)</text>
        <text x="100" y="98" fill="var(--text-secondary)" fontSize="9" textAnchor="middle">ISO 1328 Profile & Pitch Tolerance</text>
      </svg>
    )
  }
};

export default function ParamDiagramModal({ paramKey, position = 'top', t }) {
  const data = PARAM_DEFINITIONS[paramKey];
  if (!data) return null;

  return (
    <div className={`param-hover-card pos-${position}`}>
      <div className="param-card-header">
        <div className="param-card-title">
          <span>{data.name}</span>
          <span className="param-card-badge">{data.symbol} [{data.unit}]</span>
        </div>
      </div>
      <div className="param-card-svg-viewport">
        {data.svg}
      </div>
      <div className="param-card-desc">
        {data.desc}
      </div>
    </div>
  );
}