import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { publicEnvironment } from "./environment";
import { EMPTY_KANJI_NOTEBOOK, parseKanjiNotebook, type KanjiNotebook } from "./kanji-study";

/** The containing library is keyed by account, so an account switch gets a fresh notebook. */
export function useKanjiNotebook(owner: string) {
  const key = `kanji-notebook:v1:${publicEnvironment.appEnv}:${publicEnvironment.supabaseUrl}:${owner}`;
  const [notebook, setNotebook] = useState(EMPTY_KANJI_NOTEBOOK);
  const current = useRef(notebook);
  const writes = useRef(Promise.resolve());
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    let active = true;
    void AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return;
        current.current = parseKanjiNotebook(raw ? JSON.parse(raw) : null);
        setNotebook(current.current);
      })
      .catch(() => {
        if (active) setSaveError(true);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [key]);

  function update(patch: Partial<KanjiNotebook>) {
    if (!ready) return;
    const next = { ...current.current, ...patch };
    current.current = next;
    setNotebook(next);
    writes.current = writes.current
      .then(() => AsyncStorage.setItem(key, JSON.stringify(next)))
      .then(() => {
        if (alive.current) setSaveError(false);
      })
      .catch(() => {
        if (alive.current) setSaveError(true);
      });
  }
  function toggleSaved(id: number) {
    const ids = current.current.saved;
    update({ saved: ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id] });
  }
  function setFamiliar(id: number, familiar: boolean) {
    const ids = current.current.familiar.filter((value) => value !== id);
    update({ familiar: familiar ? [...ids, id] : ids });
  }
  return { notebook, ready, saveError, update, toggleSaved, setFamiliar };
}
