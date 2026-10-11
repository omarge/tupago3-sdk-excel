// Office requirement-set detection (gate G10 / T03). Mock-friendly for unit tests.
export const MIN_EXCEL_API = "1.1";

export function isExcelApiSupported(minVersion: string = MIN_EXCEL_API): boolean {
  try {
    const office = (globalThis as any).Office;
    if (!office || !office.context?.requirements?.isSetSupported) return false;
    return !!office.context.requirements.isSetSupported("ExcelApi", minVersion);
  } catch {
    return false;
  }
}

export function officeReady(): Promise<void> {
  return new Promise((resolve) => {
    const office = (globalThis as any).Office;
    if (!office || typeof office.onReady !== "function") {
      resolve();
      return;
    }
    office.onReady(() => resolve());
  });
}

export function getOfficeHost(): string | null {
  try {
    const office = (globalThis as any).Office;
    return office?.context?.host ?? null;
  } catch {
    return null;
  }
}
