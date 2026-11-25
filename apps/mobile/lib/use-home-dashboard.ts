import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { useFocusEffect } from "expo-router";
import { supabase } from "./supabase";
import { captureException } from "./monitoring";
import { isOfflineError } from "./connectivity";
import { readCache, writeCache } from "./offline-cache";
import {
  homeCacheKey,
  loadHomeSnapshot,
  parseHomeSnapshot,
  type HomeSnapshot,
} from "./home-loader";
import { parseStudyMinutes, type StudyMinutes } from "./home-study";
import { loadKanji, rememberedKanji, type KanjiLoad } from "./kanji-loader";

/** The page is keyed by account; requests are also cancelled on blur and refresh. */
export function useHomeDashboard(userId: string | undefined) {
  const [snapshot, setSnapshot] = useState<HomeSnapshot | null>(null);
  const [savedAt, setSavedAt] = useState(0);
  const latestSavedAt = useRef(0);
  const [failed, setFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(!!userId);
  const [now, setNow] = useState(() => new Date());
  const [kanji, setKanji] = useState<KanjiLoad>(
    () => rememberedKanji() ?? { data: [], savedAt: 0, refreshing: true, error: false }
  );
  const request = useRef<AbortController | null>(null);
  const lastDay = useRef(now.toISOString().slice(0, 10));
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const date = new Date();
    lastDay.current = date.toISOString().slice(0, 10);
    setNow(date);
    setRefreshing(true);
    setFailed(false);
    const content = loadKanji(setKanji, controller.signal);
    let finished = false;
    const cached = userId
      ? readCache<unknown>(homeCacheKey(userId)).then((value) => {
          if (
            !value ||
            finished ||
            controller.signal.aborted ||
            value.savedAt < latestSavedAt.current
          )
            return;
          const parsed = parseHomeSnapshot(value.data, userId);
          if (parsed) {
            latestSavedAt.current = value.savedAt;
            setSnapshot(parsed);
            setSavedAt(value.savedAt);
          }
        })
      : Promise.resolve();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    try {
      if (userId) {
        const result = await loadHomeSnapshot(supabase, userId, date, controller.signal);
        if (controller.signal.aborted) return;
        finished = true;
        setSnapshot(result);
        latestSavedAt.current = Date.now();
        setSavedAt(latestSavedAt.current);
        void writeCache(homeCacheKey(userId), result);
      }
    } catch (error) {
      await cached;
      if (request.current !== controller) return;
      setFailed(true);
      if (!isOfflineError(error)) captureException(error, { screen: "home" });
    } finally {
      clearTimeout(timeout);
      finished = true;
      await content;
      if (request.current === controller) setRefreshing(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      const appState = AppState.addEventListener("change", (state) => {
        if (state === "active") void refresh();
      });
      const clock = setInterval(() => {
        if (AppState.currentState !== "active") return;
        const date = new Date();
        setNow(date);
        if (date.toISOString().slice(0, 10) !== lastDay.current) void refresh();
      }, 60_000);
      return () => {
        request.current?.abort();
        request.current = null;
        appState.remove();
        clearInterval(clock);
      };
    }, [refresh])
  );
  return { snapshot, savedAt, failed, refreshing, now, kanji, refresh };
}

export function useStudyMinutes(owner: string) {
  const [minutes, setMinutes] = useState<StudyMinutes>(10);
  const [ready, setReady] = useState(false);
  const key = `home-study-minutes:v1:${owner}`;
  useEffect(() => {
    let active = true;
    void readCache<unknown>(key).then((value) => {
      if (active) {
        setMinutes(parseStudyMinutes(value?.data));
        setReady(true);
      }
    });
    return () => {
      active = false;
    };
  }, [key]);
  const chooseMinutes = (value: StudyMinutes) => {
    if (!ready) return;
    setMinutes(value);
    void writeCache(key, value);
  };
  return { minutes, ready, chooseMinutes };
}
