import { useEffect } from "react";
import { BackHandler } from "react-native";

/**
 * Runs `onBack` when the Android hardware back button is pressed, while
 * `active` is true.
 *
 * Screens that swap between a list and a detail view using local state — rather
 * than by pushing a route — are invisible to the navigator, so Android's back
 * button skips straight past the detail view and leaves the screen. Calling this
 * from such a screen makes back return to the list, which is what users expect.
 *
 * Returning true from the listener marks the press as handled and stops the
 * navigator from also acting on it.
 */
export function useAndroidBack(active: boolean, onBack: () => void) {
  useEffect(() => {
    if (!active) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onBack();
      return true;
    });

    return () => subscription.remove();
  }, [active, onBack]);
}
