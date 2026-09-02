tailwind.config = {
  theme: {
    extend: {
      colors: {
        'void': '#030303',
        'panel': '#080808',
        'mint': '#00ffa3',
        'mint-dark': '#00b372',
        'border': 'rgba(255, 255, 255, 0.08)',
        'border-strong': 'rgba(255, 255, 255, 0.15)',
        'sub': '#888888'
      },
      fontFamily: {
        'display': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'body': ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'tech-grid': "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
      },
      letterSpacing: {
        'tightest': '-0.04em',
      }
    }
  }
};
