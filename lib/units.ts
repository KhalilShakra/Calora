export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const total = Math.max(0, cm) / 2.54;
  const ft = Math.floor(total / 12);
  const inch = Math.round(total - ft * 12);
  if (inch === 12) return { ft: ft + 1, inch: 0 };
  return { ft, inch };
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function lbToKg(lb: number): number {
  return Math.round((lb / 2.20462) * 10) / 10;
}
