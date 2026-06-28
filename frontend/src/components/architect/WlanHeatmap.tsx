import React, { useState, useEffect } from 'react';
import { requestApi } from '../../utils/api';
import { RefreshCw } from 'lucide-react';

interface WlanHeatmapProps {
  apiConnected: boolean | null;
  floorsCount: number;
}

export const WlanHeatmap: React.FC<WlanHeatmapProps> = ({ apiConnected, floorsCount }) => {
  const [width, setWidth] = useState(80);
  const [length, setLength] = useState(120);
  const [floors, setFloors] = useState(floorsCount);
  const [activeFloor, setActiveFloor] = useState(1);
  const [heatmapData, setHeatmapData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Sync floors count with parent wizard state
  useEffect(() => {
    setFloors(floorsCount);
  }, [floorsCount]);

  const loadHeatmap = async () => {
    setLoading(true);
    try {
      if (apiConnected) {
        const data = await requestApi('/architect/heatmap', 'POST', { width, length, floors });
        setHeatmapData(data);
      } else {
        // Fallback local calculations
        setHeatmapData({
          width,
          length,
          floors,
          total_aps: floors * 4,
          aps: Array.from({ length: floors * 4 }).map((_, idx) => ({
            id: `AP-F${Math.floor(idx/4)+1}-${(idx%4)+1}`,
            floor: Math.floor(idx/4)+1,
            x: 20 + (idx % 4) * (width / 4),
            y: 30 + Math.floor(idx/4) * (length / 5),
            channel: [1, 6, 11][idx % 3]
          })),
          dead_zones: [{ label: 'Elevator Shaft Concrete Vault', x: width / 2, y: length / 2, radius: 15 }]
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHeatmap();
  }, [apiConnected, width, length, floors]);

  const currentFloorAps = heatmapData?.aps?.filter((ap: any) => ap.floor === activeFloor) || [];

  return (
    <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-850 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">WLAN Heatmap & RF Planner</h3>
          <p className="text-[11px] text-gray-400 mt-1">Model RF propagation levels, locate dead zones, and assign 2.4/5GHz channels across building coordinates.</p>
        </div>

        {/* Floor switcher */}
        <div className="flex items-center gap-2">
          {Array.from({ length: floors }).map((_, fIdx) => (
            <button
              key={fIdx}
              onClick={() => setActiveFloor(fIdx + 1)}
              className={`px-3 py-1 rounded text-xs font-semibold ${
                activeFloor === fIdx + 1 ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400'
              }`}
            >
              Floor {fIdx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left inputs */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Width (meters)</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setWidth(Math.max(10, Number(e.target.value)))}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1.5 uppercase">Length (meters)</label>
              <input
                type="number"
                value={length}
                onChange={(e) => setLength(Math.max(10, Number(e.target.value)))}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono text-xs"
              />
            </div>
          </div>

          <div className="bg-gray-900/60 p-4 border border-gray-850 rounded-xl text-xs space-y-3 font-sans">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Coverage Strategy</span>
            <div className="flex items-center justify-between text-gray-300">
              <span>Suggested AP Count:</span>
              <span className="font-mono font-bold text-white">{heatmapData?.total_aps}</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Channel Pattern:</span>
              <span className="font-mono text-white">Non-Overlapping (1, 6, 11)</span>
            </div>
            <div className="flex items-center justify-between text-gray-300">
              <span>Safety Margin:</span>
              <span className="font-mono text-emerald-400">+15dBm Boundary</span>
            </div>
          </div>
        </div>

        {/* Right Heatmap Diagram */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 overflow-x-auto relative min-h-[300px]">
            {loading && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center rounded-xl z-20">
                <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
            )}

            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-2 font-mono">
              Floor Plan Signal Heatmap ({width}m x {length}m)
            </span>

            {/* Heatmap Visualizer Grid */}
            <svg width="450" height="240" className="mx-auto border border-gray-850 rounded bg-gray-950 font-mono text-[8px] relative z-10">
              {/* Draw signal coverage gradient loops */}
              {currentFloorAps.map((ap: any, idx: number) => {
                // Scale coordinates to fit the 450x240 SVG viewbox
                const scaleX = (ap.x / width) * 450;
                const scaleY = (ap.y / length) * 240;
                return (
                  <g key={idx}>
                    {/* Signal circles */}
                    <circle cx={scaleX} cy={scaleY} r="75" fill="rgba(16, 185, 129, 0.12)" stroke="rgba(16, 185, 129, 0.2)" strokeWidth="1" />
                    <circle cx={scaleX} cy={scaleY} r="45" fill="rgba(16, 185, 129, 0.18)" />
                    <circle cx={scaleX} cy={scaleY} r="3" fill="#10b981" />
                    <text x={scaleX} y={scaleY - 6} fill="#ffffff" fontWeight="bold" textAnchor="middle">
                      {ap.id} (Ch{ap.channel})
                    </text>
                  </g>
                );
              })}

              {/* Dead Zones */}
              {heatmapData?.dead_zones?.map((dz: any, idx: number) => {
                const scaleX = (dz.x / width) * 450;
                const scaleY = (dz.y / length) * 240;
                return (
                  <g key={idx}>
                    <circle cx={scaleX} cy={scaleY} r="30" fill="rgba(239, 68, 68, 0.25)" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" />
                    <text x={scaleX} y={scaleY + 3} fill="#ef4444" fontWeight="bold" textAnchor="middle">
                      {dz.label} (Dead Zone)
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};
