import React, { useState } from 'react';
import { requestApi } from '../utils/api';
import { ShieldAlert, Compass, Copy } from 'lucide-react';

interface Ipv6CalcProps {
  apiConnected: boolean | null;
}

export const Ipv6Calc: React.FC<Ipv6CalcProps> = ({ apiConnected }) => {
  const [ipv6Input, setIpv6Input] = useState('2001:db8::');
  const [prefixLen, setPrefixLen] = useState(64);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Local IPv6 parser fallback
  const parseIpv6Local = (ip: string, prefix: number) => {
    try {
      let cleanIp = ip.trim();
      if (cleanIp.includes('/')) {
        const parts = cleanIp.split('/');
        cleanIp = parts[0];
        prefix = Number(parts[1]);
      }

      // Very simple validation & expander
      if (!cleanIp.includes(':') || cleanIp.split(':').length > 8) {
        throw new Error("Invalid IPv6 Address");
      }

      // Check if it is documentation, link-local, loopback
      let addressType = "Global Unicast";
      const lowerIp = cleanIp.toLowerCase();
      if (lowerIp.startsWith("fe80")) addressType = "Link-Local Address";
      else if (lowerIp === "::1" || lowerIp === "0:0:0:0:0:0:0:1") addressType = "Loopback Address";
      else if (lowerIp === "::" || lowerIp === "0:0:0:0:0:0:0:0") addressType = "Unspecified Address";
      else if (lowerIp.startsWith("2001:db8")) addressType = "Documentation Address";
      else if (lowerIp.startsWith("fc") || lowerIp.startsWith("fd")) addressType = "Unique Local Address (ULA)";
      else if (lowerIp.startsWith("ff")) addressType = "Multicast Address";

      // Semi-expand block helper
      const segments = cleanIp.split(':');
      let expandedSegments: string[] = [];
      
      const emptyIdx = segments.indexOf('');
      if (emptyIdx !== -1) {
        // Expand the double colon
        const missingCount = 8 - (segments.filter(s => s !== '').length);
        const replacement = Array(missingCount).fill('0000');
        
        const left = segments.slice(0, emptyIdx).filter(s => s !== '');
        const right = segments.slice(emptyIdx + 1).filter(s => s !== '');
        
        expandedSegments = [...left, ...replacement, ...right];
      } else {
        expandedSegments = segments;
      }
      
      const expandedForm = expandedSegments.map(s => s.padStart(4, '0')).join(':');
      const compressedForm = cleanIp; // Keep original as fallback compressed representation

      return {
        success: true,
        ip: cleanIp,
        prefix_len: prefix,
        network_prefix: expandedForm.split(':').slice(0, prefix / 16).join(':') + '::',
        address_type: addressType,
        compressed_form: compressedForm,
        expanded_form: expandedForm,
        total_addresses: "1.8 x 10^38 (Approx)",
        is_link_local: lowerIp.startsWith("fe80"),
        is_multicast: lowerIp.startsWith("ff"),
        is_loopback: lowerIp === "::1"
      };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (apiConnected) {
        const data = await requestApi('/calculate/ipv6', 'POST', {
          ip: ipv6Input,
          prefix_len: prefixLen
        });
        setResults(data);
      } else {
        const data = parseIpv6Local(ipv6Input, prefixLen);
        if (data.success) setResults(data);
        else setError(data.error || 'Calculation error');
      }
    } catch (e: any) {
      const data = parseIpv6Local(ipv6Input, prefixLen);
      if (data.success) setResults(data);
      else setError(e.message || 'Calculation error');
    } finally {
      setLoading(false);
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
            <Compass className="w-5 h-5 text-indigo-400" />
            IPv6 Parameters
          </h2>

          <form onSubmit={handleCalculate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">IPv6 Address</label>
              <input
                type="text"
                value={ipv6Input}
                onChange={(e) => setIpv6Input(e.target.value)}
                placeholder="e.g. 2001:db8::"
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wider">Prefix Length</label>
              <select
                value={prefixLen}
                onChange={(e) => setPrefixLen(Number(e.target.value))}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono text-sm"
              >
                {[0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 96, 112, 120, 128].map((len) => (
                  <option key={len} value={len}>/{len}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20 text-sm mt-2"
            >
              Analyze Address
            </button>
          </form>

          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/20 rounded-xl flex items-start gap-2 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Right Details */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 space-y-5 text-left">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2 m-0">
            <Compass className="w-5 h-5 text-indigo-400" />
            IPv6 Analysis Output
          </h2>

          {results ? (
            <div className="space-y-4">
              {/* Main Expanded block */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Fully Expanded Representation</span>
                <span className="font-mono text-sm md:text-base text-white block select-all break-all">{results.expanded_form}</span>
              </div>

              {/* Compressed Block */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Compressed Representation</span>
                <span className="font-mono text-sm md:text-base text-white block select-all break-all">{results.compressed_form}</span>
              </div>

              {/* Stats & Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Address Classification', val: results.address_type },
                  { label: 'Network Prefix', val: results.network_prefix },
                  { label: 'Link-Local Address', val: results.is_link_local ? 'Yes' : 'No' },
                  { label: 'Multicast Support', val: results.is_multicast ? 'Yes' : 'No' }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-950/40 border border-gray-800 rounded-xl p-3 flex flex-col justify-between group">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</span>
                    <div className="flex items-center justify-between mt-1 gap-2">
                      <span className="font-mono text-sm text-gray-200 truncate">{item.val}</span>
                      <button
                        onClick={() => copyToClipboard(item.val)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-gray-400 hover:text-white"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
              Please enter an IPv6 Address and click Analyze Address.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
