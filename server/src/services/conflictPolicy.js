/**
 * Last-write-wins ordering:
 * 1. Later clientTimestamp wins.
 * 2. If timestamps are equal, lexicographically larger deviceId wins.
 *
 * The tie-break makes the decision deterministic. It does not correct
 * inaccurate clocks; that limitation is documented for the challenge.
 */
export function compareChanges(incoming, current) {
  const incomingTime = Date.parse(incoming.clientTimestamp);
  const currentTime = Date.parse(current.updatedAt);

  if (!Number.isFinite(incomingTime) || !Number.isFinite(currentTime)) {
    throw new Error("Invalid change timestamp.");
  }

  if (incomingTime !== currentTime) {
    return incomingTime > currentTime ? 1 : -1;
  }

  if (incoming.deviceId === current.deviceId) return 0;
  return incoming.deviceId > current.deviceId ? 1 : -1;
}
