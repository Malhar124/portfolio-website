import { lazy, StrictMode, Suspense, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Plain from './Plain'
import './styles.css'

// The 3D tour loads only when it's shown, so the one-page version (#plain) stays light.
const App = lazy(() => import('./App'))

function Root() {
  const [plain, setPlain] = useState(location.hash === '#plain')
  useEffect(() => {
    const onHash = () => {
      setPlain(location.hash === '#plain')
      scrollTo(0, 0)
    }
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])
  return plain ? (
    <Plain />
  ) : (
    <Suspense>
      <App />
    </Suspense>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
