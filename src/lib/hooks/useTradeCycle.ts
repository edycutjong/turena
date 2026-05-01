import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export type TradeCycle = {
  id: string;
  agent_id: string;
  cycle_number: number;
  intent: Record<string, unknown> | null;
  cot_transcript: string | null;
  result: 'win' | 'loss' | 'pending';
  pnl_mnt: number | null;
  self_corrected: boolean;
  tx_hash: string | null;
  created_at: string;
};

export function useTradeCycle() {
  const [activeCycle, setActiveCycle] = useState<TradeCycle | null>(null);
  const [cycles, setCycles] = useState<TradeCycle[]>([]);

  useEffect(() => {
    // Fetch initial state: latest cycles and the active one
    const fetchInitial = async () => {
      const { data } = await supabase
        .from('trade_cycles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setCycles(data as TradeCycle[]);
        const pending = data.find((c: TradeCycle) => c.result === 'pending');
        setActiveCycle(pending ? pending : null);
      }
    };
    
    fetchInitial();

    const channel = supabase
      .channel('public:trade_cycles')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_cycles',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newCycle = payload.new as TradeCycle;
            setCycles((prev) => [newCycle, ...prev].slice(0, 50));
            if (newCycle.result === 'pending') {
              setActiveCycle(newCycle);
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedCycle = payload.new as TradeCycle;
            setCycles((prev) =>
              prev.map((c) => (c.id === updatedCycle.id ? updatedCycle : c))
            );
            setActiveCycle((prev) => 
              prev?.id === updatedCycle.id && updatedCycle.result === 'pending' 
                ? updatedCycle 
                : updatedCycle.result === 'pending' ? updatedCycle : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { activeCycle, cycles };
}
