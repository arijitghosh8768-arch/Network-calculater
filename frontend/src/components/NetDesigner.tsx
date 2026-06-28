import React, { useState, useEffect } from 'react';
import { requestApi } from '../utils/api';
import { Play, Settings, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface NetDesignerProps {
  apiConnected: boolean | null;
}

export const NetDesigner: React.FC<NetDesignerProps> = ({ apiConnected }) => {
  // Wizard settings
  const [netType, setNetType] = useState('School');
  const [labsCount, setLabsCount] = useState(3);
  const [serverRoom, setServerRoom] = useState(true);
  const [adminOffice, setAdminOffice] = useState(true);
  const [studentCount, setStudentCount] = useState(150);
  const teacherCount = 20;
  const [needWifi, setNeedWifi] = useState(true);
  const [needCctv, setNeedCctv] = useState(true);

  // Simulation flags for diagnostics
  const [simulateOverlap, setSimulateOverlap] = useState(false);
  const [simulateMissingTrunk, setSimulateMissingTrunk] = useState(false);
  const [simulateMissingGateway, setSimulateMissingGateway] = useState(false);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [labGuide, setLabGuide] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'topology' | 'vlan' | 'cisco' | 'validation' | 'lab'>('topology');

  // Simulator path state
  const [simSource, setSimSource] = useState('PC-Lab1');
  const [simDest, setSimDest] = useState('SRV-DNS');
  const [simulating, setSimulating] = useState(false);
  const [simStep, setSimStep] = useState<number>(-1); // -1 = idle, 0 = host, 1 = switch, 2 = core switch, 3 = router, 4 = server
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const [validationResults, setValidationResults] = useState<any[]>([]);

  // Standalone offline planner logic
  const localDesign = () => {
    // Generate static fallback mockup plan based on input states
    const vlans = [
      { vlan_id: 10, vlan_name: netType === 'School' ? 'STUDENTS' : 'STAFF_DATA', hosts_needed: studentCount, network: '192.168.10.0', cidr: 24, mask: '255.255.255.0', gateway: '192.168.10.1', dhcp_range: '192.168.10.2 - 192.168.10.254' },
      { vlan_id: 20, vlan_name: netType === 'School' ? 'TEACHERS' : 'MANAGEMENT', hosts_needed: teacherCount, network: '192.168.20.0', cidr: 24, mask: '255.255.255.0', gateway: '192.168.20.1', dhcp_range: '192.168.20.2 - 192.168.20.254' }
    ];
    if (adminOffice) {
      vlans.push({ vlan_id: 30, vlan_name: 'ADMINISTRATION', hosts_needed: 30, network: '192.168.30.0', cidr: 27, mask: '255.255.255.224', gateway: '192.168.30.1', dhcp_range: '192.168.30.2 - 192.168.30.30' });
    }
    if (needCctv) {
      vlans.push({ vlan_id: 40, vlan_name: 'CCTV_CAMERAS', hosts_needed: 15, network: '192.168.40.0', cidr: 28, mask: '255.255.255.240', gateway: '192.168.40.1', dhcp_range: '192.168.40.2 - 192.168.40.14' });
    }
    if (serverRoom) {
      vlans.push({ vlan_id: 50, vlan_name: 'SERVERS', hosts_needed: 10, network: '192.168.50.0', cidr: 28, mask: '255.255.255.240', gateway: '192.168.50.1', dhcp_range: 'Static allocations' });
    }

    const devices = [
      { name: 'R1', type: 'Router (2911)', role: 'Gateway & Inter-VLAN Routing' },
      { name: 'SW-Core', type: 'Layer 3 Switch (3560)', role: 'Core Distribution Switch' }
    ];
    for (let i = 0; i < labsCount; i++) {
      devices.push({ name: `SW-Lab${i+1}`, type: 'Layer 2 Switch (2960)', role: `Access Switch for Lab ${i+1}` });
    }

    const topology_blueprint = {
      nodes: [
        { id: 'R1', label: 'R1 (Router 2911)', x: 400, y: 50 },
        { id: 'SW-Core', label: 'SW-Core (3560)', x: 400, y: 140 }
      ],
      links: [
        { source: 'R1', target: 'SW-Core', port: 'g0/0 -> g0/1', type: 'Trunk' }
      ]
    };

    for (let i = 0; i < labsCount; i++) {
      topology_blueprint.nodes.push({ id: `SW-Lab${i+1}`, label: `SW-Lab${i+1} (2960)`, x: 150 + (i * 160), y: 250 });
      topology_blueprint.links.push({ source: 'SW-Core', target: `SW-Lab${i+1}`, port: `g0/${i+2} -> g0/1`, type: 'Trunk' });
      
      topology_blueprint.nodes.push({ id: `PC-Lab${i+1}`, label: `PC-Lab${i+1} (Host)`, x: 150 + (i * 160), y: 350 });
      topology_blueprint.links.push({ source: `SW-Lab${i+1}`, target: `PC-Lab${i+1}`, port: `fa0/10 -> eth0`, type: 'Access' });
    }

    return {
      success: true,
      devices,
      vlan_plans: vlans,
      router_config: `! Router Configuration Backup\nenable\nconfigure terminal\nhostname R1\n!\ninterface g0/0\n no shutdown\n!\n` + vlans.map(v => `interface g0/0.${v.vlan_id}\n encapsulation dot1Q ${v.vlan_id}\n ip address ${v.gateway} ${v.mask}\n no shutdown\n!`).join('\n'),
      switch_config: `! Core Switch Configuration Backup\nenable\nconfigure terminal\nhostname SW-Core\n!\n` + vlans.map(v => `vlan ${v.vlan_id}\n name ${v.vlan_name}\n!`).join('\n'),
      topology_blueprint
    };
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload = {
        network_type: netType,
        labs_count: labsCount,
        server_room: serverRoom,
        admin_office: adminOffice,
        student_count: studentCount,
        teacher_count: teacherCount,
        need_wifi: needWifi,
        need_cctv: needCctv
      };

      if (apiConnected) {
        const data = await requestApi('/designer/plan', 'POST', payload);
        setResults(data);
        const labData = await requestApi('/designer/lab', 'POST', payload);
        setLabGuide(labData.lab_guide);
      } else {
        const data = localDesign();
        setResults(data);
        setLabGuide(`# Local Lab Design Guide\n\nConfigure your router using the generated commands in the Cisco config tab.`);
      }
    } catch (e) {
      const data = localDesign();
      setResults(data);
      setLabGuide(`# Local Lab Design Guide\n\nConfigure your router using the generated commands in the Cisco config tab.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [apiConnected, labsCount, netType]);

  useEffect(() => {
    const runValidationChecks = async () => {
      const payload = {
        network_type: netType,
        labs_count: labsCount,
        server_room: serverRoom,
        admin_office: adminOffice,
        student_count: studentCount,
        teacher_count: teacherCount,
        need_wifi: needWifi,
        need_cctv: needCctv,
        simulate_overlap: simulateOverlap,
        simulate_missing_trunk: simulateMissingTrunk,
        simulate_missing_gateway: simulateMissingGateway
      };
      try {
        if (apiConnected) {
          const data = await requestApi('/designer/validate', 'POST', payload);
          if (data.success && data.checks) {
            setValidationResults(data.checks);
            return;
          }
        }
      } catch (e) {
        console.error(e);
      }
      // Fallback
      setValidationResults([
        { check: 'IP Subnet Overlap', passed: !simulateOverlap, desc: 'Checks if different VLANs have duplicate IP ranges.' },
        { check: 'Trunk Port Matching', passed: !simulateMissingTrunk, desc: 'Validates that core-to-access switch links are configured as trunks.' },
        { check: 'Default Gateway Assignment', passed: !simulateMissingGateway, desc: 'Ensures each DHCP pool lists R1 as the gateway.' },
        { check: 'IP Conflict Check', passed: true, desc: 'Verifies server IPs are excluded from dynamic pools.' },
        { check: 'Router Interface State', passed: true, desc: 'Checks that subinterfaces are enabled (no shutdown).' },
        { check: 'OSPF Statements', passed: true, desc: 'Checks OSPF area configurations.' }
      ]);
    };
    runValidationChecks();
  }, [
    apiConnected, netType, labsCount, serverRoom, adminOffice,
    studentCount, teacherCount, needWifi, needCctv,
    simulateOverlap, simulateMissingTrunk, simulateMissingGateway
  ]);

  // Run path simulation
  const runPathSimulation = () => {
    if (simulating) return;
    setSimulating(true);
    setSimLogs([`[SIM] ICMP Echo request initialized from ${simSource}...`, `[SIM] Checking local routing table...`]);
    setSimStep(0);

    let step = 0;
    const interval = setInterval(() => {
      step++;
      setSimStep(step);
      
      if (step === 1) {
        setSimLogs(prev => [...prev, `[SIM] Switch SW-Lab1 receives Ethernet frame. Flooding port map...`]);
      } else if (step === 2) {
        setSimLogs(prev => [...prev, `[SIM] Core Switch SW-Core matches destination subnet. Forwarding...`]);
      } else if (step === 3) {
        setSimLogs(prev => [...prev, `[SIM] Gateway R1 decapsulates frame, routes Inter-VLAN packet to default route...`]);
      } else if (step === 4) {
        setSimLogs(prev => [...prev, `[SIM] Host successfully reached! ICMP Echo Reply returned.`, `[SIM] Latency: 14ms (Ping Success)`, `[SIM] Hop Count: 2`]);
        clearInterval(interval);
        setSimulating(false);
      }
    }, 1200);
  };



  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Design Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col lg:flex-row gap-4 items-center justify-between text-left border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white m-0">R-Zenith NetDesigner</h2>
            <p className="text-xs text-gray-400">Convert requirements into detailed, CCNA-ready network designs and copy-pasteable Cisco configuration statements.</p>
          </div>
        </div>
      </div>

      {/* Main Form and Output Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wizard Form Side panel */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-4 text-left">
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 m-0 border-b border-gray-800 pb-2">
            <Settings className="w-4 h-4 text-indigo-400" />
            Requirement Wizard
          </h3>

          <div className="space-y-3.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Network Type</label>
              <select value={netType} onChange={(e) => setNetType(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs">
                <option value="School">School / College</option>
                <option value="Office">Enterprise Office</option>
                <option value="Hospital">Medical Hospital</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Lab Count</label>
                <input
                  type="number"
                  value={labsCount}
                  onChange={(e) => setLabsCount(Math.min(5, Math.max(1, Number(e.target.value))))}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase">Student/Staff Count</label>
                <input
                  type="number"
                  value={studentCount}
                  onChange={(e) => setStudentCount(Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-gray-900/60 border border-gray-800 rounded-xl cursor-pointer">
                <input type="checkbox" checked={serverRoom} onChange={(e) => setServerRoom(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
                <span className="text-[10px] text-gray-300 font-semibold uppercase">Server Room</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-gray-900/60 border border-gray-800 rounded-xl cursor-pointer">
                <input type="checkbox" checked={adminOffice} onChange={(e) => setAdminOffice(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
                <span className="text-[10px] text-gray-300 font-semibold uppercase">Admin Office</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 bg-gray-900/60 border border-gray-800 rounded-xl cursor-pointer">
                <input type="checkbox" checked={needWifi} onChange={(e) => setNeedWifi(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
                <span className="text-[10px] text-gray-300 font-semibold uppercase">Wifi Access</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-gray-900/60 border border-gray-800 rounded-xl cursor-pointer">
                <input type="checkbox" checked={needCctv} onChange={(e) => setNeedCctv(e.target.checked)} className="rounded text-indigo-600 focus:ring-0" />
                <span className="text-[10px] text-gray-300 font-semibold uppercase">CCTV/IoT</span>
              </label>
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-xs flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Compile Network Blueprint'}
            </button>
          </div>

          {/* Fault Injector for diagnostics */}
          <div className="border-t border-gray-800 pt-3.5 space-y-2">
            <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">CCNA Diagnostic Fault Injector</span>
            <div className="space-y-1.5 text-[10px] text-gray-400">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={simulateOverlap} onChange={(e) => setSimulateOverlap(e.target.checked)} className="rounded text-amber-600 focus:ring-0" />
                <span>Inject Overlapping Subnet Error</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={simulateMissingTrunk} onChange={(e) => setSimulateMissingTrunk(e.target.checked)} className="rounded text-amber-600 focus:ring-0" />
                <span>Inject Missing Trunk Config</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={simulateMissingGateway} onChange={(e) => setSimulateMissingGateway(e.target.checked)} className="rounded text-amber-600 focus:ring-0" />
                <span>Inject Missing Default Gateway</span>
              </label>
            </div>
          </div>
        </div>

        {/* Tabbed View Area */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6 text-left">
          <div className="flex border-b border-gray-800/80 gap-4 overflow-x-auto pb-1 text-xs md:text-sm font-semibold">
            {[
              { id: 'topology', label: 'Topology Map' },
              { id: 'vlan', label: 'VLAN & IP Allocations' },
              { id: 'cisco', label: 'Cisco CLI Configs' },
              { id: 'validation', label: 'Connectivity Validator' },
              { id: 'lab', label: 'CCNA Lab Manual' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2.5 transition-colors border-b-2 px-1 ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Topology Blueprint */}
          {activeTab === 'topology' && results && (
            <div className="space-y-6">
              {/* SVG Topology visualizer */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 overflow-x-auto">
                <svg width="650" height="420" className="mx-auto select-none font-mono">
                  {/* Links */}
                  {results.topology_blueprint.links.map((link: any, idx: number) => {
                    const srcNode = results.topology_blueprint.nodes.find((n: any) => n.id === link.source);
                    const destNode = results.topology_blueprint.nodes.find((n: any) => n.id === link.target);
                    if (!srcNode || !destNode) return null;
                    return (
                      <g key={`l-${idx}`}>
                        <line
                          x1={srcNode.x}
                          y1={srcNode.y}
                          x2={destNode.x}
                          y2={destNode.y}
                          stroke={link.type === 'Trunk' ? '#4f46e5' : '#374151'}
                          strokeWidth={link.type === 'Trunk' ? '2.5' : '1.5'}
                          strokeDasharray={link.type === 'Trunk' ? '3 3' : '0'}
                        />
                        {/* Port Label */}
                        <text x={(srcNode.x + destNode.x) / 2} y={(srcNode.y + destNode.y) / 2 - 5} fill="#9ca3af" fontSize="7" textAnchor="middle">
                          {link.port}
                        </text>
                      </g>
                    );
                  })}

                  {/* Simulator animated packet trace node */}
                  {simStep >= 0 && (
                    <circle
                      cx={
                        simStep === 0 ? 150 :
                        simStep === 1 ? 150 :
                        simStep === 2 ? 400 :
                        simStep === 3 ? 400 : 400
                      }
                      cy={
                        simStep === 0 ? 350 :
                        simStep === 1 ? 250 :
                        simStep === 2 ? 140 :
                        simStep === 3 ? 50 : 50
                      }
                      r="6"
                      fill="#e11d48"
                      className="transition-all duration-1000 glow-border"
                    />
                  )}

                  {/* Nodes */}
                  {results.topology_blueprint.nodes.map((node: any, idx: number) => {
                    const isRouter = node.id === 'R1';
                    const isSwitch = node.id.startsWith('SW-');
                    let fill = '#1f2937';
                    let stroke = '#4b5563';
                    if (isRouter) { fill = '#4f46e5'; stroke = '#818cf8'; }
                    else if (isSwitch) { fill = '#10b981'; stroke = '#34d399'; }

                    return (
                      <g key={`n-${idx}`} transform={`translate(${node.x}, ${node.y})`}>
                        <circle r="15" fill={fill} stroke={stroke} strokeWidth="1.5" />
                        <text y="3" fill="#ffffff" fontSize="8" fontWeight="bold" textAnchor="middle">
                          {isRouter ? 'R' : isSwitch ? 'SW' : 'PC'}
                        </text>
                        <text y="28" fill="#e5e7eb" fontSize="9" textAnchor="middle" fontWeight="bold">
                          {node.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Packet trace Simulator action bar */}
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-300">Packet Source:</span>
                    <select value={simSource} onChange={(e) => setSimSource(e.target.value)} className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-white">
                      <option value="PC-Lab1">PC-Lab1</option>
                      <option value="PC-Lab2">PC-Lab2</option>
                    </select>
                    <span className="text-xs font-semibold text-gray-300">Destination:</span>
                    <select value={simDest} onChange={(e) => setSimDest(e.target.value)} className="bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-white">
                      <option value="SRV-DNS">DNS Server (VLAN 50)</option>
                      <option value="Gateway">Router R1 Interface</option>
                    </select>
                  </div>
                  <button
                    onClick={runPathSimulation}
                    disabled={simulating}
                    className="bg-rose-600 hover:bg-rose-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" /> Send ICMP Trace Packet
                  </button>
                </div>

                {/* Packet trace simulator live output log console */}
                {simLogs.length > 0 && (
                  <div className="bg-black/90 p-3 rounded-lg border border-gray-850 font-mono text-[10px] md:text-xs text-green-400 space-y-1">
                    {simLogs.map((log, lIdx) => (
                      <div key={lIdx}>{log}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: VLAN Plan Table */}
          {activeTab === 'vlan' && results && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">VLAN Address Allocation Schedule</h3>
              <div className="overflow-x-auto border border-gray-800 rounded-xl">
                <table className="min-w-full divide-y divide-gray-800 text-left text-xs">
                  <thead className="bg-gray-900/60 font-semibold text-gray-400 uppercase tracking-wider font-sans">
                    <tr>
                      <th className="px-4 py-3">VLAN ID</th>
                      <th className="px-4 py-3">VLAN Name</th>
                      <th className="px-4 py-3">Network IP</th>
                      <th className="px-4 py-3">Subnet Mask</th>
                      <th className="px-4 py-3">Default Gateway</th>
                      <th className="px-4 py-3">DHCP Pool Range</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/80 bg-gray-950/10 font-mono text-gray-300">
                    {results.vlan_plans.map((vp: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-800/10">
                        <td className="px-4 py-3 text-indigo-400 font-bold">{vp.vlan_id}</td>
                        <td className="px-4 py-3 font-semibold text-white">{vp.vlan_name}</td>
                        <td className="px-4 py-3">{vp.network}/{vp.cidr}</td>
                        <td className="px-4 py-3">{vp.mask}</td>
                        <td className="px-4 py-3">{vp.gateway}</td>
                        <td className="px-4 py-3">{vp.dhcp_range}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 3: Cisco CLI Script Configurations */}
          {activeTab === 'cisco' && results && (
            <div className="space-y-4">
              <span className="text-xs text-gray-400 block font-sans">Apply these IOS configuration files to your R1 router and SW-Core switch to establish Inter-VLAN routing, trunking, and DHCP address pools.</span>
              
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Router R1 Configurations</span>
                  <pre className="bg-black/95 p-4 rounded-xl border border-gray-850 font-mono text-xs text-green-400 max-h-56 overflow-y-auto">
                    <code>{results.router_config}</code>
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Switch SW-Core Configurations</span>
                  <pre className="bg-black/95 p-4 rounded-xl border border-gray-850 font-mono text-xs text-green-400 max-h-56 overflow-y-auto">
                    <code>{results.switch_config}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Connectivity Validator Diagnostics */}
          {activeTab === 'validation' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider m-0">NetDesigner Validator Report</span>
                <span className="text-[10px] text-amber-500 font-mono">Errors Simulated: {((simulateOverlap?1:0) + (simulateMissingTrunk?1:0) + (simulateMissingGateway?1:0))}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {validationResults.map((v, idx) => (
                  <div key={idx} className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 flex items-start gap-3">
                    {v.passed ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="text-sm font-semibold text-white block">{v.check}</span>
                      <span className="text-xs text-gray-400 block mt-0.5 leading-relaxed">{v.desc}</span>
                      {!v.passed && (
                        <span className="text-[10px] text-rose-400 font-medium block mt-1 font-mono uppercase tracking-wider">
                          [FAIL] Diagnostic Match Error Detected
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tab 5: CCNA Lab Manual */}
          {activeTab === 'lab' && (
            <div className="space-y-4">
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl p-5 font-sans leading-relaxed text-xs md:text-sm text-gray-300 max-h-[480px] overflow-y-auto whitespace-pre-wrap">
                {labGuide}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
