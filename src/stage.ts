import type { CoverId } from './data'

// Mutable scene state. GSAP writes it (the scroll timeline, the nav jump, the play sequence), the R3F frame loop
// reads it. Plain objects (not React state) so scrolling never re-renders React.
export const stage = {
  turn: 0, // 0 = looking down at the desk top, 1 = facing the drawers
  shift: 0, // 1 while a drawer chapter is on screen: desk slides aside for the panel
  outro: 0, // 1 at the contact section
  drawers: [0, 1, 2].map(() => ({ open: 0, rise: 0 })),
  hover: '', // id of the record or drawer under the pointer
  lamp: 1, // desk lamp brightness; the intro flickers it on
  play: 0, // 1 = camera focused on the turntable while a record is put on
  deck: { id: '' as CoverId | '', drop: 0, arm: 0 }, // record on the turntable; drop 0→1 flies it onto the platter
}
