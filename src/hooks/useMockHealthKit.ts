/**
 * useMockHealthKit — emits a fresh LiveVitals snapshot every few seconds
 * so the dashboard feels live during demo. Will be replaced by real
 * HealthKit reads in a later phase.
 */

import { useEffect, useState } from "react";
import { generateLiveVitals } from "@/lib/mock-data";
import { LiveVitals } from "@/types";

const REFRESH_MS = 8000;

export function useMockHealthKit(): LiveVitals {
  const [vitals, setVitals] = useState<LiveVitals>(generateLiveVitals);

  useEffect(() => {
    const id = setInterval(() => {
      setVitals(generateLiveVitals());
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, []);

  return vitals;
}
