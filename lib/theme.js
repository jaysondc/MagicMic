export const theme = {
    colors: {
        background: '#120024', // Deep Purple
        surface: '#2A0045',    // Lighter Purple
        primary: '#FF00FF',    // Neon Pink
        secondary: '#00FFFF',  // Cyan
        text: '#FFFFFF',
        textSecondary: '#B0A0C0',
        border: '#4A0072',
        error: '#ff0055a8',
        success: '#00FF99',
        warning: '#ffcc00d4',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
    },
    borderRadius: {
        s: 4,
        m: 8,
        l: 16,
        round: 9999,
    },
    textVariants: {
        header: {
            fontSize: 28,
            fontWeight: 'bold',
            color: '#FFFFFF',
            textShadowColor: '#FF00FF',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 10,
        },
        subheader: {
            fontSize: 18,
            fontWeight: '600',
            color: '#00FFFF',
        },
        body: {
            fontSize: 16,
            color: '#FFFFFF',
        },
        caption: {
            fontSize: 14,
            color: '#B0A0C0',
        },
    },
};
