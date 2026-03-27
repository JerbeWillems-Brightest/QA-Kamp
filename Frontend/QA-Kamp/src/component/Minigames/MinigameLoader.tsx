import React from 'react'

const Lazy = React.lazy(() => import('./MinigamePage').then(mod => {
  const m = mod as unknown as { default?: React.ComponentType<any>; MinigamePage?: React.ComponentType<any> }
  return { default: m.default || m.MinigamePage as React.ComponentType<any> }
}))

export default function MinigameLoader() {
  return (
    <React.Suspense fallback={<div style={{ padding: 20 }}>Laden...</div>}>
      <Lazy />
    </React.Suspense>
  )
}

