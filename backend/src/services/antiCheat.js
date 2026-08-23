/**
 * Anti-Cheat & Validation Service for Key-Sprint Races
 * Verifies player metrics on the server against elapsed time and physical typing limits.
 */

const MAX_REALISTIC_WPM = 350;

export function sanitizeProgressInput({
  progress = 0,
  wpm = 0,
  accuracy = 100,
  roomStartedAt = null,
  previousProgress = 0,
  passageLength = 100
}) {
  const now = Date.now();
  const rawProgress = Math.max(0, Math.min(100, Number(progress) || 0));
  const rawAccuracy = Math.max(0, Math.min(100, Math.round(Number(accuracy) || 100)));
  let rawWpm = Math.max(0, Math.min(MAX_REALISTIC_WPM, Math.round(Number(wpm) || 0)));

  // If race hasn't officially started, progress must be 0
  if (!roomStartedAt || now < roomStartedAt) {
    return {
      progress: 0,
      wpm: 0,
      accuracy: 100,
      isValid: true
    };
  }

  const elapsedMs = Math.max(50, now - roomStartedAt);
  const elapsedMinutes = elapsedMs / 60000;
  const estimatedCharsTyped = (rawProgress / 100) * passageLength;

  // Calculate realistic server-computed WPM based on server clock
  const serverCalculatedWpm = Math.round((estimatedCharsTyped / 5) / elapsedMinutes);

  // If client provided a reasonable WPM, use the sanitized client value; otherwise use server calculation
  if (rawWpm === 0 || Math.abs(rawWpm - serverCalculatedWpm) > 60) {
    rawWpm = Math.min(MAX_REALISTIC_WPM, Math.max(0, serverCalculatedWpm));
  }

  return {
    progress: rawProgress,
    wpm: rawWpm,
    accuracy: rawAccuracy,
    isValid: true
  };
}
