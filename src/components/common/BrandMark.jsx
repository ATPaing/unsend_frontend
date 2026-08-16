import { LockOpen } from 'lucide-react'

function BrandMark({
  showIcon = false,
  taglineCase = 'upper',
  className = '',
  size = 'md',
}) {
  const titleSize = size === 'lg' ? 'text-3xl' : 'text-[1.75rem]'
  const tagline =
    taglineCase === 'upper' ? 'DIGITAL SANCTUARY' : 'Digital Sanctuary'

  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      {showIcon ? (
        <LockOpen
          size={28}
          strokeWidth={1.75}
          className="mb-3 text-brand"
          aria-hidden="true"
        />
      ) : null}
      <p className={`${titleSize} font-bold tracking-tight text-brand`}>Unsend</p>
      <p
        className={`mt-1 text-xs font-medium tracking-[0.22em] text-muted ${
          taglineCase === 'upper' ? 'uppercase' : ''
        }`}
      >
        {tagline}
      </p>
    </div>
  )
}

export default BrandMark
