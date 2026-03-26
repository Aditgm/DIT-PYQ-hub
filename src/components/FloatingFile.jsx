import React, { useState } from 'react'
import { FileText } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

const FloatingFile = ({ name, delay, position, animationType = 'float', colorScheme, onSelect, onHover }) => {
  const { theme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)

  const handleMouseEnter = () => {
    setIsHovered(true)
    if (onHover) onHover(colorScheme)
  }

  const handleMouseLeave = () => {
    setIsHovered(false)
    if (onHover) onHover(null)
  }
  
  const colors = {
    primary: { bg: theme === 'light' ? 'bg-cyan-500/10' : 'bg-cyan-500/20', border: theme === 'light' ? 'border-cyan-500/15' : 'border-cyan-500/30', text: theme === 'light' ? 'text-cyan-600' : 'text-cyan-400', glow: theme === 'light' ? 'shadow-cyan-500/20' : 'shadow-cyan-500/30', icon: theme === 'light' ? 'text-cyan-600' : 'text-cyan-400', gradient: theme === 'light' ? 'from-cyan-500/15' : 'from-cyan-500/30' },
    secondary: { bg: theme === 'light' ? 'bg-purple-500/10' : 'bg-purple-500/20', border: theme === 'light' ? 'border-purple-500/15' : 'border-purple-500/30', text: theme === 'light' ? 'text-purple-600' : 'text-purple-400', glow: theme === 'light' ? 'shadow-purple-500/20' : 'shadow-purple-500/30', icon: theme === 'light' ? 'text-purple-600' : 'text-purple-400', gradient: theme === 'light' ? 'from-purple-500/15' : 'from-purple-500/30' },
    tertiary: { bg: theme === 'light' ? 'bg-blue-500/10' : 'bg-blue-500/20', border: theme === 'light' ? 'border-blue-500/15' : 'border-blue-500/30', text: theme === 'light' ? 'text-blue-600' : 'text-blue-400', glow: theme === 'light' ? 'shadow-blue-500/20' : 'shadow-blue-500/30', icon: theme === 'light' ? 'text-blue-600' : 'text-blue-400', gradient: theme === 'light' ? 'from-blue-500/15' : 'from-blue-500/30' },
    success: { bg: theme === 'light' ? 'bg-green-500/10' : 'bg-green-500/20', border: theme === 'light' ? 'border-green-500/15' : 'border-green-500/30', text: theme === 'light' ? 'text-green-600' : 'text-green-400', glow: theme === 'light' ? 'shadow-green-500/20' : 'shadow-green-500/30', icon: theme === 'light' ? 'text-green-600' : 'text-green-400', gradient: theme === 'light' ? 'from-green-500/15' : 'from-green-500/30' },
    warning: { bg: theme === 'light' ? 'bg-orange-500/10' : 'bg-orange-500/20', border: theme === 'light' ? 'border-orange-500/15' : 'border-orange-500/30', text: theme === 'light' ? 'text-orange-600' : 'text-orange-400', glow: theme === 'light' ? 'shadow-orange-500/20' : 'shadow-orange-500/30', icon: theme === 'light' ? 'text-orange-600' : 'text-orange-400', gradient: theme === 'light' ? 'from-orange-500/15' : 'from-orange-500/30' },
    pink: { bg: theme === 'light' ? 'bg-pink-500/10' : 'bg-pink-500/20', border: theme === 'light' ? 'border-pink-500/15' : 'border-pink-500/30', text: theme === 'light' ? 'text-pink-600' : 'text-pink-400', glow: theme === 'light' ? 'shadow-pink-500/20' : 'shadow-pink-500/30', icon: theme === 'light' ? 'text-pink-600' : 'text-pink-400', gradient: theme === 'light' ? 'from-pink-500/15' : 'from-pink-500/30' },
  }
  
  const c = colors[colorScheme] || colors.primary
  
  const animations = {
    float: 'animate-floating',
    floatReverse: 'animate-floating-reverse',
    floatDiagonal: 'animate-floating-diagonal',
    floatPulse: 'animate-floating-pulse',
    floatRotate: 'animate-floating-rotate',
  }

  const handleClick = () => {
    setIsClicked(true)
    if (onSelect) onSelect(name)
    setTimeout(() => setIsClicked(false), 200)
  }
  
  return ( 
    <div 
      className={`absolute flex items-center gap-3 ${c.bg} backdrop-blur-md rounded-2xl px-5 py-4 cursor-pointer 
        transition-all duration-300 ${animations[animationType]} ${c.border}
        hover:scale-110 hover:shadow-lg ${c.glow}
        ${isHovered ? 'ring-2 ring-white/30' : ''}
        ${isClicked ? 'scale-95' : ''}`}
      style={{ 
        animationDelay: delay,
        left: position.left,
        right: position.right,
        top: position.top,
        bottom: position.bottom,
        zIndex: isHovered ? 50 : 10,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className={`relative w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center overflow-hidden
        ${isHovered ? 'scale-110' : ''} transition-transform duration-300`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient} opacity-0 ${isHovered ? 'opacity-100' : ''} transition-opacity duration-300`} />
        <FileText className={`w-6 h-6 ${c.icon} relative z-10`} />
      </div>
      <div className="flex flex-col">
        <span className={`font-semibold ${c.text} whitespace-nowrap text-sm`}>{name}</span>
        {isHovered && (
          <span className={`text-xs ${c.text} opacity-70 flex items-center gap-1 mt-0.5`}>
            Click to view
          </span>
        )}
      </div>
    </div>
  )
}

export default FloatingFile
