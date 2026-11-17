/* Yawmi focus clock: pure elapsed-time calculation shared by web and native builds.
   Classic script on purpose: existing site has no frontend bundler yet. No storage,
   DOM manipulation, timers or Supabase side effects are allowed in this module. */
(function initYawmiFocusClock(host) {
  'use strict';

  function remainingFromDeadline(deadline, now = Date.now()) {
    // Corrupt persisted timestamps must not keep a timer running forever.
    if (!Number.isFinite(deadline) || !Number.isFinite(now)) return 0;
    return Math.max(0, Math.ceil((deadline - now) / 1000));
  }

  host.YawmiFocusClock = Object.freeze({ remainingFromDeadline });
})(typeof window !== 'undefined' ? window : globalThis);
