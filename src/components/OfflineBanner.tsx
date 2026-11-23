import React from 'react';
import { useOnlineStatus } from '../lib/offline';
import { WifiOff, CheckCircle2, RefreshCw } from 'lucide-react';

export function OfflineBanner() {
  const { isOnline, lastSynced, syncing, pendingCount, triggerSync } = useOnlineStatus();

  const getMinutesAgo = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 60000);
    if (diff < 1) return 'há instantes';
    if (diff === 1) return 'há 1 minuto';
    return `há ${diff} minutos`;
  };

  if (!isOnline) {
    return (
      <div className="bg-[var(--warn-soft)] border-b border-[var(--warn)]/20 px-4 py-2 flex items-center justify-between text-xs text-[var(--warn)] font-semibold transition-colors">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Sem internet, salvando no aparelho (fila local ativa).</span>
        </div>
        {pendingCount > 0 && (
          <span className="bg-[var(--warn)] text-white px-2 py-0.5 rounded-full text-[11px]">
            {pendingCount} lançamento{pendingCount > 1 ? 's' : ''} pendente{pendingCount > 1 ? 's' : ''}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface2)] border-b border-[var(--line)] px-4 py-1.5 flex items-center justify-between text-[11px] text-[var(--ink2)] font-medium">
      <div className="flex items-center gap-1.5">
        <CheckCircle2 className="w-3.5 h-3.5 text-[var(--ok)]" />
        <span>Sincronizado {getMinutesAgo(lastSynced)}</span>
      </div>
      <div className="flex items-center gap-2">
        {pendingCount > 0 && (
          <span className="text-[var(--warn)] font-semibold">
            {pendingCount} item{pendingCount > 1 ? 's' : ''} a enviar
          </span>
        )}
        <button
          onClick={triggerSync}
          disabled={syncing}
          className="hover:text-[var(--ink)] flex items-center gap-1 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>
    </div>
  );
}
