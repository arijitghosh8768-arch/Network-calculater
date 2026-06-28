import React, { useState } from 'react';
import { requestApi } from '../utils/api';
import { Copy, Terminal } from 'lucide-react';

interface CiscoGenProps {
  apiConnected: boolean | null;
}

export const CiscoGen: React.FC<CiscoGenProps> = ({ apiConnected }) => {
  const [network, setNetwork] = useState('192.168.1.0/24');
  const [aclNum, setAclNum] = useState(10);
  const [aclAction, setAclAction] = useState('permit');
  const [ospfArea, setOspfArea] = useState(0);
  const [ospfPid, setOspfPid] = useState(1);

  const [aclOutput, setAclOutput] = useState<string>('');
  const [ospfOutput, setOspfOutput] = useState<string[]>([]);
  const [wildcardOutput, setWildcardOutput] = useState<string>('');

  const generateLocal = (netStr: string) => {
    try {
      const parts = netStr.split('/');
      const ip = parts[0];
      const cidr = parts.length === 2 ? Number(parts[1]) : 24;
      
      // Calculate wildcard
      const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0;
      const wildcardNum = ~maskNum >>> 0;

      const numToIp = (num: number) => [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255
      ].join('.');

      const wildcardStr = numToIp(wildcardNum);
      const aclStr = `access-list ${aclNum} ${aclAction} ${ip} ${wildcardStr}`;
      const ospfCmds = [
        `router ospf ${ospfPid}`,
        ` network ${ip} ${wildcardStr} area ${ospfArea}`
      ];

      return {
        wildcard: wildcardStr,
        acl: aclStr,
        ospf: ospfCmds
      };
    } catch (e) {
      return null;
    }
  };

  const handleGenerate = async () => {
    try {
      if (apiConnected) {
        const aclRes = await requestApi('/generate/acl', 'POST', {
          network,
          acl_number: aclNum,
          action: aclAction
        });
        const ospfRes = await requestApi('/generate/ospf', 'POST', {
          network,
          area: ospfArea,
          process_id: ospfPid
        });

        if (aclRes.success) setAclOutput(aclRes.acl);
        if (ospfRes.success) setOspfOutput(ospfRes.ospf_commands);
        setWildcardOutput(aclRes.wildcard);
      } else {
        const local = generateLocal(network);
        if (local) {
          setAclOutput(local.acl);
          setOspfOutput(local.ospf);
          setWildcardOutput(local.wildcard);
        }
      }
    } catch (e) {
      const local = generateLocal(network);
      if (local) {
        setAclOutput(local.acl);
        setOspfOutput(local.ospf);
        setWildcardOutput(local.wildcard);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Inputs */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-4 text-left">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0">
            <Terminal className="w-5 h-5 text-indigo-400" />
            Config Inputs
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Target Subnet / Network</label>
              <input
                type="text"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                placeholder="e.g. 192.168.1.0/24"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cisco ACL Options</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">ACL ID (1-99)</label>
                  <input
                    type="number"
                    value={aclNum}
                    onChange={(e) => setAclNum(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">Rule Action</label>
                  <select
                    value={aclAction}
                    onChange={(e) => setAclAction(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-2 py-1.5 text-white text-xs"
                  >
                    <option value="permit">Permit</option>
                    <option value="deny">Deny</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-3">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">OSPF Statement Options</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">OSPF Process ID</label>
                  <input
                    type="number"
                    value={ospfPid}
                    onChange={(e) => setOspfPid(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 mb-1">OSPF Area ID</label>
                  <input
                    type="number"
                    value={ospfArea}
                    onChange={(e) => setOspfArea(Number(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-sm mt-2"
            >
              Generate Configurations
            </button>
          </div>
        </div>

        {/* Cisco Terminal Previews */}
        <div className="lg:col-span-2 space-y-6">
          {/* Wildcard display card */}
          {wildcardOutput && (
            <div className="glass-panel rounded-2xl p-4 flex items-center justify-between text-left">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Calculated Wildcard Mask</span>
                <span className="font-mono text-lg text-white font-bold">{wildcardOutput}</span>
              </div>
              <button
                onClick={() => copyToClipboard(wildcardOutput)}
                className="bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 px-3 py-2 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" /> Copy Mask
              </button>
            </div>
          )}

          {/* Cisco IOS Terminal */}
          <div className="glass-panel rounded-2xl overflow-hidden border border-gray-800 shadow-2xl flex flex-col text-left">
            {/* Window title bar */}
            <div className="bg-gray-900 px-4 py-2.5 flex items-center justify-between border-b border-gray-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500/80"></span>
                <span className="w-3 h-3 rounded-full bg-green-500/80"></span>
                <span className="text-xs text-gray-400 font-mono ml-2">Cisco IOS Config Terminal Simulator</span>
              </div>
            </div>

            <div className="bg-black/90 p-5 font-mono text-xs md:text-sm text-green-400 min-h-60 leading-relaxed overflow-x-auto space-y-4">
              <div>
                <span className="text-gray-500"># Cisco Access Control List Command</span>
                <div className="flex items-center justify-between mt-1 group">
                  <span className="text-white">{aclOutput || `access-list 10 permit 192.168.1.0 0.0.0.255`}</span>
                  <button
                    onClick={() => copyToClipboard(aclOutput || `access-list 10 permit 192.168.1.0 0.0.0.255`)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-800/80 pt-3">
                <span className="text-gray-500"># Cisco OSPF Network Configuration Statements</span>
                <div className="flex items-center justify-between mt-1 group">
                  <div className="text-white space-y-1">
                    {ospfOutput.length > 0 ? (
                      ospfOutput.map((cmd, idx) => <div key={idx}>{cmd}</div>)
                    ) : (
                      <>
                        <div>router ospf 1</div>
                        <div> network 192.168.1.0 0.0.0.255 area 0</div>
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => copyToClipboard(ospfOutput.join('\n') || 'router ospf 1\n network 192.168.1.0 0.0.0.255 area 0')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-500 hover:text-white"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
