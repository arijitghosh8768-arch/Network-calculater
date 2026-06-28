import React, { useState, useEffect } from 'react';


export const MonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState({
    cpu: 18,
    latency: 14,
    bandwidth: 412,
    errors: 0
  });

  const [history, setHistory] = useState<number[]>([15, 20, 18, 30, 25, 28, 22, 18]);

  useEffect(() => {
    const interval = setInterval(() => {
      const cpuVal = Math.floor(Math.random() * 25) + 10;
      setMetrics({
        cpu: cpuVal,
        latency: Math.floor(Math.random() * 8) + 10,
        bandwidth: Math.floor(Math.random() * 100) + 380,
        errors: Math.random() > 0.95 ? 1 : 0
      });
      setHistory(prev => [...prev.slice(1), cpuVal]);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  // Map history to SVG points
  const points = history.map((val, idx) => `${idx * 40},${100 - val}`).join(" ");

  return (
    <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
      <div className="flex items-center justify-between border-b border-gray-850 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">NetArchitect X Monitoring Desk</h3>
          <p className="text-[11px] text-gray-400 mt-1">Real-time simulation of SNMP node polling, bandwidth charts, and packet latency.</p>
        </div>
        <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          POLLING ACTIVE
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'Core CPU Load', val: `${metrics.cpu}%`, color: 'text-indigo-400' },
          { name: 'ICMP Latency', val: `${metrics.latency} ms`, color: 'text-sky-400' },
          { name: 'Edge Bandwidth', val: `${metrics.bandwidth} Mbps`, color: 'text-emerald-400' },
          { name: 'Backbone Errors', val: metrics.errors, color: metrics.errors > 0 ? 'text-red-500 font-bold' : 'text-gray-400' }
        ].map((item, idx) => (
          <div key={idx} className="bg-gray-900/60 border border-gray-850 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.name}</span>
            <span className={`text-base font-bold mt-2 font-mono ${item.color}`}>{item.val}</span>
          </div>
        ))}
      </div>

      {/* SVG Polled Graph */}
      <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">CPU Utilization Polling History (Last 8 intervals)</span>
        <div className="h-28 w-full border-b border-l border-gray-850 relative flex items-end">
          <svg className="w-full h-full" viewBox="0 0 280 100" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#6366f1"
              strokeWidth="2"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
