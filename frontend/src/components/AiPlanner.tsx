import React, { useState } from 'react';
import { requestApi } from '../utils/api';
import { Cpu, Send, RefreshCw, Key } from 'lucide-react';

interface AiPlannerProps {
  apiConnected: boolean | null;
}

export const AiPlanner: React.FC<AiPlannerProps> = ({ apiConnected }) => {
  const [query, setQuery] = useState('I have 300 hosts and 4 departments. Help me design the subnets.');
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState<any[]>([
    {
      sender: 'assistant',
      text: "Hello! I am your AI Network Planning Assistant. Send me your department specifications, host numbers, or routing requirements and I will lay out a complete subnet proposal, including CIDR prefix recommendations, VLSM allocations, and Cisco device configuration blocks."
    }
  ]);
  const [loading, setLoading] = useState(false);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = { sender: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setLoading(true);

    try {
      if (apiConnected) {
        const data = await requestApi('/ai/plan', 'POST', { query: query, api_key: apiKey || null });
        setMessages(prev => [...prev, { sender: 'assistant', text: data.advice, isMarkdown: true }]);
      } else {
        // Standalone offline mockup
        const advice = getLocalAdvice(query);
        setMessages(prev => [...prev, { sender: 'assistant', text: advice, isMarkdown: true }]);
      }
    } catch (e) {
      const advice = getLocalAdvice(query);
      setMessages(prev => [...prev, { sender: 'assistant', text: advice, isMarkdown: true }]);
    } finally {
      setLoading(false);
    }
  };

  const getLocalAdvice = (_q: string): string => {
    // Generate a fallback advice layout mimicking the backend's local engine
    return `### NetCalc Offline Architect Suggestions

You are currently running in **Offline Mode**. Here is an offline-engineered subnet plan:

* **Base Subnet Proposal:** \`192.168.1.0/23\`
* **Proposed Subnets:**
  - **Subnet 1 (Engineering):** \`192.168.1.0/24\` (254 usable IPs)
  - **Subnet 2 (Sales):** \`192.168.2.0/25\` (126 usable IPs)
  - **Subnet 3 (Finance):** \`192.168.2.128/26\` (62 usable IPs)
  - **Subnet 4 (HR):** \`192.168.2.192/27\` (30 usable IPs)

#### Cisco IOS Configuration Block:
\`\`\`cisco
router ospf 100
 network 192.168.1.0 0.0.0.255 area 0
 network 192.168.2.0 0.0.0.127 area 0
 network 192.168.2.128 0.0.0.63 area 0
 network 192.168.2.192 0.0.0.31 area 0
\`\`\`

*Provide a Gemini API key in the configuration bar above to enable full live LLM suggestions.*`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-left">
      {/* API Key configuration bar */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>(Optional) Configure Gemini API key for live AI recommendations:</span>
        </div>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIzaSy..."
          className="bg-gray-900 border border-gray-800 rounded-xl px-3 py-1.5 text-white font-mono w-full md:w-64 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Chat Window */}
      <div className="glass-panel rounded-2xl flex flex-col h-[550px] overflow-hidden border border-gray-800/80 shadow-2xl">
        {/* Chat Header */}
        <div className="bg-gray-900/60 px-6 py-4 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/15 border border-indigo-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-white block">Network Planning Assistant</span>
              <span className="text-[10px] text-gray-400 font-mono">Status: Ready</span>
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-950/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs md:text-sm shadow-md leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-gray-900 text-gray-300 border border-gray-850 rounded-bl-none whitespace-pre-wrap font-sans'
                }`}
              >
                {msg.isMarkdown ? (
                  // Safe custom parser for basic markdown rendering in simulation
                  <div className="space-y-3 font-sans">
                    {msg.text.split('\n\n').map((block: string, bIdx: number) => {
                      if (block.startsWith('###')) {
                        return <h3 key={bIdx} className="text-sm font-bold text-white uppercase tracking-wider border-b border-gray-850 pb-1 mt-2">{block.replace('###', '').trim()}</h3>;
                      }
                      if (block.startsWith('*')) {
                        return (
                          <ul key={bIdx} className="list-disc pl-4 space-y-1 text-xs">
                            {block.split('\n').map((li, lIdx) => (
                              <li key={lIdx}>{li.replace('*', '').trim()}</li>
                            ))}
                          </ul>
                        );
                      }
                      if (block.startsWith('|')) {
                        const rows = block.split('\n').filter(r => r.trim());
                        return (
                          <div key={bIdx} className="overflow-x-auto border border-gray-850 rounded-xl my-2">
                            <table className="min-w-full divide-y divide-gray-850 text-left text-xs font-mono">
                              <tbody className="divide-y divide-gray-850 bg-gray-950/40">
                                {rows.map((row, rIdx) => {
                                  const cols = row.split('|').filter(c => c !== '');
                                  if (row.includes('---')) return null;
                                  return (
                                    <tr key={rIdx}>
                                      {cols.map((col, cIdx) => (
                                        <td key={cIdx} className="px-2 py-1 text-gray-300">{col.trim()}</td>
                                      ))}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        );
                      }
                      if (block.startsWith('```')) {
                        return (
                          <pre key={bIdx} className="bg-black/80 p-3 rounded-lg border border-gray-850 font-mono text-[11px] text-green-400 overflow-x-auto my-2">
                            <code>{block.replace(/```[a-z]*/g, '').trim()}</code>
                          </pre>
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
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-900 border border-gray-850 rounded-2xl rounded-bl-none px-4 py-3 text-xs md:text-sm text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="bg-gray-900/60 p-4 border-t border-gray-800 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Describe your network requirements..."
            className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-indigo-500 text-xs md:text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-4 py-2.5 transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
