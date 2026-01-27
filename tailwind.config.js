/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                border: "var(--border)",
                input: "var(--input)",
                ring: "#a163ff", // Primary Ring
                background: "var(--background)",
                foreground: "var(--foreground)",
                primary: {
                    DEFAULT: "#a163ff",
                    foreground: "#ffffff",
                    hover: "#8a4fe0",
                },
                secondary: {
                    DEFAULT: "#EC4899",
                    foreground: "#ffffff",
                    hover: "#db2777",
                },
                destructive: {
                    DEFAULT: "#ef4444",
                    foreground: "#ffffff",
                },
                muted: {
                    DEFAULT: "#f1f5f9",
                    foreground: "#64748b",
                },
                accent: {
                    DEFAULT: "#f1f5f9",
                    foreground: "#0f172a",
                },
                // Legacy/Custom Palette Support
                darkText: '#141118',
                lightText: '#726189',
                darkBg: '#0f172a',
                darkSurface: '#1e293b',
                darkBorder: '#334155',
                darkTextPrimary: '#f8fafc',
                darkTextSecondary: '#94a3b8'
            },
            borderRadius: {
                lg: "0.75rem", // 12px
                xl: "1rem",    // 16px
                "2xl": "1.5rem", // 24px
                "3xl": "2rem", // 32px
            },
            fontFamily: {
                sans: ['Manrope', 'sans-serif'],
                display: ['Manrope', 'sans-serif'],
            }
        }
    },
    plugins: [],
}
