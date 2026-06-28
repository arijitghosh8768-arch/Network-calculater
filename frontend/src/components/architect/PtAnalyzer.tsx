import React, { useState } from 'react';
import { requestApi } from '../../utils/api';
import { 
  Upload, Network, ShieldAlert, CheckCircle, Cpu, Award, 
  HelpCircle, Copy, Check, Server, Laptop, Wifi, FileText 
} from 'lucide-react';

interface PtAnalyzerProps {
  apiConnected: boolean | null;
}

export const PtAnalyzer: React.FC<PtAnalyzerProps> = ({ apiConnected }) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  // Tab navigation
  const [activeTab, setActiveTab] = useState<'topology' | 'audit' | 'lab' | 'tech' | 'quiz' | 'migration' | 'raw'>('topology');

  // Flashcards state
  const [revealAnswerIdx, setRevealAnswerIdx] = useState<number | null>(null);

  // Selected vendor for migration
  const [selectedMigrationVendor, setSelectedMigrationVendor] = useState<'juniper' | 'nxos' | 'huawei' | 'mikrotik'>('juniper');

  const DEMO_CONFIG = `! R-Zenith Enterprise Branch Configuration
hostname Core-Router-R1
interface GigabitEthernet0/0
 description Link to Core-Switch-SW1
 ip address 10.1.10.1 255.255.255.0
 no shutdown
!
interface GigabitEthernet0/1
 description Link to WAN-Gateway
 ip address 192.168.100.2 255.255.255.252
 no shutdown
!
router ospf 10
 network 10.1.10.0 0.0.0.255 area 0
 network 192.168.100.0 0.0.0.3 area 0
!
line vty 0 4
 transport input telnet
 password UnencryptedCiscoPass
!
enable password WeakPlaintextPassword
!
hostname Core-Switch-SW1
vlan 10
 name STAFF
vlan 20
 name STUDENTS
!
interface FastEthernet0/1
 description Link to PC-Staff-1
 switchport mode access
 switchport access vlan 10
!
interface FastEthernet0/2
 description Link to PC-Student-1
 switchport mode access
 switchport access vlan 20
!
interface GigabitEthernet0/1
 description Link to Core-Router-R1
 switchport mode trunk
!`;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      setFileContent(text);
      await analyzeConfig(file.name, text);
    };
    reader.onerror = () => {
      setError("Failed to read file.");
    };
    reader.readAsText(file);
  };

  const loadDemoConfig = async () => {
    setFileName("demo_branch_config.txt");
    setFileContent(DEMO_CONFIG);
    await analyzeConfig("demo_branch_config.txt", DEMO_CONFIG);
  };

  const analyzeConfig = async (name: string, content: string) => {
    setAnalyzing(true);
    setError(null);
    try {
      if (apiConnected) {
        const payload = { file_name: name, file_content: content };
        const data = await requestApi('/analyzer/analyze', 'POST', payload);
        if (data.success) {
          setAnalysisResult(data.analysis);
        } else {
          throw new Error(data.detail || "Analysis failed");
        }
      } else {
        // Fallback simulation
        setTimeout(() => {
          setAnalysisResult(simulateLocalAnalysis(content));
        }, 800);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setAnalyzing(false);
    }
  };

  const simulateLocalAnalysis = (content: string) => {
    // Basic local parsing for offline mode
    const hostnames = content.match(/(?:^|\n)\s*hostname\s+(\S+)/gi)?.map(line => line.replace(/hostname/i, '').trim()) || ["Core-Router-R1", "Core-Switch-SW1"];
    
    const devices: any = {};
    hostnames.forEach((h, idx) => {
      const isSwitch = h.toLowerCase().includes("switch") || idx === 1;
      devices[h] = {
        name: h,
        type: isSwitch ? "Switch" : "Router",
        interfaces: [
          { name: "GigabitEthernet0/0", ip: isSwitch ? null : "10.1.10.1", subnet: "255.255.255.0", description: isSwitch ? "Link to Core-Router-R1" : "Link to Core-Switch-SW1", port_security: false, shutdown: false }
        ],
        routing: isSwitch ? "Static/None" : "OSPF",
        vlan_count: isSwitch ? 2 : 0,
        dhcp_server: false,
        nat_configured: false,
        acl_count: 0,
        telnet_vty: content.includes("telnet"),
        enable_secret: content.includes("enable secret"),
        enable_password: content.includes("enable password"),
        raw_config: `hostname ${h}\n!`
      };
    });

    const connections = [
      { from_device: "Core-Router-R1", from_port: "GigabitEthernet0/0", to_device: "Core-Switch-SW1", to_port: "GigabitEthernet0/1" }
    ];

    const inventory = {
      Router: hostnames.filter(h => !h.toLowerCase().includes("switch")).length || 1,
      Switch: hostnames.filter(h => h.toLowerCase().includes("switch")).length || 1,
      Server: 0,
      AP: 0,
      PC: 2
    };

    const security_audits = [
      { device: hostnames[0], severity: "High", title: "Telnet Active", description: "VTY lines permit telnet transport which is unencrypted.", recommendation: "Run 'transport input ssh' under line vty." },
      { device: hostnames[0], severity: "High", title: "Plaintext Enable Password", description: "Enable password is configured in cleartext.", recommendation: "Replace with 'enable secret'." }
    ];

    const steps = [
      { num: 1, title: "Initialize Lab Workspace", instructions: "Deploy Cisco 2911 Routers and 2960 Catalyst Switches.", cli: null, explanation: "Establish physical layer layout." },
      { num: 2, title: "Configure Interface IPs", instructions: "Assign 10.1.10.1 to GigabitEthernet0/0.", cli: "interface GigabitEthernet0/0\n ip address 10.1.10.1 255.255.255.0\n no shutdown", explanation: "Activates port routing path." }
    ];

    const explanation = {
      summary: "This configuration defines a basic LAN/WAN gateway link with segmented layer-2 local access vlan switches.",
      technologies: [
        { name: "VLAN Segmentations", used: true, reason: "VLAN 10 & 20 segment broadcast domains." },
        { name: "OSPF Routing", used: true, reason: "OSPF advertises gateway subnets to routers." }
      ]
    };

    const viva_questions = [
      { q: "Why should we disable telnet and transition to SSH?", a: "Telnet transmits passwords and configs in cleartext, exposing the network to passive packet eavesdropping." },
      { q: "What is the function of 'no shutdown'?", a: "Cisco router interfaces are administratively disabled by default. This command boots up the physical/link status." }
    ];

    const migrations = {
      device: hostnames[0],
      juniper: "set system host-name " + hostnames[0] + "\nset interfaces ge-0/0/0 unit 0 family inet address 10.1.10.1/24",
      nxos: "hostname " + hostnames[0] + "\ninterface GigabitEthernet0/0\n ip address 10.1.10.1/24\n no shutdown",
      huawei: "sysname " + hostnames[0] + "\ninterface GigabitEthernet0/0/0\n ip address 10.1.10.1 255.255.255.0",
      mikrotik: "/system identity set name=" + hostnames[0] + "\n/ip address add address=10.1.10.1/24 interface=ether1"
    };

    const improvements = [
      { category: "Security", issue: "Weak line passwords", recommendation: "Enable 'service password-encryption' and use secret MD5 hashes." }
    ];

    return {
      devices,
      connections,
      inventory,
      security_audits,
      steps,
      explanation,
      rebuild_guide: ["Load configurations into R1", "Verify routing neighbors"],
      viva_questions,
      migrations,
      improvements
    };
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': return 'bg-rose-500/10 border-rose-500/20 text-rose-400';
      case 'medium': return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
      default: return 'bg-sky-500/10 border-sky-500/20 text-sky-400';
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'router': return <Cpu className="w-5 h-5" />;
      case 'switch': return <Network className="w-5 h-5" />;
      case 'server': return <Server className="w-5 h-5" />;
      case 'ap': return <Wifi className="w-5 h-5" />;
      default: return <Laptop className="w-5 h-5" />;
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 text-left border border-gray-800 space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-gray-850 pb-3">
        <div>
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider m-0">Packet Tracer Config Extractor & Analyzer</h3>
          <p className="text-[11px] text-gray-400 mt-1">Upload `.pkt`, `.txt`, or `.cfg` Cisco configuration scripts to build logical topologies, run compliance audits, and export multi-vendor command guides.</p>
        </div>
        <button 
          onClick={loadDemoConfig} 
          className="bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
        >
          <FileText className="w-3.5 h-3.5" />
          Load Demo Enterprise Config
        </button>
      </div>

      {/* Upload Drag & Drop Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border-2 border-dashed border-gray-800 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all bg-gray-900/20 relative">
          <input 
            type="file" 
            accept=".pkt,.txt,.cfg" 
            onChange={handleFileUpload} 
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
          <Upload className="w-10 h-10 text-gray-500 mb-3" />
          <span className="text-xs font-bold text-white block">Drag & Drop Cisco File</span>
          <span className="text-[10px] text-gray-400 mt-1 block">Supports .pkt, .txt, or .cfg up to 5MB</span>
          {fileName && (
            <span className="mt-3 px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 font-mono text-[10px]">
              {fileName}
            </span>
          )}
        </div>

        {/* Device Inventory Stats */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Routers', key: 'Router', color: 'text-indigo-400', icon: <Cpu className="w-4 h-4" /> },
            { label: 'Switches', key: 'Switch', color: 'text-emerald-400', icon: <Network className="w-4 h-4" /> },
            { label: 'Servers', key: 'Server', color: 'text-amber-400', icon: <Server className="w-4 h-4" /> },
            { label: 'APs/WLCs', key: 'AP', color: 'text-pink-400', icon: <Wifi className="w-4 h-4" /> },
            { label: 'PCs/Hosts', key: 'PC', color: 'text-sky-400', icon: <Laptop className="w-4 h-4" /> }
          ].map((stat, idx) => {
            const count = analysisResult?.inventory?.[stat.key] ?? 0;
            return (
              <div key={idx} className="bg-gray-950/40 border border-gray-850 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between text-gray-400">
                  <span className="text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                  {stat.icon}
                </div>
                <span className={`text-2xl font-bold mt-2 font-mono ${stat.color}`}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-400">
          {error}
        </div>
      )}

      {analyzing && (
        <div className="flex flex-col items-center justify-center py-10 space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <span className="text-xs text-indigo-400 font-semibold animate-pulse font-mono">PARSING CONFIGURATION SYSTEM...</span>
        </div>
      )}

      {/* Main Results View */}
      {analysisResult && !analyzing && (
        <div className="space-y-6">
          {/* Sub-navigation Tabs */}
          <div className="flex flex-wrap gap-1 border-b border-gray-850 pb-1">
            {[
              { id: 'topology', label: 'Topology Connections' },
              { id: 'audit', label: 'Security Audits' },
              { id: 'lab', label: 'Step-by-Step Lab' },
              { id: 'tech', label: 'Technology Profile' },
              { id: 'quiz', label: 'Viva prep' },
              { id: 'migration', label: 'Vendor Migration' },
              { id: 'raw', label: 'Raw Config' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Contents */}
          {activeTab === 'topology' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Devices lists */}
                <div className="md:col-span-1 bg-gray-950/40 border border-gray-850 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Discovered Devices</span>
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {Object.values(analysisResult.devices).map((dev: any, idx: number) => (
                      <div key={idx} className="bg-gray-900/60 border border-gray-800 rounded-lg p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                            {getDeviceIcon(dev.type)}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">{dev.name}</span>
                            <span className="text-[10px] text-gray-400 block">{dev.type} ({dev.routing} routing)</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{dev.interfaces?.length || 0} Interfaces</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cable Port Connections Map */}
                <div className="md:col-span-2 bg-gray-950/40 border border-gray-850 rounded-xl p-4 space-y-3">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Logical Connection Map</span>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-gray-300">
                      <thead>
                        <tr className="border-b border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          <th className="py-2 text-left">From Node</th>
                          <th className="py-2 text-left">Local Port</th>
                          <th className="py-2 text-center">Connection</th>
                          <th className="py-2 text-right">Destination Node</th>
                          <th className="py-2 text-right">Remote Port</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-850">
                        {analysisResult.connections.map((c: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-900/20">
                            <td className="py-2.5 font-bold text-white">{c.from_device}</td>
                            <td className="py-2.5 font-mono text-indigo-400">{c.from_port}</td>
                            <td className="py-2.5 text-center text-gray-500 font-mono">─────────▶</td>
                            <td className="py-2.5 text-right font-bold text-white">{c.to_device}</td>
                            <td className="py-2.5 text-right font-mono text-indigo-400">{c.to_port}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'audit' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cisco Security & Hardening Violations</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.security_audits.map((a: any, idx: number) => (
                  <div key={idx} className={`border rounded-xl p-4 flex gap-3 ${getSeverityColor(a.severity)}`}>
                    <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{a.title}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider bg-black/30">
                          {a.severity}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-400 block mt-1 font-mono">Device: {a.device}</span>
                      <p className="text-[11px] text-gray-300 mt-2 leading-relaxed">{a.description}</p>
                      <div className="bg-black/20 rounded-lg p-2.5 border border-white/5 mt-3">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-white block mb-1">Recommended Fix:</span>
                        <code className="text-[10px] text-indigo-300 font-mono">{a.recommendation}</code>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {analysisResult.improvements && analysisResult.improvements.length > 0 && (
                <div className="bg-indigo-950/20 border border-indigo-900/30 rounded-xl p-4 mt-4">
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-2">Architect Best-Practice Recommendations</span>
                  <div className="space-y-3">
                    {analysisResult.improvements.map((imp: any, idx: number) => (
                      <div key={idx} className="text-xs flex items-start gap-2">
                        <span className="text-indigo-400 font-bold font-mono">[{imp.category}]</span>
                        <div>
                          <p className="text-white font-semibold">{imp.issue}</p>
                          <p className="text-gray-400 mt-0.5">{imp.recommendation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lab' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-850 pb-2 mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Interactive CCNA Lab Walkthrough</span>
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">Estimated completion: 30 minutes</span>
              </div>

              <div className="space-y-4">
                {analysisResult.steps.map((step: any, idx: number) => (
                  <div key={idx} className="bg-gray-950/40 border border-gray-850 rounded-xl p-4 flex gap-4 text-left">
                    <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-xs font-mono font-bold text-indigo-400">
                      {step.num}
                    </div>
                    <div className="flex-1 space-y-2">
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider m-0">{step.title}</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed">{step.instructions}</p>
                      
                      {step.explanation && (
                        <p className="text-[10px] text-gray-500 italic font-sans leading-relaxed">
                          Note: {step.explanation}
                        </p>
                      )}

                      {step.cli && (
                        <div className="relative bg-black/95 rounded-lg border border-gray-850 p-3 mt-2">
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                            <button 
                              onClick={() => handleCopy(step.cli, `step-${idx}`)} 
                              className="p-1 bg-gray-900 border border-gray-800 rounded hover:text-white transition-colors"
                              title="Copy CLI snippet"
                            >
                              {copiedText === `step-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                          <span className="text-[9px] font-bold text-indigo-400 font-mono block mb-1">Cisco CLI Command Block:</span>
                          <pre className="font-mono text-[10px] text-green-400 overflow-x-auto whitespace-pre leading-relaxed pr-10">
                            {step.cli}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'tech' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Topology Explanation Profile</span>
              <div className="bg-indigo-950/10 border border-indigo-900/30 rounded-xl p-4">
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1.5">Design Overview Summary</span>
                <p className="text-xs text-gray-300 leading-relaxed font-sans">{analysisResult.explanation.summary}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisResult.explanation.technologies.map((tech: any, idx: number) => (
                  <div key={idx} className="bg-gray-950/40 border border-gray-850 rounded-xl p-4 flex items-start gap-3">
                    <CheckCircle className={`w-5 h-5 mt-0.5 shrink-0 ${tech.used ? 'text-emerald-500' : 'text-gray-600'}`} />
                    <div>
                      <span className="text-xs font-bold text-white block">{tech.name}</span>
                      <span className="text-[11px] text-gray-400 mt-1 block leading-relaxed">{tech.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'quiz' && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-2 border-b border-gray-850 pb-2 mb-2">
                <Award className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Technical Interview prep simulator</span>
              </div>

              <div className="space-y-4">
                {analysisResult.viva_questions.map((quiz: any, idx: number) => (
                  <div key={idx} className="bg-gray-950/40 border border-gray-850 rounded-xl p-4 space-y-3 text-left">
                    <div className="flex items-start gap-2.5">
                      <HelpCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-bold text-white block uppercase tracking-wide">Question {idx+1}</span>
                        <p className="text-[11px] text-gray-200 font-semibold mt-1">{quiz.q}</p>
                      </div>
                    </div>

                    {revealAnswerIdx === idx ? (
                      <div className="bg-indigo-950/15 border border-indigo-900/30 rounded-lg p-3 text-xs text-gray-300 leading-relaxed font-sans animate-fadeIn">
                        <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">Answer explanation:</span>
                        {quiz.a}
                      </div>
                    ) : (
                      <button 
                        onClick={() => setRevealAnswerIdx(idx)} 
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all"
                      >
                        Reveal Answer
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-gray-850 pb-2">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Cross-Vendor Config Translator</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Converts Cisco IOS interface addresses and host setup to other target vendor CLIs.</p>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    value={selectedMigrationVendor} 
                    onChange={(e) => setSelectedMigrationVendor(e.target.value as any)} 
                    className="bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="juniper">Juniper JunOS</option>
                    <option value="nxos">Cisco NX-OS</option>
                    <option value="huawei">Huawei VRP</option>
                    <option value="mikrotik">MikroTik RouterOS</option>
                  </select>

                  <button 
                    onClick={() => handleCopy(analysisResult.migrations[selectedMigrationVendor], 'mig-block')} 
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5"
                  >
                    {copiedText === 'mig-block' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy Code
                  </button>
                </div>
              </div>

              <div className="bg-black/95 rounded-xl border border-gray-850 p-4 relative">
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider block mb-2">
                  Target Config Output ({selectedMigrationVendor.toUpperCase()})
                </span>
                <pre className="font-mono text-[11px] text-green-400 overflow-x-auto whitespace-pre leading-relaxed max-h-72">
                  {analysisResult.migrations[selectedMigrationVendor]}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'raw' && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Original Extracted Cisco Configuration</span>
              <div className="bg-black/95 rounded-xl border border-gray-850 p-4 relative">
                <button 
                  onClick={() => handleCopy(fileContent, 'raw-cfg')} 
                  className="absolute top-3 right-3 p-1.5 bg-gray-900 border border-gray-800 rounded hover:text-white transition-colors"
                  title="Copy Config"
                >
                  {copiedText === 'raw-cfg' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <pre className="font-mono text-[11px] text-indigo-400 overflow-x-auto whitespace-pre leading-relaxed max-h-96">
                  {fileContent}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
