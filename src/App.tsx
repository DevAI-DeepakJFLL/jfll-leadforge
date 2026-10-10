import React from 'react';
import { Search, Sparkles, Users, Filter, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Mini preview shell for verification */}
      <aside className="w-16 bg-dock flex flex-col items-center py-4 space-y-6 text-slate-400">
        <div className="w-9 h-9 rounded-lg bg-apollo flex items-center justify-center text-white font-bold text-lg shadow-sm">
          A
        </div>
        <nav className="flex flex-col space-y-4">
          <button className="p-2 rounded-lg bg-dock-active text-white transition-colors" title="Search Leads">
            <Search className="w-5 h-5 text-apollo-400" />
          </button>
          <button className="p-2 rounded-lg hover:bg-dock-hover hover:text-slate-200 transition-colors" title="People">
            <Users className="w-5 h-5" />
          </button>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-surface-border bg-white px-6 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-apollo" />
              Apollo Leads Explorer
            </span>
            <div className="flex space-x-1">
              <span className="px-3 py-1 text-sm font-medium text-apollo border-b-2 border-apollo cursor-pointer">
                People
              </span>
              <span className="px-3 py-1 text-sm font-medium text-slate-500 hover:text-slate-800 cursor-pointer">
                Companies
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
              Scaffolding Ready
            </span>
          </div>
        </header>

        <main className="flex-1 p-6 flex items-center justify-center">
          <div className="max-w-md p-6 bg-white rounded-xl border border-surface-border shadow-sm text-center">
            <div className="w-12 h-12 bg-apollo-50 text-apollo rounded-xl flex items-center justify-center mx-auto mb-4">
              <Filter className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-semibold text-slate-900 mb-2">
              Leads Prospecting System
            </h1>
            <p className="text-sm text-slate-500">
              Vite, React 18, Tailwind CSS, TanStack Query & Table, and design tokens successfully scaffolded.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
