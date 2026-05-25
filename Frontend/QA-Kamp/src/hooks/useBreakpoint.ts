// Simple responsive breakpoint hook used by MinigamePage / layout decisions
import { useEffect, useState } from 'react'

export function useBreakpoint() {
  const isClient = typeof window !== 'undefined'
  const [width, setWidth] = useState<number>(isClient ? window.innerWidth : 1200)
  useEffect(() => {
    function onResize() { setWidth(window.innerWidth) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width <= 1024,
    isDesktop: width > 1024,
  }
}

export default useBreakpoint

