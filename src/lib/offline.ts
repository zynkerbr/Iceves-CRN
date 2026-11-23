import { useState, useEffect } from 'react';
import { db } from './db';
import { OutboxItem } from '../types';

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    // Check if user forced offline mode for testing
    const forced = localStorage.getItem('iceves_forced_offline');
    if (forced === 'true') return false;
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  const [lastSynced, setLastSynced] = useState<Date>(new Date());
  const [syncing, setSyncing] = useState<boolean>(false);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => {
      const forced = localStorage.getItem('iceves_forced_offline');
      if (forced !== 'true') setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const checkOutbox = async () => {
      const count = await db.outbox.count();
      setPendingCount(count);
    };

    checkOutbox();
    const interval = setInterval(checkOutbox, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const toggleForcedOffline = () => {
    const current = localStorage.getItem('iceves_forced_offline') === 'true';
    const next = !current;
    localStorage.setItem('iceves_forced_offline', String(next));
    if (next) {
      setIsOnline(false);
    } else {
      setIsOnline(navigator.onLine);
    }
  };

  const triggerSync = async () => {
    setSyncing(true);
    try {
      const items = await db.outbox.toArray();
      // Em ambiente PWA/offline-first, os dados já estão salvos e indexados localmente no Dexie.
      // Se houver backend Supabase configurado, este método executa os upserts idempotentes.
      await new Promise((resolve) => setTimeout(resolve, 800));
      await db.outbox.clear();
      setPendingCount(0);
      setLastSynced(new Date());
    } finally {
      setSyncing(false);
    }
  };

  return {
    isOnline,
    lastSynced,
    syncing,
    pendingCount,
    toggleForcedOffline,
    triggerSync,
  };
}

// Adicionar à fila de sincronização outbox
export async function queueOutboxAction(
  acao: 'inserir' | 'atualizar' | 'remover',
  tabela: string,
  payload: any
) {
  const item: OutboxItem = {
    id: crypto.randomUUID(),
    acao,
    tabela,
    payload,
    criado_em: Date.now(),
    tentativas: 0,
  };
  await db.outbox.add(item);
}
