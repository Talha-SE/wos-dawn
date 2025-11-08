import { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variantClass: Record<Variant, string> = {
  primary: 'button-primary',
  secondary: 'bg-gray-600 hover:bg-gray-500 text-white',
  ghost: 'button-ghost', 
  subtle: 'button-subtle',
  danger: 'bg-red-600 hover:bg-red-500 text-white'
}

const sizeClass = {
  sm: 'px-3 py-1 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
}

export default function Button(props: ButtonProps) {
  const { className = '', variant = 'primary', size = 'md', loading = false, children, disabled, ...rest } = props
  const classes = `${variantClass[variant]} ${sizeClass[size]} rounded px-4 py-2 font-medium transition-colors ${className}`.trim()
  return (
    <button className={classes} disabled={disabled || loading} {...rest}>
      {loading ? 'Please wait…' : children}
    </button>
  )
}
