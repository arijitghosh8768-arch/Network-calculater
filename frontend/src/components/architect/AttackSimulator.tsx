import React, { useState } from 'react';


export const AttackSimulator: React.FC = () => {
  const [selectedAttack, setSelectedAttack] = useState('STP');
  const [defended, setDefended] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);

  const runAttackSimulation = () => {
    setAnimating(true);
    setDefended(false);
    setSimulationLogs([`[Attack] Initializing ${selectedAttack} Attack on local access layer...`]);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step === 1) {
        if (selectedAttack === 'STP') {
          setSimulationLogs(prev => [...prev, "[STP] Attacker transmits rogue STP configuration BPDU with priority 0."]);
        } else if (selectedAttack === 'DHCP') {
          setSimulationLogs(prev => [...prev, "[DHCP] Rogue DHCP server spoofing IP pools and default gateway addresses."]);
        } else {
          setSimulationLogs(prev => [...prev, "[MAC] Flooding CAM table with 10,000+ random MAC addresses."]);
        }
      } else if (step === 2) {
        if (selectedAttack === 'STP') {
          setSimulationLogs(prev => [...prev, "[FAIL] SW-Access transitions root bridge ownership to Attacker port. Topology Loop created!"]);
        } else if (selectedAttack === 'DHCP') {
          setSimulationLogs(prev => [...prev, "[FAIL] Client PCs leased incorrect DNS servers. Redirecting client web sessions."]);
        } else {
          setSimulationLogs(prev => [...prev, "[FAIL] Switch CAM table full. Transitioning to Hub behavior (Flooding unicast packets)."]);
        }
        clearInterval(interval);
        setAnimating(false);
      }
    }, 1200);
  };

  const applyDefense = () => {
    setDefended(true);
    setSimulationLogs(prev => [
      ...prev,
      `[Defense] Deploying Cisco IOS Hardening commands...`,
      `[Defense] Security policy updated. Port configured to reject rogue packets.`
    ]);
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Vulnerability & Attack Simulator</h3>
        <p className="text-[11px] text-gray-400 mt-1">Deploy mock cyber security attacks against unhardened switches and observe Cisco IOS defenses.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left selector */}
        <div className="bg-gray-900/60 p-4 border border-gray-850 rounded-xl space-y-3">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Choose Attack Vector</span>
          <div className="space-y-2">
            {[
              { id: 'STP', name: 'STP Root Hijack Attack' },
              { id: 'DHCP', name: 'Rogue DHCP / Spoofing' },
              { id: 'MAC', name: 'MAC Flooding (CAM Overfill)' }
            ].map(att => (
              <button
                key={att.id}
                onClick={() => { setSelectedAttack(att.id); setSimulationLogs([]); setDefended(false); }}
                className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all ${
                  selectedAttack === att.id ? 'bg-rose-600/15 border border-rose-500/30 text-rose-400' : 'bg-gray-950 border border-transparent text-gray-400 hover:text-white'
                }`}
              >
                {att.name}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={runAttackSimulation} disabled={animating} className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-semibold py-2 rounded-xl text-xs">
              Simulate Attack
            </button>
            <button onClick={applyDefense} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 rounded-xl text-xs">
              Apply Defense
            </button>
          </div>
        </div>

        {/* Right visualization */}
        <div className="md:col-span-2 bg-gray-950/60 border border-gray-800 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
          {/* Logs */}
          <div className="font-mono text-[11px] space-y-1.5 overflow-y-auto max-h-40">
            {simulationLogs.length > 0 ? (
              simulationLogs.map((l, idx) => (
                <div key={idx} className={l.includes("[FAIL]") ? "text-red-400" : l.includes("[Defense]") ? "text-emerald-400" : "text-gray-300"}>
                  {l}
                </div>
              ))
            ) : (
              <div className="text-gray-600 text-center py-12">Click 'Simulate Attack' to view vulnerable state animations.</div>
            )}
          </div>

          {/* Defense commands */}
          {defended && (
            <div className="border-t border-gray-850 pt-3 mt-3">
              <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-1">Switch Defense Configuration (Cisco IOS)</span>
              <pre className="bg-black/95 p-3 rounded-lg border border-gray-850 font-mono text-[10px] text-green-400 overflow-x-auto">
                <code>
                  {selectedAttack === 'STP' && "interface FastEthernet0/1\n spanning-tree bpduguard enable\n spanning-tree portfast"}
                  {selectedAttack === 'DHCP' && "ip dhcp snooping\ninterface FastEthernet0/1\n ip dhcp snooping limit rate 15"}
                  {selectedAttack === 'MAC' && "interface FastEthernet0/1\n switchport port-security\n switchport port-security violation shutdown"}
                </code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
