interface Props {
  crest: string
  name: string
  size?: 'sm' | 'md' | 'lg'
}

const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' }

export default function TeamCrest({ crest, name, size = 'md' }: Props) {
  return (
    <img
      src={crest}
      alt={name}
      className={`${sizes[size]} object-contain flex-shrink-0`}
      onError={(e) => {
        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
      }}
    />
  )
}
