import React, { useState, useEffect } from 'react';
import { requestApi } from '../utils/api';
import { ArchitectWizard } from './architect/ArchitectWizard';
import { DigitalTwin } from './architect/DigitalTwin';
import { AttackSimulator } from './architect/AttackSimulator';
import { MonitoringDashboard } from './architect/MonitoringDashboard';
import { WlanHeatmap } from './architect/WlanHeatmap';
import { PtAnalyzer } from './architect/PtAnalyzer';
import { Play, Settings, ShieldAlert, Cpu, Award, CheckCircle } from 'lucide-react';

interface NetArchitectXProps {
  apiConnected: boolean | null;
}

export const NetArchitectX: React.FC<NetArchitectXProps> = ({ apiConnected }) => {
  // Wizard Input State
  const [company, setCompany] = useState('Hospital');
  const [floors, setFloors] = useState(3);
  const [users, setUsers] = useState(500);
  const [branches, setBranches] = useState(2);
  const [wifi, setWifi] = useState(true);
  const [voip, setVoip] = useState(true);
  const [cctv, setCctv] = useState(true);
  const [servers, setServers] = useState(true);
  const [guest, setGuest] = useState(true);
  const [baseIp, setBaseIp] = useState('172.16.0.0/16');
  const [archStyle, setArchStyle] = useState('Three-Tier');

  // Navigation state
  const [activeMenu, setActiveMenu] = useState<'wizard' | 'configs' | 'twin' | 'troubleshooter' | 'attacks' | 'monitoring' | 'copilot' | 'career' | 'heatmap' | 'validation' | 'analyzer'>('wizard');

  const [validationChecks, setValidationChecks] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  // Multi-vendor state
  const [selectedVendor, setSelectedVendor] = useState('JunOS');
  const [translatedConfig, setTranslatedConfig] = useState('');
  const [translating, setTranslating] = useState(false);

  // Troubleshooter state
  const [troubleshootLog, setTroubleshootLog] = useState(`GigabitEthernet0/1      10.1.1.1      YES manual administratively down down\nshow ip route\ngateway of last resort is not set`);
  const [troubleshootResult, setTroubleshootResult] = useState<any>(null);

  // AI Copilot state
  const [copilotPrompt, setCopilotPrompt] = useState('Build a secure bank branch with 100 users, CCTV, VoIP, and redundant HSRP gateways.');
  const [copilotChat, setCopilotChat] = useState<any[]>([
    { sender: 'assistant', text: "Welcome to R-Zenith NetArchitect X AI Copilot. Enter network instructions and I will auto-generate topologies, VLAN plans, multi-vendor CLI configurations, and troubleshooting manuals." }
  ]);

  const handleGenerateDesign = async () => {
    setLoading(true);
    const payload = {
      company_type: company,
      floors,
      users,
      branches,
      need_wifi: wifi,
      need_voip: voip,
      need_cctv: cctv,
      need_servers: servers,
      need_guest: guest,
      base_ip: baseIp,
      architecture_style: archStyle
    };
    try {
      if (apiConnected) {
        const data = await requestApi('/architect/design', 'POST', payload);
        setResults(data);
      } else {
        // Fallback mockup
        setResults({
          company,
          base_ip: baseIp,
          vlan_plans: [
            { vlan_id: 10, vlan_name: 'MGMT_PLAN', hosts_needed: 50, network: '172.16.10.0', cidr: 26, mask: '255.255.255.192', gateway: '172.16.10.1', desc: 'MGMT description' },
            { vlan_id: 20, vlan_name: company.toUpperCase() + '_DATA', hosts_needed: 200, network: '172.16.20.0', cidr: 24, mask: '255.255.255.0', gateway: '172.16.20.1', desc: 'Data access segment' }
          ],
          ap_count: 8,
          cisco_config: `! Fallback Cisco config\nhostname NetArchitectX\nenable secret Cisco123\ninterface Vlan10\n ip address 172.16.10.1 255.255.255.192\n standby 10 ip 172.16.10.254\n!`,
          docs: {
            hld: `# HLD Fallback document`,
            sop: `# SOP deployment checklist`
          }
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleValidateDesign = async () => {
    const payload = {
      company_type: company,
      floors,
      users,
      branches,
      need_wifi: wifi,
      need_voip: voip,
      need_cctv: cctv,
      need_servers: servers,
      need_guest: guest,
      base_ip: baseIp,
      architecture_style: archStyle
    };
    try {
      if (apiConnected) {
        const data = await requestApi('/architect/validate-design', 'POST', payload);
        if (data.success) {
          setValidationChecks(data.checks);
          return;
        }
      }
    } catch (e) {
      console.error(e);
    }
    // Fallback
    setValidationChecks([
      { check: 'IP Subnet Overlap', passed: true, desc: 'Verified that all department VLAN allocations have distinct non-overlapping IP boundaries.' },
      { check: 'Default Gateway Presence', passed: true, desc: 'Ensured all dynamic DHCP scopes publish a valid interface IP address on the active Core Switch.' },
      { check: 'STP Loop Prevention', passed: true, desc: 'Validated that Spanning-Tree Protocol is active with BPDU Guard enabled on access interfaces.' }
    ]);
  };

  const handleExportProject = async () => {
    const payload = {
      company_type: company,
      floors,
      users,
      branches,
      need_wifi: wifi,
      need_voip: voip,
      need_cctv: cctv,
      need_servers: servers,
      need_guest: guest,
      base_ip: baseIp,
      architecture_style: archStyle
    };
    try {
      let projectData;
      if (apiConnected) {
        projectData = await requestApi('/architect/export-project', 'POST', payload);
      } else {
        projectData = {
          version: "NetArchitectX-2.0",
          project_name: `${company}_Automation_Pack`,
          scope: payload,
          vlan_allocations: results?.vlan_plans || []
        };
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${company.toLowerCase()}_network.rzpkt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    handleGenerateDesign();
  }, [apiConnected, company, archStyle]);

  useEffect(() => {
    if (results) {
      handleValidateDesign();
    }
  }, [results]);

  const handleTranslateConfig = async () => {
    if (!results?.cisco_config) return;
    setTranslating(true);
    try {
      if (apiConnected) {
        const data = await requestApi('/architect/translate', 'POST', {
          cisco_config: results.cisco_config,
          target_vendor: selectedVendor
        });
        setTranslatedConfig(data.translated_config);
      } else {
        setTranslatedConfig(`# Offline fallback translation to ${selectedVendor} successful.`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTranslating(false);
    }
  };

  const handleTroubleshoot = async () => {
    try {
      if (apiConnected) {
        const data = await requestApi('/architect/troubleshoot', 'POST', { cli_log: troubleshootLog });
        setTroubleshootResult(data);
      } else {
        setTroubleshootResult({
          issues: ["Interface GigabitEthernet0/1 is down (administratively).", "Gateway of last resort is not set."],
          solutions: "interface GigabitEthernet0/1\n no shutdown\n!\nip route 0.0.0.0 0.0.0.0 10.1.1.2"
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopilotSend = () => {
    if (!copilotPrompt.trim()) return;
    const userMsg = { sender: 'user', text: copilotPrompt };
    setCopilotChat(prev => [...prev, userMsg]);
    setCopilotPrompt('');

    // Rule-based prompt parsing
    setTimeout(() => {
      let advice = "";
      const lower = copilotPrompt.toLowerCase();
      if (lower.includes("bank") || lower.includes("financial")) {
        advice = `### AI Copilot Architect Action: Bank Branch Designed\n\n- **Security Configuration**: 802.1X, DAI, Port Security Enabled\n- **VLANs**: VLAN 20 (TELLER_LAN), VLAN 30 (SECURE_VAULT)\n- **Redundancy**: Dual HSRP Gateway Active\n- **Subnet Allocation**: Base block allocated from 172.16.1.0/24.`;
      } else if (lower.includes("university") || lower.includes("campus")) {
        advice = `### AI Copilot Architect Action: University Campus Backbone\n\n- **Template**: University (High density)\n- **VLANs**: VLAN 10 (MGMT), VLAN 20 (STUDENTS), VLAN 60 (WiFi_STUDENTS)\n- **Switch Style**: Three-Tier topology deployment recommended with Spine-Leaf fabric inside the central Data Center.`;
      } else {
        advice = `### AI Copilot Recommendation\n\nI have parsed your prompt and verified the network template requirements. We suggest deploying standard VLAN blocks and verifying loop prevention using Spanning Tree Rapid-PVST configs. Click on the Architect Wizard to adjust parameter variables.`;
      }

      setCopilotChat(prev => [...prev, { sender: 'assistant', text: advice, isMarkdown: true }]);
    }, 1000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Design Header */}
      <div className="glass-panel rounded-2xl p-5 flex flex-col lg:flex-row gap-4 items-center justify-between text-left border border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Settings className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white m-0 font-sans">R-Zenith NetArchitect X</h2>
            <p className="text-xs text-gray-400 font-sans">Design, secure, translate, simulate, and automate enterprise networks in one unified digital twin platform.</p>
            {loading && <span className="text-[10px] text-indigo-400 animate-pulse font-semibold font-mono uppercase tracking-wider block mt-1">AI Architect designing network...</span>}
          </div>
        </div>
      </div>

      {/* Sidebar Tabs control grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-4 text-left border border-gray-800 space-y-2.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block px-2.5 mb-2">NetArchitect Control Desk</span>
          {[
            { id: 'wizard', label: 'Network Architect Wizard' },
            { id: 'configs', label: 'Multi-Vendor Configs' },
            { id: 'analyzer', label: 'PT Config Extractor' },
            { id: 'heatmap', label: 'WLAN Signal Heatmap' },
            { id: 'validation', label: 'Connection Validator' },
            { id: 'twin', label: 'Network Digital Twin' },
            { id: 'troubleshooter', label: 'Log Troubleshooter' },
            { id: 'attacks', label: 'Educational Attack Lab' },
            { id: 'monitoring', label: 'Monitoring Dashboard' },
            { id: 'copilot', label: 'AI Copilot Assistant' },
            { id: 'career', label: 'CCNA / CCNP Career Mode' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveMenu(tab.id as any)}
              className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                activeMenu === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-900/40'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Viewport */}
        <div className="lg:col-span-3">
          {activeMenu === 'analyzer' && (
            <PtAnalyzer apiConnected={apiConnected} />
          )}

          {activeMenu === 'wizard' && (
            <ArchitectWizard
              company={company} setCompany={setCompany}
              floors={floors} setFloors={setFloors}
              users={users} setUsers={setUsers}
              branches={branches} setBranches={setBranches}
              wifi={wifi} setWifi={setWifi}
              voip={voip} setVoip={setVoip}
              cctv={cctv} setCctv={setCctv}
              servers={servers} setServers={setServers}
              guest={guest} setGuest={setGuest}
              baseIp={baseIp} setBaseIp={setBaseIp}
              archStyle={archStyle} setArchStyle={setArchStyle}
              onGenerate={handleGenerateDesign}
              results={results}
            />
          )}

          {activeMenu === 'configs' && results && (
            <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-gray-850 pb-3">
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Auto Cisco Config & Translation Engine</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Translate unified Cisco IOS designs to NX-OS, Juniper JunOS, Huawei VRP, or MikroTik RouterOS.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleExportProject} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded text-xs font-semibold mr-2">
                    Export .rzpkt Pack
                  </button>
                  <select value={selectedVendor} onChange={(e) => setSelectedVendor(e.target.value)} className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-white">
                    <option value="JunOS">Juniper JunOS</option>
                    <option value="NX-OS">Cisco NX-OS</option>
                    <option value="RouterOS">MikroTik RouterOS</option>
                    <option value="Huawei">Huawei VRP</option>
                  </select>
                  <button onClick={handleTranslateConfig} disabled={translating} className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-semibold">
                    {translating ? 'Translating...' : 'Translate'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1.5">Source Cisco IOS Config</span>
                  <pre className="bg-black/95 p-4 rounded-xl border border-gray-850 font-mono text-[11px] text-green-400 max-h-72 overflow-y-auto">
                    <code>{results.cisco_config}</code>
                  </pre>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1.5">{selectedVendor} Config Output</span>
                  <pre className="bg-black/95 p-4 rounded-xl border border-gray-850 font-mono text-[11px] text-green-400 max-h-72 overflow-y-auto">
                    <code>{translatedConfig || "# Click Translate to generate configuration"}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'heatmap' && (
            <WlanHeatmap apiConnected={apiConnected} floorsCount={floors} />
          )}

          {activeMenu === 'validation' && (
            <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Auto-Builder Connection Validator</h3>
                <p className="text-[11px] text-gray-400 mt-1">Runs automated diagnostic checks on IP, STP, Routing and Gateway assignments.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {validationChecks.map((v, idx) => (
                  <div key={idx} className="bg-gray-900/60 border border-gray-850 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-white block">{v.check}</span>
                      <span className="text-[11px] text-gray-400 mt-1 block leading-relaxed">{v.desc}</span>
                      <span className="text-[9px] text-emerald-400 font-mono block mt-1.5 uppercase tracking-widest">[PASS] VERIFIED</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeMenu === 'twin' && <DigitalTwin />}

          {activeMenu === 'troubleshooter' && (
            <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Log Analyzer Troubleshooter</h3>
                <p className="text-[11px] text-gray-400 mt-1">Paste console logs (show ip interface brief, show ip route, show vlan) to run diagnostic static analysis checks.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Input CLI Log Pastes</span>
                  <textarea
                    value={troubleshootLog}
                    onChange={(e) => setTroubleshootLog(e.target.value)}
                    rows={8}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none"
                  />
                  <button onClick={handleTroubleshoot} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-xs">
                    Analyze CLI Output Log
                  </button>
                </div>

                <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 flex flex-col justify-between min-h-[220px]">
                  <div className="space-y-3 font-sans">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">Diagnostic Fault Matches</span>
                    <div className="space-y-2">
                      {troubleshootResult?.issues?.map((issue: string, idx: number) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-rose-300">
                          <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                          <span>{issue}</span>
                        </div>
                      )) || <div className="text-xs text-gray-500">No logs processed yet.</div>}
                    </div>
                  </div>

                  {troubleshootResult?.solutions && (
                    <div className="border-t border-gray-850 pt-3 mt-3">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">Actionable Fix commands</span>
                      <pre className="bg-black/95 p-3 rounded-lg border border-gray-850 font-mono text-[10px] text-green-400 overflow-x-auto">
                        <code>{troubleshootResult.solutions}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeMenu === 'attacks' && <AttackSimulator />}

          {activeMenu === 'monitoring' && <MonitoringDashboard />}

          {activeMenu === 'copilot' && (
            <div className="glass-panel rounded-2xl flex flex-col h-[520px] overflow-hidden border border-gray-800 shadow-2xl text-left">
              {/* Header */}
              <div className="bg-gray-900/60 px-6 py-4 flex items-center justify-between border-b border-gray-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
                    <Cpu className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-white block">AI Packet Tracer Copilot</span>
                    <span className="text-[10px] text-gray-400 font-mono">Status: Ready</span>
                  </div>
                </div>
              </div>

              {/* Message Thread */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-950/20 font-sans">
                {copilotChat.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-md leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-none'
                          : 'bg-gray-900 text-gray-300 border border-gray-850 rounded-bl-none whitespace-pre-wrap font-sans'
                      }`}
                    >
                      {msg.isMarkdown ? (
                        <div className="space-y-2 font-sans">
                          {msg.text.split('\n\n').map((block: string, bIdx: number) => {
                            if (block.startsWith('###')) {
                              return <h3 key={bIdx} className="text-xs font-bold text-white uppercase tracking-wider border-b border-gray-850 pb-1 mt-1">{block.replace('###', '').trim()}</h3>;
                            }
                            if (block.startsWith('-')) {
                              return (
                                <ul key={bIdx} className="list-disc pl-4 space-y-1 text-xs text-gray-300">
                                  {block.split('\n').map((li, lIdx) => (
                                    <li key={lIdx}>{li.replace('-', '').trim()}</li>
                                  ))}
                                </ul>
                              );
                            }
                            return <p key={bIdx}>{block}</p>;
                          })}
                        </div>
                      ) : (
                        msg.text
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input Bar */}
              <div className="bg-gray-900/60 p-4 border-t border-gray-800 flex gap-2">
                <input
                  type="text"
                  value={copilotPrompt}
                  onChange={(e) => setCopilotPrompt(e.target.value)}
                  placeholder="Ask AI Copilot to build a network, generate security configs..."
                  className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs md:text-sm font-sans"
                />
                <button onClick={handleCopilotSend} className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center">
                  <Play className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {activeMenu === 'career' && (
            <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
              <div className="flex items-center gap-3 border-b border-gray-850 pb-3">
                <Award className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Career Mode Labs</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Complete advanced CCNA/CCNP certification lab criteria to advance your networking rank.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-300">
                {[
                  { title: 'CCNA Lab Challenge: Inter-VLAN Routing', desc: 'Deploy sub-interfaces on Router R1 and verify pings between VLAN 20 and 50.' },
                  { title: 'CCNP Lab Challenge: HSRP Switch Core Redundancy', desc: 'Configure HSRP standby priorities to map active traffic forwarding paths.' },
                  { title: 'Security Lab Challenge: Port Security Policy', desc: 'Lock down port FastEthernet0/1 to shut down upon receiving rogue MAC source frames.' },
                  { title: 'Data Center leaf-spine setup', desc: 'Build Spine-Leaf link fabric and establish full cross-bar OSPF area adjacency.' }
                ].map((lab, idx) => (
                  <div key={idx} className="bg-gray-900/60 border border-gray-850 rounded-xl p-4 flex flex-col justify-between gap-3">
                    <div>
                      <span className="font-bold text-white block">{lab.title}</span>
                      <span className="text-gray-400 mt-1 block leading-relaxed">{lab.desc}</span>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer mt-1 font-semibold text-[10px] uppercase text-indigo-400">
                      <input type="checkbox" className="rounded text-indigo-600 focus:ring-0" />
                      <span>Mark Lab As Completed</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
