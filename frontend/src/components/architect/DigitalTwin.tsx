import React, { useState } from 'react';
import { Play, CheckCircle } from 'lucide-react';

export const DigitalTwin: React.FC = () => {
  const [source, setSource] = useState('PC-Floor1');
  const [dest, setDest] = useState('Core-Server');
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);

  const runSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setSimStep(0);
    setLogs([
      `[DigitalTwin] Initiating ICMP Echo Request from ${source} to ${dest}...`,
      `[ARP] Checking local host ARP cache for gateway interface...`
    ]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setSimStep(step);
      if (step === 1) {
        setLogs(prev => [...prev, `[Switch] Frame enters access switch SW-Floor1. Injecting 802.1Q tag for VLAN 20.`]);
      } else if (step === 2) {
        setLogs(prev => [...prev, `[Switch] Core Switch receives tagged VLAN 20 frame. Forwarding on trunk port G1/0/1.`]);
      } else if (step === 3) {
        setLogs(prev => [...prev, `[Router] Gateway R1 decapsulates 802.1Q header. Routing packet to Core Server (VLAN 50).`]);
      } else if (step === 4) {
        setLogs(prev => [...prev, `[Destination] ${dest} successfully reached! Processing ICMP payload.`, `[Ping Status] 0% Packet Loss | RTT: 12ms | Hops: 3`]);
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1200);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-850 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Network Digital Twin Engine</h3>
          <p className="text-[11px] text-gray-400 mt-1">Simulate real-time routing logic and protocol headers in a virtual topology sandbox.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <span>Source:</span>
            <select value={source} onChange={(e) => setSource(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-white">
              <option value="PC-Floor1">PC Floor 1 (VLAN 20)</option>
              <option value="PC-Floor2">PC Floor 2 (VLAN 20)</option>
              <option value="WiFi-Staff">WIFI Staff Client (VLAN 60)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <span>Destination:</span>
            <select value={dest} onChange={(e) => setDest(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-white">
              <option value="Core-Server">Main DNS/AD Server (VLAN 50)</option>
              <option value="Gateway-Edge">Edge Router Gateway (R1)</option>
            </select>
          </div>

          <button onClick={runSimulation} disabled={simulating} className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Execute Digital Ping
          </button>
        </div>
      </div>

      {/* SVG Map */}
      <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-6 relative overflow-x-auto">
        <svg width="600" height="240" className="mx-auto font-mono text-[9px]">
          {/* Cables */}
          <line x1="100" y1="180" x2="250" y2="120" stroke="#374151" strokeWidth="2" />
          <line x1="250" y1="120" x2="350" y2="120" stroke="#4f46e5" strokeWidth="2.5" strokeDasharray="3 3" />
          <line x1="350" y1="120" x2="500" y2="180" stroke="#374151" strokeWidth="2" />

          {/* Packet Animation */}
          {simStep >= 0 && (
            <circle
              cx={
                simStep === 0 ? 100 :
                simStep === 1 ? 175 :
                simStep === 2 ? 250 :
                simStep === 3 ? 350 : 500
              }
              cy={
                simStep === 0 ? 180 :
                simStep === 1 ? 150 :
                simStep === 2 ? 120 :
                simStep === 3 ? 120 : 180
              }
              r="6"
              fill="#10b981"
              className="transition-all duration-1000"
            />
          )}

          {/* Device Nodes */}
          {/* Source Host */}
          <g transform="translate(100, 180)">
            <circle r="12" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
            <text y="22" fill="#e5e7eb" fontWeight="bold" textAnchor="middle">PC-Host</text>
          </g>
          {/* Access Switch */}
          <g transform="translate(175, 150)">
            <circle r="12" fill="#10b981" stroke="#34d399" strokeWidth="1.5" />
            <text y="-18" fill="#e5e7eb" textAnchor="middle">SW-Access</text>
          </g>
          {/* Core Switch */}
          <g transform="translate(250, 120)">
            <circle r="12" fill="#10b981" stroke="#34d399" strokeWidth="1.5" />
            <text y="-18" fill="#e5e7eb" textAnchor="middle">SW-Core</text>
          </g>
          {/* Router */}
          <g transform="translate(350, 120)">
            <circle r="12" fill="#4f46e5" stroke="#818cf8" strokeWidth="1.5" />
            <text y="-18" fill="#e5e7eb" textAnchor="middle">R1-Edge</text>
          </g>
          {/* Destination Server */}
          <g transform="translate(500, 180)">
            <circle r="12" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
            <text y="22" fill="#e5e7eb" fontWeight="bold" textAnchor="middle">Server</text>
          </g>
        </svg>
      </div>

      {/* Terminal logs */}
      {logs.length > 0 && (
        <div className="bg-black/90 p-4 rounded-xl border border-gray-850 font-mono text-[11px] text-green-400 space-y-1.5">
          {logs.map((log, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {idx === logs.length - 1 && simulating ? (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              ) : (
                <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
              )}
              <span>{log}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
