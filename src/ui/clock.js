// 12-hour, no AM/PM — games are always in the evening, so the period
// suffix is dead weight rather than useful info.
export function startClock(el) {
  const render = () => {
    const now = new Date()
    const hours = now.getHours() % 12 || 12
    const minutes = String(now.getMinutes()).padStart(2, '0')

    // Wrapped as one span so the whole string is a single flex item —
    // centers as a unit and stays centered as digit count changes
    // ("1:05" vs "12:59") instead of drifting off one side.
    const colon = now.getSeconds() % 2 === 0 ? ':' : ' '
    el.innerHTML = `<span class="clock__time">${hours}<span class="clock__colon">${colon}</span>${minutes}</span>`
  }

  render()
  const intervalId = setInterval(render, 1000)
  return () => clearInterval(intervalId)
}
