/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                neon: {
                    green: '#00ff88',
                    blue: '#00d4ff',
                    purple: '#b800ff',
                },
                dark: {
                    900: '#0a0a0a',
                    800: '#0f0f0f',
                    700: '#1a1a1a',
                    600: '#2c2c2e',
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
