export type ApiOptions = RequestInit & { token?: string };

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
let resetInProgress = false;

async function hardResetClientSession(): Promise<void> {
  if (resetInProgress || typeof window === "undefined") return;
  resetInProgress = true;

  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {}

  try {
    if ("caches" in window) {
      const names = await caches.keys();
      await Promise.all(names.map(name => caches.delete(name)));
    }
  } catch {}

  try {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
  } catch {}

  try {
    const databases = (indexedDB as IDBFactory & {
      databases?: () => Promise<IDBDatabaseInfo[]>;
    }).databases;
    if (databases) {
      const entries = await databases.call(indexedDB);
      await Promise.all(
        entries
          .map(entry => entry.name)
          .filter((name): name is string => Boolean(name))
          .map(name => new Promise<void>(resolve => {
            const request = indexedDB.deleteDatabase(name);
            request.onsuccess = request.onerror = request.onblocked = () => resolve();
          })),
      );
    }
  } catch {}

  window.location.replace("/");
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (options.token) headers.set("Authorization", "Bearer " + options.token);

  const response = await fetch(baseUrl + path, { ...options, headers, cache: "no-store" });

  if (!response.ok) {
    let detail = "Erreur API";
    try {
      const body = await response.json();
      detail = body.detail ?? detail;
    } catch {}

    if (response.status === 401) {
      await hardResetClientSession();
    }

    const error = new Error(detail) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}
