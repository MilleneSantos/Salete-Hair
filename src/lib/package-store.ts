export type PackageItem = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

const STORAGE_KEY = "salete_package_v1";

const isBrowser = () => typeof window !== "undefined";

export function readPackageItems(): PackageItem[] {
  if (!isBrowser()) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        id: String(item.id),
        name: typeof item.name === "string" ? item.name : null,
        duration_minutes:
          typeof item.duration_minutes === "number"
            ? item.duration_minutes
            : null,
      }));
  } catch {
    return [];
  }
}

export function writePackageItems(items: PackageItem[]) {
  if (!isBrowser()) {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("package:change"));
}
