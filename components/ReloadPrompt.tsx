
import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

const ReloadPrompt: React.FC = () => {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-[slideUp_0.3s_ease-out]">
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-[2.5rem] shadow-2xl flex flex-col gap-4 max-w-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
            <i className={`fas ${needRefresh ? 'fa-sync-alt fa-spin' : 'fa-cloud-download-alt'} text-blue-500 text-xl`}></i>
          </div>
          <div>
            <h4 className="text-white font-black text-sm uppercase tracking-widest mb-1">
              {needRefresh ? 'Update Available' : 'Ready Offline'}
            </h4>
            <p className="text-slate-400 text-xs font-medium leading-relaxed">
              {needRefresh 
                ? 'A new version of IronFlow is ready. Reload now to apply the latest clinical updates and fixes.' 
                : 'App is ready to work offline. You can access your dashboard without an active connection.'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {needRefresh && (
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Reload & Update
            </button>
          )}
          <button
            onClick={() => close()}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReloadPrompt;
