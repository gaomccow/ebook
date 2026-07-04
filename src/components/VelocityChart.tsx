import React from 'react';

interface VelocityChartProps {
  // Array of numbers representing XP gained per day for the last 7 days
  data: number[];
  language?: string;
}

export const VelocityChart: React.FC<VelocityChartProps> = ({ data, language }) => {
  const days = language === 'vi'
    ? ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
    : language === 'fr'
      ? ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di']
      : language === 'zh'
        ? ['一', '二', '三', '四', '五', '六', '日']
        : language === 'es'
          ? ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
          : language === 'de'
            ? ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
            : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  
  // Align data to be exactly 7 items
  const chartData = [...data];
  while (chartData.length < 7) {
    chartData.unshift(0);
  }
  const cleanData = chartData.slice(-7);

  const height = 80;
  const width = 240;
  const padding = 15;

  const maxVal = Math.max(...cleanData, 50); // Min scale of 50 XP
  
  // Calculate points
  const points = cleanData.map((val, idx) => {
    const x = padding + (idx * (width - padding * 2)) / 6;
    const y = height - padding - (val * (height - padding * 2)) / maxVal;
    return { x, y };
  });

  // Generate SVG path strings
  let linePath = '';
  let areaPath = '';
  
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      // Smooth Bezier connection
      const cpX1 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY1 = points[i-1].y;
      const cpX2 = points[i-1].x + (points[i].x - points[i-1].x) / 2;
      const cpY2 = points[i].y;
      linePath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${points[i].x} ${points[i].y}`;
    }
    
    // Create closed area for gradient fill
    areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
  }

  return (
    <div className="w-full flex flex-col items-center select-none mt-2">
      <span className="text-[10px] font-black opacity-60 uppercase tracking-widest self-start mb-1.5">
        {language === 'vi' ? 'Tốc độ đọc (7 ngày)' : 'Reading Velocity (7D)'}
      </span>
      <div className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-2 relative overflow-hidden">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-[75px]"
        >
          <defs>
            <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-color, #1cb0f6)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent-color, #1cb0f6)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(150,150,150,0.15)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(150,150,150,0.08)" strokeWidth="1" strokeDasharray="2 2" />

          {/* Filled Area */}
          {areaPath && (
            <path d={areaPath} fill="url(#chartGradient)" />
          )}

          {/* Line */}
          {linePath && (
            <path 
              d={linePath} 
              fill="none" 
              stroke="var(--accent-color, #1cb0f6)" 
              strokeWidth="2.5" 
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt, idx) => (
            <circle 
              key={idx}
              cx={pt.x}
              cy={pt.y}
              r={cleanData[idx] > 0 ? "3.5" : "1.5"}
              fill={cleanData[idx] > 0 ? "var(--accent-color, #1cb0f6)" : "rgba(150,150,150,0.3)"}
              stroke="white"
              strokeWidth="1"
            />
          ))}
        </svg>

        {/* X-Axis labels */}
        <div className="flex justify-between px-2.5 mt-1">
          {days.map((day, idx) => (
            <span 
              key={idx} 
              className="text-[9px] font-black opacity-60 uppercase"
            >
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
