import React from 'react'
import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

// Deterministic hash function to generate consistent paper count from subject name
const getPaperCount = (subjectName) => {
  let hash = 0
  for (let i = 0; i < subjectName.length; i++) {
    const char = subjectName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  // Transform hash to a positive number between 20-70
  return Math.abs(hash) % 51 + 20
}

const SubjectCard = ({ subject, paperCount, index, onHover }) => {
  const { theme } = useTheme()
  const isLight = theme === 'light'
  
  const colors = [
    { 
      bg: isLight ? 'from-cyan-500/10 to-blue-500/10' : 'from-cyan-500/20 to-blue-500/20',
      border: isLight ? 'border-cyan-500/20' : 'border-cyan-500/30', 
      icon: 'text-cyan-400', 
      glow: isLight ? 'hover:shadow-cyan-500/10' : 'hover:shadow-cyan-500/20', 
      scheme: 'primary' 
    },
    { 
      bg: isLight ? 'from-purple-500/10 to-pink-500/10' : 'from-purple-500/20 to-pink-500/20',
      border: isLight ? 'border-purple-500/20' : 'border-purple-500/30', 
      icon: 'text-purple-400', 
      glow: isLight ? 'hover:shadow-purple-500/10' : 'hover:shadow-purple-500/20', 
      scheme: 'secondary' 
    },
    { 
      bg: isLight ? 'from-blue-500/10 to-indigo-500/10' : 'from-blue-500/20 to-indigo-500/20',
      border: isLight ? 'border-blue-500/20' : 'border-blue-500/30', 
      icon: 'text-blue-400', 
      glow: isLight ? 'hover:shadow-blue-500/10' : 'hover:shadow-blue-500/20', 
      scheme: 'tertiary' 
    },
    { 
      bg: isLight ? 'from-green-500/10 to-teal-500/10' : 'from-green-500/20 to-teal-500/20',
      border: isLight ? 'border-green-500/20' : 'border-green-500/30', 
      icon: 'text-green-400', 
      glow: isLight ? 'hover:shadow-green-500/10' : 'hover:shadow-green-500/20', 
      scheme: 'success' 
    },
    { 
      bg: isLight ? 'from-orange-500/10 to-red-500/10' : 'from-orange-500/20 to-red-500/20',
      border: isLight ? 'border-orange-500/20' : 'border-orange-500/30', 
      icon: 'text-orange-400', 
      glow: isLight ? 'hover:shadow-orange-500/10' : 'hover:shadow-orange-500/20', 
      scheme: 'warning' 
    },
    { 
      bg: isLight ? 'from-pink-500/10 to-rose-500/10' : 'from-pink-500/20 to-rose-500/20',
      border: isLight ? 'border-pink-500/20' : 'border-pink-500/30', 
      icon: 'text-pink-400', 
      glow: isLight ? 'hover:shadow-pink-500/10' : 'hover:shadow-pink-500/20', 
      scheme: 'pink' 
    },
  ]
  const c = colors[index % colors.length]
  const count = paperCount != null ? paperCount : getPaperCount(subject)

  const handleMouseEnter = () => {
    if (onHover) onHover(c.scheme)
  }

  const handleMouseLeave = () => {
    if (onHover) onHover(null)
  }

  return (
    <Link 
      to={`/browse?subject=${encodeURIComponent(subject)}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`group bg-gradient-to-br ${c.bg} rounded-xl p-5 border ${c.border} 
        transition-all duration-300 hover:scale-105 hover:shadow-lg ${c.glow} cursor-pointer block`}
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg bg-surface-variant/30 flex items-center justify-center 
          group-hover:scale-110 transition-transform`}>
          <FileText className={`w-6 h-6 ${c.icon} text-on-surface/80`} />
        </div>
        <div>
          <h3 className="font-semibold text-on-surface group-hover:text-on-surface/80 transition-colors">
            {subject}
          </h3>
          <p className="text-sm text-on-surface-variant">
            {count} Papers Available
          </p>
        </div>
      </div>
    </Link>
  )
}

export { getPaperCount }
export default SubjectCard
