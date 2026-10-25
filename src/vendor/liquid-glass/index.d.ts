export class Container {
  static pageSnapshot: HTMLCanvasElement | null
  static fixedSnapshot: boolean
  constructor(options?: { borderRadius?: number; type?: 'rounded' | 'circle' | 'pill'; tintOpacity?: number })
  element: HTMLDivElement
  render?: () => void
  updateSizeFromDOM(): void
  destroy(): void
}
export class Button extends Container {
  constructor(options: {
    text: string
    size?: number
    type?: 'rounded' | 'circle' | 'pill'
    onClick?: (text: string) => void
    warp?: boolean
    tintOpacity?: number
  })
  static measureText(text: string, fontSize: number): TextMetrics
}
