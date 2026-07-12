import React, { useState } from 'react';

const AquariumSandboxDev: React.FC = () => {
  // Mock Global State
  const [userXP, setUserXP] = useState(65000);
  const [kelpCount, setKelpCount] = useState(0);
  const [otterCount, setOtterCount] = useState(0);
  const [worldCompleted, setWorldCompleted] = useState(false);

  // Costs
  const KELP_COST = 1500;
  const OTTER_COST = 3000;
  const WHALE_COST = 15000;

  // Actions
  const buyKelp = () => {
    if (userXP >= KELP_COST && kelpCount < 10) {
      setUserXP((prev) => prev - KELP_COST);
      setKelpCount((prev) => prev + 1);
    }
  };

  const buyOtter = () => {
    if (kelpCount >= 10 && userXP >= OTTER_COST && otterCount < 10) {
      setUserXP((prev) => prev - OTTER_COST);
      setOtterCount((prev) => prev + 1);
    }
  };

  const buyWhale = () => {
    if (otterCount >= 10 && userXP >= WHALE_COST && !worldCompleted) {
      setUserXP((prev) => prev - WHALE_COST);
      setWorldCompleted(true);
    }
  };

  const resetSandbox = () => {
    setUserXP(65000);
    setKelpCount(0);
    setOtterCount(0);
    setWorldCompleted(false);
  };

  // Simple pseudo-random generator
  const rand = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const Sprite = ({ src, x, y, w, h, bgW, bgH, className = '', style = {} }: any) => (
    <div
      className={className}
      style={{
        width: w,
        height: h,
        backgroundImage: `url('${src}')`,
        backgroundPosition: `-${x}px -${y}px`,
        backgroundSize: `${bgW}px ${bgH}px`,
        backgroundRepeat: 'no-repeat',
        ...style
      }}
    />
  );

  return (
    <div className="w-full flex flex-col gap-6 p-4">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-[var(--card-bg)] border-2 border-[var(--border-color)] rounded-2xl p-4 shadow-sm">
        <h2 className="text-xl font-black uppercase tracking-wide">Kelp Forest Ecosystem</h2>
        <div className="flex items-center gap-2 text-duo-yellow font-black text-lg">
          <span className="text-gray-500 text-sm uppercase">Available XP:</span> {userXP.toLocaleString()}
        </div>
      </div>

      {/* Aquarium Visualizer */}
      <div className="relative w-full h-[500px] rounded-3xl border-4 border-slate-800 overflow-hidden shadow-[inset_0_10px_30px_rgba(0,0,0,0.5)] bg-[#041d2f]">

        {/* Pure Clean Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url('/clean_bg.jpg')`,
            backgroundPosition: 'center',
            backgroundSize: 'cover',
          }}
        />

        {/* Whale Silhouette (Capstone) */}
        {worldCompleted && (
          <div
            className="absolute z-10 top-20 pointer-events-none opacity-80"
            style={{
              animation: 'swim-whale 25s linear infinite',
              filter: 'brightness(0.7) contrast(1.1) drop-shadow(0 20px 20px rgba(0,0,0,0.5))'
            }}
          >
            {/* Middle Whale from raw_whales.png */}
            <Sprite src="/raw_whales.png" x={0} y={93} w={512} h={93} bgW={512} bgH={279} />
          </div>
        )}

        {/* Otters Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          {Array.from({ length: otterCount }).map((_, i) => {
            const left = 15 + (i * 10);
            const top = 10 + (i % 3) * 12; // Placed higher
            const delay = i * -2.5;
            // Float otter from raw_otters.png
            const otterX = i % 2 === 0 ? 250 : 380;
            return (
              <div
                key={`otter-${i}`}
                className="absolute drop-shadow-2xl"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  animation: `float-otter ${4 + (i % 2)}s ease-in-out infinite alternate`,
                  animationDelay: `${delay}s`
                }}
              >
                <Sprite
                  src="/raw_otters.png"
                  x={otterX} y={0} w={120} h={120} bgW={512} bgH={279}
                  style={{
                    transform: i % 2 === 0 ? 'scaleX(-0.8) scaleY(0.8)' : 'scale(0.8)',
                    filter: 'drop-shadow(0 10px 10px rgba(0,0,0,0.4))'
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Kelp Forest Layer (Randomized & Organic) */}
        <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
          {Array.from({ length: kelpCount }).map((_, i) => {
            const seed = i + 1;
            const isLeft = i % 2 === 0;
            const side = isLeft ? 'left' : 'right';
            const offset = -20 + Math.floor(rand(seed) * 180);
            const scaleX = (rand(seed + 1) * 0.8 + 1.2) * (isLeft ? 1 : -1);
            const scaleY = rand(seed + 2) * 1.5 + 1.2;
            const z = Math.floor(rand(seed + 3) * 30);
            const spriteX = Math.floor(rand(seed + 4) * 4) * 128;
            const duration = 3 + rand(seed + 5) * 4;
            const bright = 0.5 + (z / 30) * 0.6;

            return (
              <div
                key={`kelp-${i}`}
                className="absolute bottom-0"
                style={{
                  [side]: `${offset}px`,
                  zIndex: 10 + z,
                  transformOrigin: 'bottom center',
                  animation: `sway-kelp ${duration}s ease-in-out infinite alternate`,
                  animationDelay: `${-rand(seed) * 5}s`,
                }}
              >
                <Sprite
                  src="/raw_kelp.png"
                  x={spriteX} y={0} w={128} h={279} bgW={512} bgH={279}
                  style={{
                    transform: `scale(${scaleX}, ${scaleY}) origin-bottom`,
                    transformOrigin: 'bottom center',
                    filter: `brightness(${bright}) contrast(1.1) drop-shadow(0 15px 15px rgba(0,0,0,0.5))`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Ocean Floor Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#020b14]/90 to-transparent z-40 pointer-events-none"></div>

        <style>
          {`
            @keyframes sway-kelp {
              from { transform: rotate(-3deg); }
              to { transform: rotate(3deg); }
            }
            @keyframes float-otter {
              0% { transform: translateY(0px) rotate(-5deg); }
              100% { transform: translateY(-15px) rotate(5deg); }
            }
            @keyframes swim-whale {
              0% { transform: translateX(-600px) translateY(20px); }
              25% { transform: translateX(0px) translateY(-10px); }
              50% { transform: translateX(600px) translateY(10px); }
              100% { transform: translateX(1200px) translateY(-20px); }
            }
          `}
        </style>
      </div>

      {/* Control Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Kelp Button */}
        <button
          onClick={buyKelp}
          disabled={kelpCount >= 10 || userXP < KELP_COST}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 btn-3d transition-all
            ${kelpCount >= 10
              ? 'bg-duo-gray border-duo-gray-dark text-gray-500'
              : userXP >= KELP_COST
                ? 'bg-duo-green border-duo-green-dark text-white hover:bg-duo-green-hover'
                : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'}
          `}
        >
          <span className="font-black text-lg uppercase">Plant Kelp</span>
          <span className="text-sm font-bold opacity-90 mt-1">
            {kelpCount >= 10 ? 'MAXED OUT' : `- ${KELP_COST.toLocaleString()} XP`}
          </span>
          <span className="text-xs mt-2 bg-black/10 px-2 py-0.5 rounded-full">{kelpCount} / 10</span>
        </button>

        {/* Otter Button */}
        <button
          onClick={buyOtter}
          disabled={kelpCount < 10 || otterCount >= 10 || userXP < OTTER_COST}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 btn-3d transition-all
            ${kelpCount < 10
              ? 'bg-duo-gray border-duo-gray-dark text-gray-500 cursor-not-allowed'
              : otterCount >= 10
                ? 'bg-duo-gray border-duo-gray-dark text-gray-500'
                : userXP >= OTTER_COST
                  ? 'bg-duo-blue border-duo-blue-dark text-white hover:bg-blue-500'
                  : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'}
          `}
        >
          <span className="font-black text-lg uppercase">Attract Otter</span>
          <span className="text-sm font-bold opacity-90 mt-1">
            {kelpCount < 10 ? 'Requires 10 Kelp' : otterCount >= 10 ? 'MAXED OUT' : `- ${OTTER_COST.toLocaleString()} XP`}
          </span>
          <span className="text-xs mt-2 bg-black/10 px-2 py-0.5 rounded-full">{otterCount} / 10</span>
        </button>

        {/* Whale Button */}
        <button
          onClick={buyWhale}
          disabled={otterCount < 10 || worldCompleted || userXP < WHALE_COST}
          className={`flex flex-col items-center justify-center p-4 rounded-2xl border-4 btn-3d transition-all
            ${otterCount < 10
              ? 'bg-duo-gray border-duo-gray-dark text-gray-500 cursor-not-allowed'
              : worldCompleted
                ? 'bg-duo-yellow border-duo-yellow-dark text-yellow-900'
                : userXP >= WHALE_COST
                  ? 'bg-duo-purple border-duo-purple-dark text-white hover:bg-purple-500'
                  : 'bg-slate-100 border-slate-300 text-slate-400 cursor-not-allowed'}
          `}
        >
          <span className="font-black text-lg uppercase">Summon Whale</span>
          <span className="text-sm font-bold opacity-90 mt-1">
            {otterCount < 10 ? 'Requires 10 Otters' : worldCompleted ? 'COMPLETED' : `- ${WHALE_COST.toLocaleString()} XP`}
          </span>
          <span className="text-xs mt-2 bg-black/10 px-2 py-0.5 rounded-full">{worldCompleted ? '1' : '0'} / 1</span>
        </button>
      </div>

      {/* Reset Button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={resetSandbox}
          className="px-6 py-3 bg-white border-2 border-red-200 text-red-500 font-bold uppercase rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
        >
          Reset Ecosystem
        </button>
      </div>

    </div>
  );
};

import { ClayPanel } from './ui/ClayPanel';

const AquariumSandbox: React.FC = () => {
  return (
    <div className="w-full flex flex-col p-4">
      <ClayPanel className="w-full min-h-[500px] flex flex-col items-center justify-center p-8 text-center mt-4">
        <img 
          src="/shush.png" 
          alt="Shush Emoji" 
          className="w-32 h-32 mb-8 drop-shadow-xl"
        />
        <h2 className="text-5xl md:text-[64px] font-black uppercase tracking-[0.1em] mb-6 text-[#1f2937] dark:text-white">
          SHHHHHHHH
        </h2>
        <p className="text-xl md:text-2xl text-gray-500 dark:text-gray-400 font-bold uppercase tracking-[0.1em] leading-loose max-w-2xl">
          This section is in development<br />and is coming soon
        </p>
      </ClayPanel>
    </div>
  );
};

export default AquariumSandbox;
export { AquariumSandboxDev };
