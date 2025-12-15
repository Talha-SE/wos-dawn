/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Monstera"', 'Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['"Monstera"', 'Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body: ['"Monstera"', 'Inter', 'system-ui', 'sans-serif']
      },
      colors: {
        primary: '#2563eb',
        primaryGlow: '#60a5fa',
        accent: '#06b6d4',
        surface: 'rgba(24, 24, 35, 0.75)',
        surfaceSoft: 'rgba(26, 27, 38, 0.55)',
        surfaceHover: 'rgba(148, 163, 255, 0.1)'
      },
      boxShadow: {
        glass: '0 25px 45px -25px rgba(37, 99, 235, 0.55)',
        insetGlow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)'
      },
      animation: {
        float: 'float 10s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        fadeUp: 'fadeUp 0.6s ease forwards',
        wave1: 'wave1 0.8s ease-in-out infinite',
        wave2: 'wave2 0.8s ease-in-out infinite',
        wave3: 'wave3 0.8s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        wave1: {
          '0%, 100%': { height: '0.75rem' },
          '50%': { height: '1rem' }
        },
        wave2: {
          '0%, 100%': { height: '1rem' },
          '50%': { height: '1.25rem' }
        },
        wave3: {
          '0%, 100%': { height: '1.25rem' },
          '50%': { height: '1.5rem' }
        }
      },
      backdropBlur: {
        xs: '3px'
      }
    }
  },
  plugins: []
}
