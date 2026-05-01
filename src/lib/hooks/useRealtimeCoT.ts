import { useEffect, useState } from 'react';
import { supabase } from '../supabase/client';

export type CoTToken = {
  id: number;
  cycle_id: string;
  token_text: string;
  token_type: 'reasoning' | 'intent' | 'correction';
  created_at: string;
};

export function useRealtimeCoT(activeCycleId: string | null) {
  const [tokens, setTokens] = useState<CoTToken[]>([]);

  useEffect(() => {
    if (!activeCycleId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTokens([]);
      return;
    }

    // Clear tokens when cycle changes
     
    setTokens([]);

    // Fetch existing tokens for this cycle just in case we joined late
    const fetchExisting = async () => {
      const { data } = await supabase
        .from('cot_tokens')
        .select('*')
        .eq('cycle_id', activeCycleId)
        .order('id', { ascending: true });
      
      if (data) {
        setTokens(data as CoTToken[]);
      }
    };
    
    fetchExisting();

    const channel = supabase
      .channel(`cot_tokens_${activeCycleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cot_tokens',
          filter: `cycle_id=eq.${activeCycleId}`,
        },
        (payload) => {
          setTokens((prev) => [...prev, payload.new as CoTToken]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeCycleId]);

  return tokens;
}
