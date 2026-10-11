/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#fbf9f8',
          'container-low': '#f6f3f2',
          'container': '#f0ece9',
          'container-high': '#eae5e2',
          'container-highest': '#e4deda',
          'container-lowest': '#ffffff',
          'bright': '#fbf9f8',
        },
        primary: {
          DEFAULT: '#005da7',
          container: '#2976c7',
          fixed: '#d3e4ff',
          'on-fixed': '#001c3b',
        },
        secondary: {
          DEFAULT: '#535f70',
          container: '#d7e3f8',
          'on-container': '#101c2b',
        },
        tertiary: {
          DEFAULT: '#7f5300',
          container: '#ffddb1',
          'on-container': '#2b1700',
        },
        'on-surface': {
          DEFAULT: '#1b1c1c',
          variant: '#444748',
        },
        outline: {
          DEFAULT: '#747779',
          variant: 'rgba(116, 119, 121, 0.20)',
        },
        danger: {
          DEFAULT: '#ba1a1a',
          container: '#ffdad6',
          'on-container': '#410002',
        },
        success: {
          DEFAULT: '#1e7e34',
          container: '#e2f5e7',
          'on-container': '#0b3915',
        }
      },
      fontFamily: {
        display: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'ambient': '0px 12px 32px rgba(27, 28, 28, 0.06)',
        'ambient-elevated': '0px 20px 48px rgba(27, 28, 28, 0.09)',
        'ambient-sm': '0px 6px 18px rgba(27, 28, 28, 0.04)',
      },
      borderRadius: {
        'xl': '1.5rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      }
    },
  },
  plugins: [],
}
