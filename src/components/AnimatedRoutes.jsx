import React from 'react'
import { Routes, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

const pageVariants = {
  initial: { 
    opacity: 0, 
    x: 20,
  },
  animate: { 
    opacity: 1, 
    x: 0,
  },
  exit: { 
    opacity: 0, 
    x: -20,
  },
}

const pageTransition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

const reducedMotionVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const AnimatedRoutes = ({ children }) => {
  const location = useLocation()
  
  const prefersReducedMotion = React.useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const variants = prefersReducedMotion ? reducedMotionVariants : pageVariants
  const transition = prefersReducedMotion ? { duration: 0.15 } : pageTransition

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={transition}
        style={{ width: '100%' }}
      >
        <Routes location={location}>
          {children}
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default AnimatedRoutes
