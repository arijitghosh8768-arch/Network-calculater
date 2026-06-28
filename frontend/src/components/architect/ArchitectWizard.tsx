import React from 'react';
import { HelpCircle, Layers } from 'lucide-react';

interface ArchitectWizardProps {
  company: string;
  setCompany: (c: string) => void;
  floors: number;
  setFloors: (f: number) => void;
  users: number;
  setUsers: (u: number) => void;
  branches: number;
  setBranches: (b: number) => void;
  wifi: boolean;
  setWifi: (w: boolean) => void;
  voip: boolean;
  setVoip: (v: boolean) => void;
  cctv: boolean;
  setCctv: (c: boolean) => void;
  servers: boolean;
  setServers: (s: boolean) => void;
  guest: boolean;
  setGuest: (g: boolean) => void;
  baseIp: string;
  setBaseIp: (ip: string) => void;
  archStyle: string;
  setArchStyle: (style: string) => void;
  onGenerate: () => void;
  results: any;
}

export const ArchitectWizard: React.FC<ArchitectWizardProps> = ({
  company, setCompany, floors, setFloors, users, setUsers, branches, setBranches,
  wifi, setWifi, voip, setVoip, cctv, setCctv, servers, setServers, guest, setGuest,
  baseIp, setBaseIp, archStyle, setArchStyle, onGenerate, results
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Wizard Panel */}
      <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-4 text-left border border-gray-800">
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 m-0 border-b border-gray-850 pb-2">
          <Layers className="w-4 h-4 text-indigo-400" />
          Architect Parameters
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Enterprise Template</label>
            <select value={company} onChange={(e) => setCompany(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs">
              <option value="Hospital">Hospital / Healthcare</option>
              <option value="Bank">Bank / Finance Vault</option>
              <option value="Smart City">Smart City (IoT & Municipal)</option>
              <option value="School">School / Campus</option>
              <option value="University">University Suite</option>
              <option value="Data Center">Data Center Backbone</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Floors / Layers</label>
              <input type="number" value={floors} onChange={(e) => setFloors(Math.max(1, Number(e.target.value)))} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Total Users</label>
              <input type="number" value={users} onChange={(e) => setUsers(Math.max(1, Number(e.target.value)))} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Branches / Remotes</label>
              <input type="number" value={branches} onChange={(e) => setBranches(Math.max(0, Number(e.target.value)))} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Arch Hierarchy</label>
              <select value={archStyle} onChange={(e) => setArchStyle(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2 py-1.5 text-white text-xs">
                <option value="Three-Tier">Three-Tier Core</option>
                <option value="Spine-Leaf">Spine-Leaf Fabric</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Base Network Range</label>
            <input type="text" value={baseIp} onChange={(e) => setBaseIp(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-850">
            <label className="flex items-center gap-2 p-1.5 bg-gray-900/60 border border-gray-850 rounded-lg cursor-pointer">
              <input type="checkbox" checked={wifi} onChange={(e) => setWifi(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
              <span className="text-[10px] text-gray-300 font-semibold uppercase">WLAN WiFi</span>
            </label>
            <label className="flex items-center gap-2 p-1.5 bg-gray-900/60 border border-gray-850 rounded-lg cursor-pointer">
              <input type="checkbox" checked={voip} onChange={(e) => setVoip(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
              <span className="text-[10px] text-gray-300 font-semibold uppercase">VoIP Phones</span>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 p-1.5 bg-gray-900/60 border border-gray-850 rounded-lg cursor-pointer">
              <input type="checkbox" checked={cctv} onChange={(e) => setCctv(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
              <span className="text-[10px] text-gray-300 font-semibold uppercase">CCTV Video</span>
            </label>
            <label className="flex items-center gap-2 p-1.5 bg-gray-900/60 border border-gray-850 rounded-lg cursor-pointer">
              <input type="checkbox" checked={guest} onChange={(e) => setGuest(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
              <span className="text-[10px] text-gray-300 font-semibold uppercase">Guest Portal</span>
            </label>
          </div>

          <label className="flex items-center gap-2 p-1.5 bg-gray-900/60 border border-gray-850 rounded-lg cursor-pointer">
            <input type="checkbox" checked={servers} onChange={(e) => setServers(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
            <span className="text-[10px] text-gray-300 font-semibold uppercase">DC Server Room</span>
          </label>

          <button onClick={onGenerate} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-xs flex items-center justify-center gap-2">
            Initialize Auto Architect
          </button>
        </div>
      </div>

      {/* Outputs Panel */}
      <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6 text-left border border-gray-800">
        {results ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-850 pb-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Auto-Generated Low-Level Design (LLD)</h4>
              <div className="flex items-center gap-2 text-[10px] bg-indigo-950/40 text-indigo-300 border border-indigo-900 px-3 py-1 rounded-full font-mono">
                Wireless Planner: {results.ap_count} Cisco APs Suggested
              </div>
            </div>

            {/* VLAN Table */}
            <div className="overflow-x-auto border border-gray-800 rounded-xl">
              <table className="min-w-full divide-y divide-gray-800 text-left text-xs">
                <thead className="bg-gray-900/60 font-semibold text-gray-400 uppercase tracking-wider font-sans">
                  <tr>
                    <th className="px-4 py-3">VLAN</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Subnet</th>
                    <th className="px-4 py-3">Default Gateway</th>
                    <th className="px-4 py-3">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/85 bg-gray-950/10 font-mono text-gray-300">
                  {results.vlan_plans?.map((vp: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-800/10">
                      <td className="px-4 py-3 text-indigo-400 font-bold">VLAN {vp.vlan_id}</td>
                      <td className="px-4 py-3 font-semibold text-white">{vp.vlan_name}</td>
                      <td className="px-4 py-3">{vp.network}/{vp.cidr}</td>
                      <td className="px-4 py-3">{vp.gateway}</td>
                      <td className="px-4 py-3 font-sans text-gray-400 max-w-[200px] truncate" title={vp.desc}>{vp.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* HLD/LLD Docs tabs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">HLD (High-Level Design Document)</span>
                <pre className="text-[10px] text-gray-300 font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {results.docs?.hld}
                </pre>
              </div>
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">SOP Deployment Checklist</span>
                <pre className="text-[10px] text-gray-300 font-sans leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
                  {results.docs?.sop}
                </pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-gray-500 text-sm gap-2">
            <HelpCircle className="w-10 h-10 text-gray-700 animate-pulse" />
            Define enterprise scope and click 'Initialize Auto Architect' to generate full documentation models.
          </div>
        )}
      </div>
    </div>
  );
};
