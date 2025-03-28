/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ['class'],
    content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
  	extend: {
  		backgroundImage: {
  			'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
  			'gradient-conic': 'conic-gradient(from var(--conic-position, 0deg), var(--tw-gradient-stops))',
  			'grid-pattern': 'url("/grid-pattern.svg")',
  			'grid-pattern-light': 'url("/grid-pattern-light.svg")',
  		},
  		colors: {
  			accent: {
  				'90': '#3B82F6E6',
  				DEFAULT: '#3B82F6'
  			},
  			border: '#374151',
  			primary: {
  				DEFAULT: '#3B82F6',
  			},
  			muted: {
  				DEFAULT: '#374151',
  				foreground: '#9CA3AF',
  			},
  			background: '#111827',
  			foreground: '#FFFFFF',
  		},
  		backdropBlur: {
  			sm: '4px',
  			DEFAULT: '8px',
  			md: '12px',
  			lg: '16px',
  			xl: '24px'
  		},
  		maxWidth: {
  			container: "1280px",
  		},
  		animation: {
  			marquee: 'marquee var(--duration) linear infinite',
  			"pulse-slow": "pulse-slow 3s ease-in-out infinite",
  		},
  		keyframes: {
  			marquee: {
  				from: { transform: 'translateX(0)' },
  				to: { transform: 'translateX(calc(-100% - var(--gap)))' }
  			},
  			"pulse-slow": {
  				'0%, 100%': {
  					transform: 'translateX(-100%)',
  				},
  				'50%': {
  					transform: 'translateX(100%)',
  				},
  			},
  		}
  	}
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.mask-composite-intersect': {
          'mask-composite': 'intersect',
          '-webkit-mask-composite': 'source-in',
        },
      });
    },
  ],
  future: {
    hoverOnlyWhenSupported: true,
  },
  safelist: [
    'from-cyan-500',
    'via-transparent',
    'to-transparent',
    'to-cyan-500',
  ],
} 