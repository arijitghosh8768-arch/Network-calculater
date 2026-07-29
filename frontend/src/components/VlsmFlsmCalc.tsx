import React, { useState } from 'react';
import { requestApi } from '../utils/api';
import { Network, Plus, Trash2, Sliders, Play, Server, Laptop, HelpCircle } from 'lucide-react';

interface VlsmFlsmCalcProps {
  apiConnected: boolean | null;
}

export const VlsmFlsmCalc: React.FC<VlsmFlsmCalcProps> = ({ apiConnected }) => {
  const [baseNet, setBaseNet] = useState('192.168.1.0/24');
  const [mode, setMode] = useState<'vlsm' | 'flsm'>('vlsm');

  // VLSM State
  const [vlsmReqs, setVlsmReqs] = useState<any[]>([
    { name: 'Engineering', hosts: 50 },
    { name: 'Sales', hosts: 25 },
    { name: 'Marketing', hosts: 10 },
    { name: 'HR', hosts: 5 }
  ]);

  // FLSM State
  const [flsmType, setFlsmType] = useState<'subnets' | 'hosts'>('subnets');
  const [flsmVal, setFlsmVal] = useState(8);

  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // VLSM Local Fallback
  const calculateVlsmLocal = (baseNetworkStr: string, requirements: any[]) => {
    try {
      const parts = baseNetworkStr.split('/');
      if (parts.length !== 2) throw new Error("Invalid base network format");
      const baseIp = parts[0];
      // const baseCidr = Number(parts[1]);
      
      const ipParts = baseIp.split('.').map(Number);
      let currentIp = (ipParts[0] << 24) >>> 0 | (ipParts[1] << 16) >>> 0 | (ipParts[2] << 8) >>> 0 | ipParts[3];
      
      const sortedReqs = requirements
        .map((r, idx) => ({ id: idx, name: r.name, hosts: Number(r.hosts) }))
        .sort((a, b) => b.hosts - a.hosts);
        
      const allocated: any[] = [];
      const numToIp = (num: number) => [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');

      for (const req of sortedReqs) {
        const totalIps = req.hosts + 2;
        const pow2 = Math.pow(2, Math.ceil(Math.log2(totalIps)));
        const cidr = 32 - Math.log2(pow2);
        
        if (currentIp % pow2 !== 0) {
          currentIp = Math.ceil(currentIp / pow2) * pow2;
        }
        
        const netAddr = currentIp;
        const broadAddr = netAddr + pow2 - 1;
        
        allocated.push({
          id: req.id,
          name: req.name,
          hosts_requested: req.hosts,
          network_address: numToIp(netAddr),
          broadcast_address: numToIp(broadAddr),
          netmask: numToIp(~(pow2 - 1)),
          cidr,
          first_host: numToIp(netAddr + 1),
          last_host: numToIp(broadAddr - 1),
          usable_hosts: pow2 - 2,
          total_hosts: pow2
        });
        
        currentIp = broadAddr + 1;
      }
      
      return { success: true, base_network: baseNetworkStr, allocated_subnets: allocated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // FLSM Local Fallback
  const calculateFlsmLocal = (baseNetworkStr: string, numSubnets: number | null, hostsPerSubnet: number | null) => {
    try {
      const parts = baseNetworkStr.split('/');
      if (parts.length !== 2) throw new Error("Invalid base network format");
      const baseIp = parts[0];
      const baseCidr = Number(parts[1]);
      
      let newPrefix = baseCidr;
      if (numSubnets) {
        newPrefix = baseCidr + Math.ceil(Math.log2(numSubnets));
      } else if (hostsPerSubnet) {
        newPrefix = 32 - Math.ceil(Math.log2(hostsPerSubnet + 2));
      }
      
      if (newPrefix > 32) throw new Error("Prefix exceeds 32");
      const pow2 = Math.pow(2, 32 - newPrefix);
      
      const ipParts = baseIp.split('.').map(Number);
      let currentIp = (ipParts[0] << 24) >>> 0 | (ipParts[1] << 16) >>> 0 | (ipParts[2] << 8) >>> 0 | ipParts[3];
      
      const allocated: any[] = [];
      const numToIp = (num: number) => [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');

      const totalSubnets = Math.pow(2, newPrefix - baseCidr);
      for (let i = 0; i < Math.min(totalSubnets, 64); i++) {
        const netAddr = currentIp + (i * pow2);
        const broadAddr = netAddr + pow2 - 1;
        allocated.push({
          index: i + 1,
          network_address: numToIp(netAddr),
          broadcast_address: numToIp(broadAddr),
          netmask: numToIp(~(pow2 - 1)),
          cidr: newPrefix,
          first_host: numToIp(netAddr + 1),
          last_host: numToIp(broadAddr - 1),
          usable_hosts: pow2 - 2
        });
      }
      
      return { success: true, base_network: baseNetworkStr, new_cidr: newPrefix, total_subnets_possible: totalSubnets, subnets: allocated };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      if (mode === 'vlsm') {
        if (apiConnected) {
          const data = await requestApi('/calculate/vlsm', 'POST', { base_network: baseNet, requirements: vlsmReqs });
          setResults({ type: 'vlsm', data });
        } else {
          const res = calculateVlsmLocal(baseNet, vlsmReqs);
          if (res.success) setResults({ type: 'vlsm', data: res });
          else setError(res.error || 'VLSM error');
        }
      } else {
        const payload: any = { base_network: baseNet };
        if (flsmType === 'subnets') payload.num_subnets = flsmVal;
        else payload.hosts_per_subnet = flsmVal;
        
        if (apiConnected) {
          const data = await requestApi('/calculate/flsm', 'POST', payload);
          setResults({ type: 'flsm', data });
        } else {
          const res = calculateFlsmLocal(baseNet, flsmType === 'subnets' ? flsmVal : null, flsmType === 'hosts' ? flsmVal : null);
          if (res.success) setResults({ type: 'flsm', data: res });
          else setError(res.error || 'FLSM error');
        }
      }
    } catch (e: any) {
      // Fallback
      if (mode === 'vlsm') {
        const res = calculateVlsmLocal(baseNet, vlsmReqs);
        if (res.success) setResults({ type: 'vlsm', data: res });
        else setError(e.message || 'VLSM error');
      } else {
        const res = calculateFlsmLocal(baseNet, flsmType === 'subnets' ? flsmVal : null, flsmType === 'hosts' ? flsmVal : null);
        if (res.success) setResults({ type: 'flsm', data: res });
        else setError(e.message || 'FLSM error');
      }
    } finally {
      setLoading(false);
    }
  };

  const addVlsmRequirement = () => {
    setVlsmReqs([...vlsmReqs, { name: `Subnet ${vlsmReqs.length + 1}`, hosts: 10 }]);
  };

  const removeVlsmRequirement = (idx: number) => {
    setVlsmReqs(vlsmReqs.filter((_, i) => i !== idx));
  };

  const updateVlsmRequirement = (idx: number, field: string, val: any) => {
    const updated = [...vlsmReqs];
    updated[idx][field] = val;
    setVlsmReqs(updated);
  };

  // Rendering Interactive Topology Diagram
  const renderDiagram = () => {
    if (!results) return null;
    const subnets = results.type === 'vlsm' ? results.data.allocated_subnets : results.data.subnets;
    if (!subnets || subnets.length === 0) return null;

    // Draw SVG nodes
    const svgWidth = 800;
    const svgHeight = 400;
    const routerX = svgWidth / 2;
    const routerY = 60;
    const totalSubnets = Math.min(subnets.length, 5); // Limit layout to 5 subnets for clarity

    const switchNodes = Array.from({ length: totalSubnets }).map((_, idx) => {
      const x = (svgWidth / (totalSubnets + 1)) * (idx + 1);
      const y = 180;
      return { x, y, info: subnets[idx] };
    });

    return (
      <div className="bg-gray-950/60 border border-gray-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Topology Visualization</h3>
          <span className="text-xs text-gray-400">Showing top {totalSubnets} subnets</span>
        </div>
        <div className="overflow-x-auto">
          <svg width={svgWidth} height={svgHeight} className="mx-auto select-none">
            {/* Draw connections first (behind nodes) */}
            {switchNodes.map((s, idx) => (
              <g key={`link-${idx}`}>
                {/* Router to Switch */}
                <line
                  x1={routerX}
                  y1={routerY}
                  x2={s.x}
                  y2={s.y}
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeDasharray="4 4"
                  className="glow-pulse"
                />
                {/* Switch to Host 1 */}
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={s.x - 30}
                  y2={s.y + 80}
                  stroke="#374151"
                  strokeWidth="1.5"
                />
                {/* Switch to Host 2 */}
                <line
                  x1={s.x}
                  y1={s.y}
                  x2={s.x + 30}
                  y2={s.y + 80}
                  stroke="#374151"
                  strokeWidth="1.5"
                />
              </g>
            ))}

            {/* Router Node */}
            <g transform={`translate(${routerX - 30}, ${routerY - 30})`} className="cursor-pointer">
              <rect width="60" height="60" rx="12" fill="#4f46e5" stroke="#818cf8" strokeWidth="2" className="glow-border" />
              <Server className="w-8 h-8 text-white mx-auto mt-3.5" />
              <text x="30" y="75" fill="#f3f4f6" fontSize="11" textAnchor="middle" fontWeight="bold">Router (Gateway)</text>
              <text x="30" y="90" fill="#9ca3af" fontSize="9" textAnchor="middle">{results.data.base_network}</text>
            </g>

            {/* Switch & Host Nodes */}
            {switchNodes.map((s, idx) => {
              const name = results.type === 'vlsm' ? s.info.name : `Subnet ${s.info.index}`;
              const subnetIp = s.info.network_address + '/' + s.info.cidr;
              return (
                <g key={`nodes-${idx}`}>
                  {/* Switch Node */}
                  <g transform={`translate(${s.x - 20}, ${s.y - 20})`} className="cursor-pointer group">
                    <rect
                      width="40"
                      height="40"
                      rx="8"
                      fill="#10b981"
                      stroke="#34d399"
                      strokeWidth="2"
                      className="group-hover:fill-emerald-500 transition-colors"
                    />
                    <Network className="w-5 h-5 text-white mx-auto mt-2.5" />
                    <text x="20" y="55" fill="#ffffff" fontSize="10" textAnchor="middle" fontWeight="bold">{name}</text>
                    <text x="20" y="68" fill="#9ca3af" fontSize="8" textAnchor="middle">{subnetIp}</text>
                  </g>

                  {/* Host 1 Node (PC) */}
                  <g transform={`translate(${s.x - 45}, ${s.y + 70})`}>
                    <rect width="30" height="24" rx="4" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
                    <Laptop className="w-4 h-4 text-gray-400 mx-auto mt-1" />
                    <text x="15" y="-5" fill="#9ca3af" fontSize="7" textAnchor="middle">{s.info.first_host}</text>
                  </g>

                  {/* Host 2 Node (Server/PC) */}
                  <g transform={`translate(${s.x + 15}, ${s.y + 70})`}>
                    <rect width="30" height="24" rx="4" fill="#1f2937" stroke="#4b5563" strokeWidth="1.5" />
                    <Laptop className="w-4 h-4 text-gray-400 mx-auto mt-1" />
                    <text x="15" y="-5" fill="#9ca3af" fontSize="7" textAnchor="middle">{s.info.last_host}</text>
                  </g>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Settings & Inputs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-5 text-left">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0">
            <Sliders className="w-5 h-5 text-indigo-400" />
            Planner Settings
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Base Network IP/CIDR</label>
              <input
                type="text"
                value={baseNet}
                onChange={(e) => setBaseNet(e.target.value)}
                placeholder="e.g. 192.168.1.0/24"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Planning Strategy</label>
              <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-xl">
                <button
                  onClick={() => setMode('vlsm')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'vlsm' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  VLSM (Variable)
                </button>
                <button
                  onClick={() => setMode('flsm')}
                  className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                    mode === 'flsm' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  FLSM (Fixed)
                </button>
              </div>
            </div>

            {mode === 'vlsm' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Subnet Requirements</label>
                  <button
                    onClick={addVlsmRequirement}
                    className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {vlsmReqs.map((req, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={req.name}
                        onChange={(e) => updateVlsmRequirement(idx, 'name', e.target.value)}
                        placeholder="Subnet Name"
                        className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white text-xs"
                      />
                      <input
                        type="number"
                        value={req.hosts}
                        onChange={(e) => updateVlsmRequirement(idx, 'hosts', Math.max(1, Number(e.target.value)))}
                        placeholder="Hosts"
                        className="w-20 bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                      />
                      <button
                        onClick={() => removeVlsmRequirement(idx)}
                        disabled={vlsmReqs.length <= 1}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded-lg shrink-0 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Subnet By</label>
                  <div className="grid grid-cols-2 gap-2 bg-gray-900 p-1 rounded-xl">
                    <button
                      onClick={() => setFlsmType('subnets')}
                      className={`py-1.5 rounded-lg text-xs transition-all ${
                        flsmType === 'subnets' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      Subnet Count
                    </button>
                    <button
                      onClick={() => setFlsmType('hosts')}
                      className={`py-1.5 rounded-lg text-xs transition-all ${
                        flsmType === 'hosts' ? 'bg-indigo-600 text-white' : 'text-gray-400'
                      }`}
                    >
                      Hosts Per Subnet
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Value</label>
                  <input
                    type="number"
                    value={flsmVal}
                    onChange={(e) => setFlsmVal(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2 text-white font-mono text-sm"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm mt-2"
            >
              <Play className="w-4 h-4" />
              Generate Allocation
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl text-xs text-red-400 text-center">
              {error}
            </div>
          )}
        </div>

        {/* Results / List Table */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0 text-left">
            <Network className="w-5 h-5 text-indigo-400" />
            Allocation Schedule
          </h2>

          {results ? (
            <div className="space-y-6">
              <div className="overflow-x-auto border border-gray-800 rounded-xl">
                <table className="min-w-full divide-y divide-gray-800 text-left">
                  <thead className="bg-gray-900/60 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Name/Idx</th>
                      <th className="px-4 py-3">Network IP</th>
                      <th className="px-4 py-3">Mask / CIDR</th>
                      <th className="px-4 py-3">Usable Host Range</th>
                      <th className="px-4 py-3">Usable Hosts</th>
                      <th className="px-4 py-3">Broadcast Address</th>
                      <th className="px-4 py-3">Subnet Mask</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80 bg-gray-950/10 text-xs text-gray-300 font-mono">
                    {(results.type === 'vlsm' ? results.data.allocated_subnets : results.data.subnets).map((s: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-800/20">
                        <td className="px-4 py-3 font-semibold text-white">{results.type === 'vlsm' ? s.name : `Subnet ${s.index}`}</td>
                        <td className="px-4 py-3 text-indigo-400">{s.network_address}</td>
                        <td className="px-4 py-3">{s.netmask} (/{s.cidr})</td>
                        <td className="px-4 py-3">{s.first_host} - {s.last_host}</td>
                        <td className="px-4 py-3">{s.usable_hosts.toLocaleString()}</td>
                        <td className="px-4 py-3 text-amber-400/90">{s.broadcast_address}</td>
                        <td className="px-4 py-3 text-gray-400">{s.netmask}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {renderDiagram()}
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
              <HelpCircle className="w-10 h-10 text-gray-600 animate-pulse" />
              Configure network settings and click Generate Allocation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
