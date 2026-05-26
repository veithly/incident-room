import { useCallback, useEffect, useState } from 'react';
import type { InitResponse, MutateResponse, RoomState } from '../../shared/api';

type HookState = {
  state: RoomState | null;
  loading: boolean;
  error: string | null;
};

async function requestState(path: string, body?: unknown): Promise<RoomState> {
  const init: RequestInit = body
    ? {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    : { method: 'GET' };
  const response = await fetch(path, init);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `HTTP ${response.status}`);
  }

  const data = (await response.json()) as InitResponse | MutateResponse;
  return data.state;
}

export function useIncidentRoom() {
  const [hook, setHook] = useState<HookState>({
    state: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let mounted = true;
    requestState('/api/init')
      .then((state) => {
        if (mounted) setHook({ state, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (mounted) {
          setHook({
            state: null,
            loading: false,
            error: err instanceof Error ? err.message : 'Failed to load Incident Room',
          });
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  const mutate = useCallback(async (path: string, body?: unknown) => {
    setHook((prev) => ({ ...prev, error: null }));
    try {
      const state = await requestState(path, body ?? {});
      setHook({ state, loading: false, error: null });
    } catch (err: unknown) {
      setHook((prev) => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Action failed',
      }));
    }
  }, []);

  return {
    ...hook,
    declareIncident: useCallback(() => mutate('/api/declare'), [mutate]),
    claimEvidence: useCallback((evidenceId: string) => mutate('/api/claim', { evidenceId }), [mutate]),
    previewActionPack: useCallback((evidenceIds: string[]) => mutate('/api/action-preview', { evidenceIds }), [mutate]),
    confirmActionPack: useCallback((actionPackId: string) => mutate('/api/resolve', { actionPackId }), [mutate]),
    addEvidence: useCallback(
      (title: string, body: string) =>
        mutate('/api/evidence', {
          title,
          body,
          kind: 'manual',
        }),
      [mutate]
    ),
    resetRoom: useCallback(() => mutate('/api/reset'), [mutate]),
  };
}
