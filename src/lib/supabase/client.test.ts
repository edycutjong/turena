import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn().mockReturnValue('mock-supabase-client'),
}));

describe('supabase client', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('creates client with environment variables', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://mock.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'mock-anon-key');

    const { supabase } = await import('./client');

    expect(createClient).toHaveBeenCalledWith('https://mock.supabase.co', 'mock-anon-key');
    expect(supabase).toBe('mock-supabase-client');
    
    vi.unstubAllEnvs();
  });
});
