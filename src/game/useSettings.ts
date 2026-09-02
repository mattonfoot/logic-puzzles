import { useCallback, useEffect, useRef, useState } from 'react';

import { storage, valueOf } from '../storage/store';
import { DEFAULT_SETTINGS, type Settings } from './settings';

export interface SettingsStore {
  settings: Settings;
  /** False until the first read from disk has finished. */
  ready: boolean;
  update: (change: Partial<Omit<Settings, 'version'>>) => void;
}

/**
 * The player's settings, read once at start-up and written back whenever they
 * change. Writes are fire-and-forget: the switch has already moved, and a
 * phone that cannot write should cost the preference, not the tap.
 */
export function useSettings(): SettingsStore {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);
  const current = useRef(settings);
  current.current = settings;

  useEffect(() => {
    let active = true;
    void storage.loadSettings().then((read) => {
      if (!active) return;
      // Settings that cannot be read are the defaults; there is nothing to
      // tell anyone about, since every one of them shows itself on its screen.
      const stored = valueOf(read);
      if (stored) setSettings(stored);
      setReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const update = useCallback((change: Partial<Omit<Settings, 'version'>>) => {
    const next = { ...current.current, ...change };
    current.current = next;
    setSettings(next);
    void storage.saveSettings(next);
  }, []);

  return { settings, ready, update };
}
