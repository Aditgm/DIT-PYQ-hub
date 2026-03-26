import React, { useState, useEffect, useRef } from 'react'

const AnimatedCounter = ({ end, duration = 2000, suffix = '', value = null }) => {
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef(null)

  // Always call hooks - handle value prop case inside effects
  useEffect(() => {
    // If value is provided directly, skip animation
    if (value !== null) {
      setCount(value)
      return
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  useEffect(() => {
    if (value !== null || !isVisible) return
    let startTime
    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * end))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isVisible, end, duration, value])

  return <span ref={ref}>{count}{suffix}</span>
}

export default AnimatedCounter
