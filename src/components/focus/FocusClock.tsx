import React, { useEffect, useRef } from 'react';

export type ClockStyle = 'flip' | 'dial' | 'classic';

function FlipDigit({ value }: { value: string }) {
  const previous = useRef(value);
  const from = previous.current;
  useEffect(() => { previous.current = value; }, [value]);
  return (
    <span className="flip-digit" aria-hidden="true">
      <span className="flip-face flip-top"><span>{value}</span></span>
      <span className="flip-face flip-bottom"><span>{value}</span></span>
      {from !== value && <span key={value} className="flip-animation">
        <span className="flip-face flip-top flip-leaving"><span>{from}</span></span>
        <span className="flip-face flip-bottom flip-arriving"><span>{value}</span></span>
      </span>}
      <span className="flip-hinge left" /><span className="flip-hinge right" />
    </span>
  );
}

export function FocusClock({ style, timeLeft, initialTime }: { style: ClockStyle; timeLeft: number; initialTime: number }) {
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const seconds = (timeLeft % 60).toString().padStart(2, '0');
  const time = `${minutes}:${seconds}`;
  const progress = initialTime > 0 ? timeLeft / initialTime : 1;
  const circumference = 2 * Math.PI * 140;
  const elapsed = initialTime - timeLeft;

  if (style === 'flip') return (
    <div className="focus-clock-display focus-flip" role="timer" aria-label={`${minutes} minutes ${seconds} seconds remaining`}>
      <div className="flip-clock" aria-hidden="true">
        <div className="flip-group">{minutes.split('').map((digit, index) => <FlipDigit key={index} value={digit} />)}<span className="flip-unit">MINUTES</span></div>
        <span className="flip-colon"><i /><i /></span>
        <div className="flip-group">{seconds.split('').map((digit, index) => <FlipDigit key={index} value={digit} />)}<span className="flip-unit">SECONDS</span></div>
      </div>
      <div className="flip-progress"><span style={{ transform: `scaleX(${progress})` }} /></div>
    </div>
  );

  return (
    <div className={`focus-clock-display focus-clock relative ${style === 'dial' ? 'focus-dial' : 'focus-classic'}`} role="timer" aria-label={`${minutes} minutes ${seconds} seconds remaining`}>
      <svg className="clock-face" viewBox="0 0 300 300" aria-hidden="true">
        <circle cx="150" cy="150" r="140" className="clock-track" />
        <circle cx="150" cy="150" r="140" className="clock-progress" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} transform="rotate(-90 150 150)" />
        {style === 'dial' && <>
          {Array.from({ length: 60 }, (_, index) => <line key={index} x1="150" y1={index % 5 === 0 ? '25' : '21'} x2="150" y2="33" transform={`rotate(${index * 6} 150 150)`} className={index % 5 === 0 ? 'dial-tick major' : 'dial-tick'} />)}
          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((number, index) => <text key={number} x={150 + Math.sin(index * Math.PI / 6) * 102} y={150 - Math.cos(index * Math.PI / 6) * 102} className="dial-number">{String(number).padStart(2, '0')}</text>)}
          <line x1="150" y1="150" x2="150" y2="80" transform={`rotate(${elapsed / 60 * 6} 150 150)`} className="dial-minute-hand" />
          <line x1="150" y1="169" x2="150" y2="48" transform={`rotate(${elapsed * 6} 150 150)`} className="dial-second-hand" />
          <circle cx="150" cy="150" r="5" className="dial-pin" />
        </>}
      </svg>
      <div className="clock-readout"><span>{time}</span><span>{style === 'dial' ? 'TIME REMAINING' : 'MINUTES LEFT'}</span></div>
    </div>
  );
}

export function ZenBackdrop({ sound = 'none' }: { sound?: string }) {
  return <div className="zen-backdrop" data-scene={sound === 'calm' ? 'calm' : sound === 'quran' ? 'desert' : 'quiet'} aria-hidden="true">
    <div className="scene-sky" />
    <div className="scene-moon" />
    <div className="scene-stars">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ '--x': `${(index * 37 + 7) % 100}%`, '--y': `${(index * 23 + 5) % 65}%`, '--delay': `${-index * 1.7}s` } as React.CSSProperties} />)}</div>
    <svg className="scene-landscape" viewBox="0 0 1440 700" preserveAspectRatio="xMidYMax slice">
      <g className="scene-desert">
        <path className="dune far" d="M0 490 Q240 340 540 465 T1100 440 T1440 470 V700 H0Z" />
        <path className="dune middle" d="M0 570 Q350 410 690 535 T1440 485 V700 H0Z" />
        <path className="dune near" d="M0 610 Q280 565 620 620 T1440 565 V700 H0Z" />
        <g className="desert-tree">
          <path d="M1168 590 Q1162 540 1181 483 L1178 451 L1188 451 L1190 490 Q1178 535 1182 590Z" fill="#29291f" />
          <path d="M1182 495 L1140 463 M1182 481 L1217 454 M1183 466 L1165 445" fill="none" stroke="#29291f" strokeWidth="7" strokeLinecap="round" />
          <path d="M1106 455 Q1095 433 1129 425 Q1128 403 1157 410 Q1184 387 1208 409 Q1241 402 1245 422 Q1273 427 1263 447 Q1227 464 1182 455 Q1140 469 1106 455Z" fill="#353729" />
          <path d="M1120 435 Q1179 401 1237 431" fill="none" stroke="#58563c" strokeWidth="8" opacity=".25" />
        </g>
      </g>
      <g className="scene-forest">
        <path d="M0 430 Q200 340 440 440 T890 405 T1440 420 V700 H0Z" fill="#1b262a" />
        <path d="M0 540 Q300 440 650 525 T1440 485 V700 H0Z" fill="#152024" />
        {[40, 125, 215, 1130, 1240, 1360].map((x, index) => <g key={x} transform={`translate(${x} ${405 + index % 3 * 23}) scale(${.8 + index % 3 * .2})`}><path d="M0 110 V-70" stroke="#111b1d" strokeWidth="9" /><path d="M0-120 L-46-35 H-29 L-62 23 H-36 L-77 85 H77 L36 23 H62 L29-35 H46Z" fill="#142023" /></g>)}
        <path d="M0 635 Q400 600 800 640 T1440 620 V700 H0Z" fill="#111a1e" />
      </g>
    </svg>
    <div className="scene-mist" />

    <div className="scene-sand">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--x': `${index * 9}%`, '--y': `${70 + index % 4 * 6}%`, '--delay': `${-index * 3}s` } as React.CSSProperties} />)}</div>
    <div className="scene-vignette" />
  </div>;
}
