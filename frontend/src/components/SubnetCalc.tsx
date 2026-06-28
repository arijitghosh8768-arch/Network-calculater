import React, { useState, useEffect } from 'react';
import { ipv4CalcLocal, requestApi } from '../utils/api';
import { Copy, RefreshCw, Layers, Binary, ShieldAlert } from 'lucide-react';

interface SubnetCalcProps {
  apiConnected: boolean | null;
}

export const SubnetCalc: React.FC<SubnetCalcProps> = ({ apiConnected }) => {
  const [ip, setIp] = useState('192.168.1.0');
  const [cidr, setCidr] = useState(24);
  const [subnetMask, setSubnetMask] = useState('255.255.255.0');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Sync inputs
  const triggerCalculation = async (targetIp: string, targetCidr: number) => {
    setLoading(true);
    setError(null);
    try {
      if (apiConnected) {
        const data = await requestApi('/calculate/ipv4', 'POST', { ip: targetIp, cidr: targetCidr });
        setResults(data);
        setSubnetMask(data.subnet_mask);
      } else {
        const data = ipv4CalcLocal(targetIp, targetCidr);
        if (data.success) {
          setResults(data);
          setSubnetMask(data.subnet_mask || '');
        } else {
          setError(data.error || 'Calculation error');
        }
      }
    } catch (e: any) {
      // Local fallback
      const data = ipv4CalcLocal(targetIp, targetCidr);
      if (data.success) {
        setResults(data);
        setSubnetMask(data.subnet_mask || '');
      } else {
        setError(e.message || 'Calculation error');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    triggerCalculation(ip, cidr);
  }, [apiConnected]);

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    triggerCalculation(ip, cidr);
  };

  const handleMaskChange = async (mask: string) => {
    setSubnetMask(mask);
    try {
      if (apiConnected) {
        const data = await requestApi('/convert/mask-to-cidr', 'POST', { mask });
        setCidr(data.cidr);
        triggerCalculation(ip, data.cidr);
      } else {
        // Simple local convert
        const cidrVal = maskToCidrLocal(mask);
        if (cidrVal !== -1) {
          setCidr(cidrVal);
          triggerCalculation(ip, cidrVal);
        }
      }
    } catch (e) {
      const cidrVal = maskToCidrLocal(mask);
      if (cidrVal !== -1) {
        setCidr(cidrVal);
        triggerCalculation(ip, cidrVal);
      }
    }
  };

  const maskToCidrLocal = (mask: string): number => {
    const parts = mask.split('.').map(Number);
    if (parts.length !== 4 || parts.some(isNaN)) return -1;
    const maskNum = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
    const binStr = (maskNum >>> 0).toString(2);
    if (binStr.includes('01')) return -1; // invalid subnet mask
    return binStr.indexOf('0') === -1 ? 32 : binStr.indexOf('0');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0 text-left">
            <Layers className="w-5 h-5 text-indigo-400" />
            Address Configuration
          </h2>
          <form onSubmit={handleCalculate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">IPv4 IP Address</label>
              <input
                type="text"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                placeholder="e.g. 192.168.1.1"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">CIDR Prefix</label>
                <select
                  value={cidr}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setCidr(val);
                    triggerCalculation(ip, val);
                  }}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                >
                  {Array.from({ length: 33 }, (_, i) => (
                    <option key={i} value={i}>/{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Subnet Mask</label>
                <input
                  type="text"
                  value={subnetMask}
                  onChange={(e) => handleMaskChange(e.target.value)}
                  placeholder="e.g. 255.255.255.0"
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 text-sm mt-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Calculate Network'}
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-xs text-red-400 text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0 text-left">
            <Binary className="w-5 h-5 text-emerald-400" />
            Network Properties
          </h2>
          {results ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Network IP', val: results.network_address },
                  { label: 'Broadcast IP', val: results.broadcast_address },
                  { label: 'Subnet Mask', val: results.subnet_mask },
                  { label: 'Wildcard Mask', val: results.wildcard_mask },
                  { label: 'Usable Range', val: `${results.first_host} - ${results.last_host}` },
                  { label: 'Total/Usable Hosts', val: `${results.total_hosts.toLocaleString()} / ${results.usable_hosts.toLocaleString()}` },
                  { label: 'Class', val: `Class ${results.ip_class}` },
                  { label: 'IP Type', val: results.ip_type }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-3.5 flex flex-col justify-between group text-left">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{item.label}</span>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="font-mono text-sm text-gray-200 truncate">{item.val}</span>
                      <button
                        onClick={() => copyToClipboard(item.val)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white"
                        title="Copy to clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Binary visualizer */}
              <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Bit-level Visualization</span>
                  <div className="flex items-center gap-4 text-xs font-medium">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> Network ({cidr} bits)</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> Host ({32 - cidr} bits)</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 py-2 font-mono">
                  {results.binary_octets.map((octet: any[], oIdx: number) => (
                    <div key={oIdx} className="flex items-center gap-0.5">
                      <div className="flex bg-gray-900 border border-gray-800 rounded-lg p-1.5 gap-0.5">
                        {octet.map((bitObj: any, bIdx: number) => (
                          <div
                            key={bIdx}
                            className={`w-6 h-8 rounded flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                              bitObj.type === 'network'
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-amber-600/20 text-amber-300 border border-amber-500/30'
                            }`}
                            title={`Bit ${bitObj.position}: ${bitObj.type === 'network' ? 'Network bit' : 'Host bit'}`}
                          >
                            {bitObj.bit}
                          </div>
                        ))}
                      </div>
                      {oIdx < 3 && <span className="text-gray-500 font-bold">.</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              Please enter valid IP details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
