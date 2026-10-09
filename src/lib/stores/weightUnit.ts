import { browser } from "$app/environment";
import { writable } from "svelte/store";

export type WeightUnit = "kg" | "lbs";

const STORAGE_KEY = "weight-unit";
const initialUnit: WeightUnit = browser && localStorage.getItem(STORAGE_KEY) === "lbs" ? "lbs" : "kg";

export const weightUnit = writable<WeightUnit>(initialUnit);

if (browser) {
  weightUnit.subscribe((unit) => localStorage.setItem(STORAGE_KEY, unit));
}

export function toggleWeightUnit() {
  weightUnit.update((unit) => unit === "kg" ? "lbs" : "kg");
}

export function setWeightUnit(unit: WeightUnit) {
  weightUnit.set(unit);
}

export function kgToDisplayWeight(weightKg: number, unit: WeightUnit): number {
  return unit === "lbs" ? weightKg * 2.2046226218 : weightKg;
}

export function displayWeightToKg(weight: number, unit: WeightUnit): number {
  return unit === "lbs" ? weight / 2.2046226218 : weight;
}

export function formatWeight(weightKg: number, unit: WeightUnit, decimals = 1): string {
  return kgToDisplayWeight(weightKg, unit).toFixed(decimals);
}
