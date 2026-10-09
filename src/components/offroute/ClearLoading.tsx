"use client";

import { useEffect } from "react";
import { launched } from "@/lib/stores";

/** Pages without the launch loader (the 404) release the loading gate the root layout sets. */
export function ClearLoading() {
  useEffect(() => {
    document.documentElement.removeAttribute("data-loading");
    launched.set(true);
  }, []);
  return null;
}
