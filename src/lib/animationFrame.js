/**
 * Run `task` with requestAnimationFrame falling back to timers while the page
 * is hidden. Libraries like html-to-image wait on rAF, which browsers pause in
 * background tabs — without this, exports started there never finish.
 */
export async function withFrameFallback(task) {
  const original = window.requestAnimationFrame
  if (document.visibilityState === 'hidden') window.requestAnimationFrame = (callback) => setTimeout(() => callback(performance.now()), 0)
  try {
    return await task()
  } finally {
    window.requestAnimationFrame = original
  }
}
