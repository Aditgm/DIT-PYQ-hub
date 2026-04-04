import React, { useState, useRef, useCallback, useEffect } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const TiltCard = ({ 
  children, 
  className = '', 
  tiltEnabled = true,
  tiltIntensity = 1,
  perspective = 1000,
  hoverScale = 1.02
}) => {
  const [transform, setTransform] = useState({
    rotateX: 0,
    rotateY: 0,
    scale: 1
  })
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)
  const prefersReducedMotion = useReducedMotion()

  const handleMouseMove = useCallback((e) => {
    if (!tiltEnabled || !cardRef.current || prefersReducedMotion) return

    const card = cardRef.current
    const rect = card.getBoundingClientRect()
    
    // Calculate mouse position relative to card center
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    
    // Calculate distance from center (normalized to -0.5 to 0.5)
    const mouseX = (e.clientX - centerX) / (rect.width / 2)
    const mouseY = (e.clientY - centerY) / (rect.height / 2)
    
    // Apply tilt intensity (max rotation of ~15 degrees)
    const maxRotation = 15 * tiltIntensity
    const rotateY = mouseX * maxRotation // Rotate around Y axis (horizontal movement)
    const rotateX = -mouseY * maxRotation // Rotate around X axis (vertical movement)

    setTransform({
      rotateX,
      rotateY,
      scale: hoverScale
    })
  }, [tiltEnabled, tiltIntensity, hoverScale, prefersReducedMotion])

  const handleMouseEnter = () => {
    setIsHovered(true)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    // Reset transform with smooth transition
    setTransform({
      rotateX: 0,
      rotateY: 0,
      scale: 1
    })
  }

  // Build transform string with hardware acceleration
  const transformStyle = {
    transform: `
      perspective(${perspective}px)
      translateZ(0)
      rotateX(${transform.rotateX}deg)
      rotateY(${transform.rotateY}deg)
      scale(${transform.scale})
    `,
    transformStyle: 'preserve-3d',
  }

  const motionProps = prefersReducedMotion ? {} : {
    whileHover: { scale: hoverScale, y: -2 },
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 20,
      mass: 0.8
    }
  }

  return (
    <motion.div
      ref={cardRef}
      className={`tilt-card-container ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={transformStyle}
      {...motionProps}
    >
      {children}
    </motion.div>
  )
}

export default TiltCard
