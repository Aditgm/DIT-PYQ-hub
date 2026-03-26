import React, { useRef, useEffect, useState } from 'react'
import * as THREE from 'three'

const ColorTrail = ({ subjects = [], selectedTile = null, hoveredColorScheme = 'primary' }) => {
  const containerRef = useRef(null)
  const mouseX = useRef(0)
  const mouseY = useRef(0)
  const rendererRef = useRef(null)
  const sceneRef = useRef(null)
  const cameraRef = useRef(null)
  const particlesRef = useRef([])
  const animationRef = useRef(null)
  const currentColorRef = useRef('#6dddff')
  // Use refs to track state for animation loop - these update without re-render
  const selectedTileRef = useRef(selectedTile)
  const hoveredColorSchemeRef = useRef(hoveredColorScheme)
  const [isDesktop, setIsDesktop] = useState(false)
  
  // Update refs when props change
  if (selectedTile !== selectedTileRef.current) {
    selectedTileRef.current = selectedTile
  }
  if (hoveredColorScheme !== hoveredColorSchemeRef.current) {
    hoveredColorSchemeRef.current = hoveredColorScheme
  }

  useEffect(() => {
    const checkDesktop = () => {
      const desktop = window.innerWidth >= 1024
      setIsDesktop(desktop)
    }
    checkDesktop()
    window.addEventListener('resize', checkDesktop)
    return () => window.removeEventListener('resize', checkDesktop)
  }, [])

  // Color scheme mapping
  const colorSchemes = {
    primary: '#6dddff',     // Cyan - default
    secondary: '#d674ff',   // Purple
    tertiary: '#82a3ff',    // Blue
    success: '#22c55e',     // Green
    warning: '#f97316',     // Orange
    pink: '#ec4899',        // Pink
  }

  // Extended tile colors for all subjects
  const tileColorMap = {
    'Engineering Math - I': '#6dddff',
    'Engineering Math - II': '#d674ff',
    'Data Structures': '#ec4899',
    'Digital Electronics': '#22c55e',
    'Operating Systems': '#f97316',
    'Database Management': '#82a3ff',
    'Computer Networks': '#6dddff',
    'Deep Learning': '#d674ff',
    'Machine Learning': '#22c55e',
    'Advanced Java Programming': '#f97316',
  }

  // Get color based on hover or selection - uses refs for real-time updates
  const getTrailColor = () => {
    const currentSelected = selectedTileRef.current
    const currentScheme = hoveredColorSchemeRef.current
    
    // If a tile is selected, use its color
    if (currentSelected) {
      const tileColor = tileColorMap[currentSelected]
      if (tileColor) {
        currentColorRef.current = tileColor
        return tileColor
      }
    }
    // Use hovered color scheme (default cyan)
    const color = colorSchemes[currentScheme] || colorSchemes.primary
    currentColorRef.current = color
    return color
  }

  useEffect(() => {
    if (!isDesktop || !containerRef.current) return

    const container = containerRef.current
    const width = window.innerWidth
    const height = window.innerHeight

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera - orthographic for 2D-like effect
    const camera = new THREE.OrthographicCamera(
      width / -2, width / 2,
      height / 2, height / -2,
      0.1, 1000
    )
    camera.position.z = 100
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    })
    renderer.setSize(width, height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    // Particle array
    const particles = []
    particlesRef.current = particles

    // Shared geometry and material - created once, reused for all particles
    const sharedGeometry = new THREE.CircleGeometry(2, 8)
    const sharedMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color(currentColorRef.current),
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })

    // Create particle function - uses shared geometry and material
    const createParticle = (x, y) => {
      const color = currentColorRef.current
      // Small, subtle particles
      const size = 2 + Math.random() * 1.5
      const life = 1.0
      const decay = 0.02 + Math.random() * 0.01
      
      // Update shared material color
      sharedMaterial.color.set(color)
      
      const mesh = new THREE.Mesh(sharedGeometry, sharedMaterial)
      mesh.position.set(x, y, 0)
      mesh.scale.setScalar(size / 2) // Scale based on desired size
      scene.add(mesh)
      
      return { mesh, life, decay, size }
    }

    // Mouse move handler - attached to window
    const handleMouseMove = (event) => {
      // Convert to center-origin coordinates matching orthographic camera
      mouseX.current = event.clientX - width / 2
      mouseY.current = -(event.clientY - height / 2)
    }

    window.addEventListener('mousemove', handleMouseMove)

    // Animation
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate)
      
      // Update current color based on hover state
      getTrailColor()

      // Spawn particles - subtle, minimal count
      if (mouseX.current !== 0 || mouseY.current !== 0) {
        for (let i = 0; i < 1; i++) {
          const offsetX = (Math.random() - 0.5) * 8
          const offsetY = (Math.random() - 0.5) * 8
          const particle = createParticle(
            mouseX.current + offsetX,
            mouseY.current + offsetY
          )
          particles.push(particle)
        }
      }

      // Update particles - subtle fade
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= p.decay
        // Subtle opacity - update shared material
        sharedMaterial.opacity = p.life * 0.35
        p.mesh.scale.setScalar(p.life * (p.size / 2))
        
        if (p.life <= 0) {
          scene.remove(p.mesh)
          particles.splice(i, 1)
        }
      }

      // Limit particle count for subtle effect
      while (particles.length > 80) {
        const p = particles[0]
        scene.remove(p.mesh)
        particles.shift()
      }

      renderer.render(scene, camera)
    }
    animate()

    // Resize handler
    const handleResize = () => {
      const w = window.innerWidth
      const h = window.innerHeight
      
      camera.left = w / -2
      camera.right = w / 2
      camera.top = h / 2
      camera.bottom = h / -2
      camera.updateProjectionMatrix()
      
      renderer.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationRef.current)
      
      particles.forEach(p => {
        scene.remove(p.mesh)
      })
      
      // Dispose shared resources
      sharedGeometry.dispose()
      sharedMaterial.dispose()
      
      renderer.dispose()
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement)
      }
    }
  }, [isDesktop])

  if (!isDesktop) return null

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-30"
    />
  )
}

export default ColorTrail
