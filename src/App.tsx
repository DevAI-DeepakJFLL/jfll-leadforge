import React, { useState } from 'react';
import { AppLayout } from '@/components/layout';
import { Filter, Users, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

export const App: React.FC = () => {
  const [activeNav, setActiveNav] = useState('search');
  const [activeTab, setActiveTab] = useState('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => {
      setNotificationMsg(null);
    }, 3000);
  };

  return (
    <AppLayout
      activeNav={activeNav}
      onNavChange={(navId) => {
        setActiveNav(navId);
        showToast(`Navigated to: ${navId}`);
      }}
      activeTab={activeTab}
      onTabChange={(tabId) => {
        setActiveTab(tabId);
        showToast(`Switched view to tab: ${tabId}`);
      }}
      searchQuery={searchQuery}
      onSearchChange={(q) => setSearchQuery(q)}
      onSearchSubmit={(q) => showToast(`Executing search for: "${q}"`)}
      jobChangesCount={237}
      onJobChangesClick={() => showToast('Opening Job Changes feed (237 events)')}
      onImportClick={() => {}}
    >
      {/* Main Content Workspace Placeholder (to be populated in Tasks 4 & 5) */}
      <div className="flex-1 flex flex-col p-6 items-center justify-center relative overflow-auto">
        {/* Toast notification */}
        {notificationMsg && (
          <div className="absolute top-4 right-4 z-50 bg-slate-900 text-white text-xs font-medium px-3.5 py-2 rounded-lg shadow-lg border border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
            {notificationMsg}
          </div>
        )}

        <div className="max-w-xl w-full bg-white rounded-xl border border-surface-border p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-surface-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-apollo-50 border border-apollo-200 flex items-center justify-center text-apollo shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  Apollo Shell Navigation
                  <span className="text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Task 3 Complete
                  </span>
                </h1>
                <p className="text-xs text-slate-500">
                  Leftmost 64px dark dock & top navigation header matching Ref.jpg
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-medium px-2 py-1 bg-slate-100 rounded text-slate-600 uppercase">
              Tab: {activeTab}
            </span>
          </div>

          <div className="py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 font-medium mb-1">Active Dock Section</div>
                <div className="font-semibold text-slate-800 capitalize flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-apollo" />
                  {activeNav}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <div className="text-slate-500 font-medium mb-1">Search Query State</div>
                <div className="font-mono text-slate-800 truncate">
                  {searchQuery ? `"${searchQuery}"` : '(None)'}
                </div>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/60 border border-blue-100 rounded-lg text-xs text-blue-900 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-apollo shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold">Next Stage:</span> Task 4 will mount the collapsible multi-facet <span className="font-mono text-[11px]">FilterSidebar</span> with URL query parameter synchronization, followed by Task 5 with the <span className="font-mono text-[11px]">LeadsTable</span> and bulk action toolbar.
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-surface-border flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Matching Ref.jpg 1:1 specifications</span>
            </div>
            <div className="flex items-center gap-1 text-apollo font-medium">
              <span>Ready for Task 4</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default App;
