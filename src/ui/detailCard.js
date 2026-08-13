import { initials } from './icons.js'

const STAT_ROWS = [
  { key: 'hitting', label: 'Hitting' },
  { key: 'baserunning', label: 'Baserunning' },
  { key: 'defense', label: 'Defense' },
  { key: 'armStrength', label: 'Arm Strength' },
]

export function renderDetailCard(pad) {
  const statsKnown = Boolean(pad.stats)
  const positionLine = pad.jerseyNumber
    ? `#${pad.jerseyNumber} • ${pad.position ?? 'POSITION TBD'}`
    : pad.position ?? 'POSITION TBD'

  const statBars = STAT_ROWS.map(({ key, label }) => {
    const value = pad.stats?.[key] ?? 0
    return `
      <div class="detail-stat">
        <div class="detail-stat__track">
          <div class="detail-stat__fill" style="width:${value}%"></div>
          <span class="detail-stat__label">${label}</span>
        </div>
      </div>
    `
  }).join('')

  const photoMarkup = pad.detailPhoto
    ? `
      <div class="detail-photo">
        <div class="detail-photo__wash" style="background-image:url('${pad.detailPhoto}')"></div>
        <img class="detail-photo__cutout" src="${pad.detailPhoto}" alt="" />
      </div>
    `
    : `
      <div class="detail-photo detail-photo--placeholder">
        <span class="detail-photo__initials">${initials(pad.label)}</span>
        <span class="detail-photo__soon">PHOTO COMING SOON</span>
      </div>
    `

  return `
    <div class="detail-card__body">
      <div class="detail-card__info">
        <h2 class="detail-card__name">${pad.label}</h2>
        <p class="detail-card__position">${positionLine}</p>
        <div class="detail-card__stats">${statBars}</div>
        ${statsKnown ? '' : '<p class="detail-card__stats-note">Full stat line coming soon.</p>'}
      </div>
      ${photoMarkup}
    </div>
  `
}
