import React from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const Breadcrumb = ({ items }) => {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex items-center flex-wrap gap-1 text-sm">
        <li className="flex items-center">
          <Link to="/" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            Home
          </Link>
        </li>
        {items.map((item, index) => (
          <li key={index} className="flex items-center gap-1">
            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/50" />
            {index === items.length - 1 ? (
              <span className="font-medium text-on-surface truncate max-w-[200px] sm:max-w-none" title={item.label}>
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="text-on-surface-variant hover:text-primary transition-colors truncate max-w-[200px] sm:max-w-none" title={item.label}>
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export default Breadcrumb
