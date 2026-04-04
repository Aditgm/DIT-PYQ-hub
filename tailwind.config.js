/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'base': 'var(--bg)',
        'primary': 'rgb(from var(--primary) r g b / <alpha-value>)',
        'primary-container': 'rgb(from var(--primary-container) r g b / <alpha-value>)',
        'on-primary': 'rgb(from var(--on-primary) r g b / <alpha-value>)',
        'secondary': 'rgb(from var(--secondary) r g b / <alpha-value>)',
        'secondary-container': 'rgb(from var(--secondary-container) r g b / <alpha-value>)',
        'on-secondary': 'rgb(from var(--on-secondary) r g b / <alpha-value>)',
        'surface': 'rgb(from var(--surface) r g b / <alpha-value>)',
        'surface-low': 'rgb(from var(--surface-low) r g b / <alpha-value>)',
        'surface-container': 'rgb(from var(--surface-container) r g b / <alpha-value>)',
        'surface-container-high': 'rgb(from var(--surface-container-high) r g b / <alpha-value>)',
        'surface-container-highest': 'rgb(from var(--surface-container-highest) r g b / <alpha-value>)',
        'surface-variant': 'rgb(from var(--surface-variant) r g b / <alpha-value>)',
        'on-surface': 'rgb(from var(--text-primary) r g b / <alpha-value>)',
        'on-surface-variant': 'rgb(from var(--text-muted) r g b / <alpha-value>)',
        'outline-variant': 'rgb(from var(--border) r g b / <alpha-value>)',
        'error': 'rgb(from var(--error) r g b / <alpha-value>)',
        'error-container': 'rgb(from var(--error-container) r g b / <alpha-value>)',
        'on-error': 'rgb(from var(--on-error) r g b / <alpha-value>)',
        'warning': 'rgb(from var(--warning) r g b / <alpha-value>)',
        'warning-container': 'rgb(from var(--warning-container) r g b / <alpha-value>)',
        'on-warning': 'rgb(from var(--on-warning) r g b / <alpha-value>)',
        'info': 'rgb(from var(--info) r g b / <alpha-value>)',
        'info-container': 'rgb(from var(--info-container) r g b / <alpha-value>)',
        'on-info': 'rgb(from var(--on-info) r g b / <alpha-value>)',
        'success': 'rgb(from var(--success) r g b / <alpha-value>)',
        'success-container': 'rgb(from var(--success-container) r g b / <alpha-value>)',
        'on-success': 'rgb(from var(--on-success) r g b / <alpha-value>)',
        'accent': 'rgb(from var(--accent) r g b / <alpha-value>)',
        'accent-container': 'rgb(from var(--accent-container) r g b / <alpha-value>)',
        'on-accent': 'rgb(from var(--on-accent) r g b / <alpha-value>)',
      },
      fontFamily: {
        'display': ['Manrope', 'sans-serif'],
        'body': ['Inter', 'sans-serif'],
      },
      fontSize: {
        'display-lg': ['3.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'headline-md': ['1.75rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'title-sm': ['1rem', { lineHeight: '1.5', letterSpacing: '0' }],
        'body-lg': ['1rem', { lineHeight: '1.6', letterSpacing: '0' }],
        'label-md': ['0.75rem', { lineHeight: '1.4', letterSpacing: '0.02em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      borderRadius: {
        'lg': '1rem',
        'xl': '1.5rem',
      },
      backdropBlur: {
        'glass': '16px',
        'glass-lg': '20px',
      },
      boxShadow: {
        'glow-primary': '0 0 45px rgba(203, 180, 137, 0.16)',
        'glow-secondary': '0 0 45px rgba(200, 168, 166, 0.14)',
        'glow-tertiary': '0 0 45px rgba(191, 181, 171, 0.14)',
        'ambient': '0 42px 70px -18px rgba(0, 0, 0, 0.58)',
        'card': '0 24px 56px -28px rgba(0, 0, 0, 0.72)',
        'card-hover': '0 32px 72px -32px rgba(0, 0, 0, 0.82)',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-container) 100%)',
        'gradient-secondary': 'linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-container) 100%)',
        'gradient-cosmic': 'radial-gradient(ellipse at 50% 0%, rgba(109, 221, 255, 0.08) 0%, transparent 50%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-reverse': 'floatReverse 6s ease-in-out infinite',
        'float-diagonal': 'floatDiagonal 8s ease-in-out infinite',
        'float-pulse': 'floatPulse 5s ease-in-out infinite',
        'float-rotate': 'floatRotate 7s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 2s infinite',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(8px)' },
        },
        floatDiagonal: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(5px, -10px)' },
          '50%': { transform: 'translate(0, -15px)' },
          '75%': { transform: 'translate(-5px, -10px)' },
        },
        floatPulse: {
          '0%, 100%': { transform: 'translateY(0px) scale(1)' },
          '50%': { transform: 'translateY(-12px) scale(1.05)' },
        },
        floatRotate: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '25%': { transform: 'translateY(-8px) rotate(2deg)' },
          '50%': { transform: 'translateY(-16px) rotate(0deg)' },
          '75%': { transform: 'translateY(-8px) rotate(-2deg)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.bg-white\\/3': { 'background-color': 'rgba(255, 255, 255, 0.03)' },
        '.bg-white\\/5': { 'background-color': 'rgba(255, 255, 255, 0.05)' },
        '.bg-white\\/10': { 'background-color': 'rgba(255, 255, 255, 0.10)' },
      })
    }
  ],
}
