import { useReducedMotion } from 'framer-motion'

const Skeleton = ({ 
  className = '', 
  height = 'h-4', 
  width = 'w-full',
  rounded = 'rounded-md'
}) => {
  const prefersReducedMotion = useReducedMotion()
  
  return (
    <div 
      className={`${width} ${height} bg-white/5 ${rounded} overflow-hidden relative ${className}`}
      aria-busy="true"
      aria-label="Loading content"
    >
      {!prefersReducedMotion && (
        <div 
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite linear'
          }}
        />
      )}
    </div>
  )
}

export const SkeletonCard = ({ count = 1 }) => (
  <>
    {[...Array(count)].map((_, i) => (
      <div key={i} className="surface-card rounded-2xl p-6 border border-white/5">
        <Skeleton height="h-24" className="mb-4 rounded-lg" />
        <Skeleton height="h-5" width="w-3/4" className="mb-2" />
        <Skeleton height="h-4" width="w-1/2" className="mb-4" />
        <div className="flex gap-2">
          <Skeleton height="h-6" width="w-20" rounded="rounded-full" />
          <Skeleton height="h-6" width="w-24" rounded="rounded-full" />
        </div>
      </div>
    ))}
  </>
)

// Add this to global CSS:
// @keyframes shimmer {
//   0% { background-position: -200% 0; }
//   100% { background-position: 200% 0; }
// }

export default Skeleton