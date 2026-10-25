declare module 'vanta/src/vanta.fog.js' {
  const FOG: (options: Record<string, unknown>) => { destroy(): void }
  export default FOG
}

declare module 'album-art' {
  const albumArt: (artist: string, options?: { album?: string; size?: 'small' | 'medium' | 'large' }) => Promise<string>
  export default albumArt
}
