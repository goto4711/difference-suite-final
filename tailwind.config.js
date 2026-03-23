/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                main: 'var(--color-main)', // Deep Magenta #832161
                'main-hover': '#66184a',
                alt: 'var(--color-alt)', // Neon Green #ADFC92
                background: 'var(--color-background)', // Blue #99B2DD
                surface: '#ffffff',
                text: 'var(--color-text)', // Black #000100
                'text-muted': '#666666',
                border: 'var(--color-main)',
            },
            fontFamily: {
                sans: ['Lexend', 'sans-serif'],
            },
            boxShadow: {
                'card': '4px 4px 0px rgba(0,0,0,0.1)',
            }
        },
    },
    plugins: [],
}
