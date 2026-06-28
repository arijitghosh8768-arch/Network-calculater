import { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SubnetCalc } from './components/SubnetCalc';
import { VlsmFlsmCalc } from './components/VlsmFlsmCalc';
import { CiscoGen } from './components/CiscoGen';
import { Ipv6Calc } from './components/Ipv6Calc';
import { QuizMode } from './components/QuizMode';
import { AiPlanner } from './components/AiPlanner';
import { NetArchitectX } from './components/NetArchitectX';

function App() {
  const [currentModule, setCurrentModule] = useState<'calc' | 'designer'>('calc');
  const [activeTab, setActiveTab] = useState('subnet');
  const [apiConnected, setApiConnected] = useState<boolean | null>(null);

  // Check connection status to decide if we use FastAPI backend or local engines
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/");
        if (res.ok) {
          setApiConnected(true);
        } else {
          setApiConnected(false);
        }
      } catch (e) {
        setApiConnected(false);
      }
    };
    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Module Selector Top Bar */}
      <div className="bg-gray-900 border-b border-gray-850 px-6 py-2.5 flex items-center justify-between text-xs font-semibold gap-4">
        <div className="flex items-center gap-3">
          <span className="text-gray-400 uppercase tracking-widest">R-Zenith Suite Ecosystem:</span>
          <div className="flex bg-gray-950 p-0.5 rounded-lg border border-gray-850">
            <button
              onClick={() => setCurrentModule('calc')}
              className={`px-3 py-1 rounded-md transition-all ${
                currentModule === 'calc' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              NetCalc Pro Suite
            </button>
            <button
              onClick={() => setCurrentModule('designer')}
              className={`px-3 py-1 rounded-md transition-all ${
                currentModule === 'designer' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              NetArchitect X
            </button>
          </div>
        </div>
        <span className="text-[10px] text-gray-500 font-mono">v2.0.0</span>
      </div>

      {currentModule === 'calc' ? (
        <>
          <Header activeTab={activeTab} setActiveTab={setActiveTab} apiConnected={apiConnected} />
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">
            {activeTab === 'subnet' && <SubnetCalc apiConnected={apiConnected} />}
            {activeTab === 'planners' && <VlsmFlsmCalc apiConnected={apiConnected} />}
            {activeTab === 'cisco' && <CiscoGen apiConnected={apiConnected} />}
            {activeTab === 'ipv6' && <Ipv6Calc apiConnected={apiConnected} />}
            {activeTab === 'quiz' && <QuizMode apiConnected={apiConnected} />}
            {activeTab === 'ai' && <AiPlanner apiConnected={apiConnected} />}
          </main>
        </>
      ) : (
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">
          <NetArchitectX apiConnected={apiConnected} />
        </main>
      )}

      <footer className="w-full py-6 border-t border-gray-900 bg-gray-950 text-center text-xs text-gray-500">
        <p>© 2026 R-Zenith NetCalc & NetDesigner. Built for Cyber Security & Network Professionals.</p>
      </footer>
    </div>
  );
}

export default App;

