import { useSyncExternalStore } from "react";

/**
 * The moment the launch sheet starts lifting (before `launched` flips at the end of the wipe).
 * The hero uses it to start the camera drive, so the sheet rises off a landscape already moving.
 */
type Listener = () => void;

let exiting = false;
const listeners = new Set<Listener>();

export const launchExit = {
  get: () => exiting,
  set(next: boolean) {
    if (next === exiting) return;
    exiting = next;
    listeners.forEach((l) => l());
  },
  subscribe(l: Listener) {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
};

export function useLaunchExiting() {
  return useSyncExternalStore(launchExit.subscribe, launchExit.get, () => false);
}
