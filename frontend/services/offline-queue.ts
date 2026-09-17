export type QueuedMutation = {
  id: string;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: string;
  createdAt: number;
  attempts: number;
};

const KEY = "vibe.offline.queue";

function readQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

function writeQueue(items: QueuedMutation[]) {
  if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueueMutation(path: string, method: QueuedMutation["method"], body?: unknown) {
  const item: QueuedMutation = {
    id: crypto.randomUUID(),
    path,
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    createdAt: Date.now(),
    attempts: 0,
  };
  writeQueue([...readQueue(), item]);
  return item.id;
}

export function queuedMutationCount() {
  return readQueue().length;
}

export async function flushOfflineQueue(send: (item: QueuedMutation) => Promise<void>) {
  const queue = readQueue();
  const remaining: QueuedMutation[] = [];
  for (const item of queue) {
    try {
      await send(item);
    } catch {
      remaining.push({ ...item, attempts: item.attempts + 1 });
    }
  }
  writeQueue(remaining);
  return { sent: queue.length - remaining.length, remaining: remaining.length };
}

export function installOfflineRetry(send: (item: QueuedMutation) => Promise<void>) {
  if (typeof window === "undefined") return () => {};
  const run = () => void flushOfflineQueue(send);
  window.addEventListener("online", run);
  return () => window.removeEventListener("online", run);
}
