
// Define Skin Configuration Types
export type EffectType = 'star' | 'matrix' | 'sparkle' | 'ember' | 'leaf_firefly' | 'spiral' | 'bubble' | 'cloud_bird' | 'petal';

export interface SkinPalette {
    bgDeep: string;
    skyPrimary: string;
    skySecondary: string;
    skyAccent: string;
    glassBorder: string;
    glassShine: string;
    skyGradient: string;
}

export interface SkinConfigItem {
    id: string;
    palette: SkinPalette;
    effect: {
        type: EffectType;
        particleCount: number;
        speedFactor: number;
        sizeFactor: number;
    };
    musicUrl?: string; // New property for theme music
}

export const SKIN_CONFIG: Record<string, SkinConfigItem> = {
    'skin_default': {
        id: 'skin_default',
        palette: {
            bgDeep: '#0f172a', // Slate 900
            skyPrimary: '#38bdf8', // Sky 400
            skySecondary: '#c084fc', // Purple 400
            skyAccent: '#f472b6', // Pink 400
            glassBorder: 'rgba(255, 255, 255, 0.2)',
            glassShine: 'rgba(255, 255, 255, 0.3)',
            skyGradient: 'linear-gradient(-45deg, #0f2027, #203a43, #2c5364, #240b36, #c31432)'
        },
        effect: { type: 'star', particleCount: 100, speedFactor: 1, sizeFactor: 1 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/2092/2092-preview.mp3' // Space Ambience
    },
    'skin_neon': {
        id: 'skin_neon',
        palette: {
            bgDeep: '#020617', // Slate 950
            skyPrimary: '#06b6d4', // Cyan 500
            skySecondary: '#d946ef', // Fuchsia 500
            skyAccent: '#8b5cf6', // Violet 500
            glassBorder: 'rgba(6, 182, 212, 0.3)',
            glassShine: 'rgba(217, 70, 239, 0.4)',
            skyGradient: 'linear-gradient(-45deg, #000000, #1a0b2e, #111827, #0f172a, #2e1065)'
        },
        effect: { type: 'matrix', particleCount: 80, speedFactor: 1.5, sizeFactor: 1.2 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/246/246-preview.mp3' // Sci-fi/Cyber scan
    },
    'skin_gold': {
        id: 'skin_gold',
        palette: {
            bgDeep: '#1c1917', // Stone 900
            skyPrimary: '#eab308', // Yellow 500
            skySecondary: '#f59e0b', // Amber 500
            skyAccent: '#fbbf24', // Amber 400
            glassBorder: 'rgba(234, 179, 8, 0.3)',
            glassShine: 'rgba(251, 191, 36, 0.3)',
            skyGradient: 'linear-gradient(-45deg, #271c19, #451a03, #78350f, #1c1917, #000000)'
        },
        effect: { type: 'sparkle', particleCount: 60, speedFactor: 0.5, sizeFactor: 1.5 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3' // Magical/Royal
    },
    'skin_forest': {
        id: 'skin_forest',
        palette: {
            bgDeep: '#052e16', // Green 950
            skyPrimary: '#10b981', // Emerald 500
            skySecondary: '#84cc16', // Lime 500
            skyAccent: '#34d399', // Emerald 400
            glassBorder: 'rgba(16, 185, 129, 0.2)',
            glassShine: 'rgba(132, 204, 22, 0.2)',
            skyGradient: 'linear-gradient(-45deg, #022c22, #064e3b, #065f46, #14532d, #0f172a)'
        },
        effect: { type: 'leaf_firefly', particleCount: 50, speedFactor: 0.8, sizeFactor: 1 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/2432/2432-preview.mp3' // Forest Birds
    },
    'skin_fire': {
        id: 'skin_fire',
        palette: {
            bgDeep: '#450a0a', // Red 950
            skyPrimary: '#ef4444', // Red 500
            skySecondary: '#f97316', // Orange 500
            skyAccent: '#fdba74', // Orange 300
            glassBorder: 'rgba(239, 68, 68, 0.3)',
            glassShine: 'rgba(249, 115, 22, 0.3)',
            skyGradient: 'linear-gradient(-45deg, #450a0a, #7f1d1d, #991b1b, #c2410c, #000000)'
        },
        effect: { type: 'ember', particleCount: 120, speedFactor: 1.2, sizeFactor: 1 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/1273/1273-preview.mp3' // Fire crackling
    },
    'skin_galaxy': {
        id: 'skin_galaxy',
        palette: {
            bgDeep: '#1e1b4b', // Indigo 950
            skyPrimary: '#8b5cf6', // Violet 500
            skySecondary: '#6366f1', // Indigo 500
            skyAccent: '#a855f7', // Purple 500
            glassBorder: 'rgba(139, 92, 246, 0.3)',
            glassShine: 'rgba(168, 85, 247, 0.4)',
            skyGradient: 'linear-gradient(-45deg, #0f172a, #1e1b4b, #312e81, #4c1d95, #000000)'
        },
        effect: { type: 'spiral', particleCount: 200, speedFactor: 0.5, sizeFactor: 0.8 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/2094/2094-preview.mp3' // Ethereal Space
    },
    'skin_ocean': {
        id: 'skin_ocean',
        palette: {
            bgDeep: '#082f49', // Sky 950
            skyPrimary: '#0ea5e9', // Sky 500
            skySecondary: '#06b6d4', // Cyan 500
            skyAccent: '#38bdf8', // Sky 400
            glassBorder: 'rgba(14, 165, 233, 0.3)',
            glassShine: 'rgba(56, 189, 248, 0.3)',
            skyGradient: 'linear-gradient(180deg, #0f172a 0%, #082f49 50%, #0c4a6e 100%)'
        },
        effect: { type: 'bubble', particleCount: 60, speedFactor: 0.7, sizeFactor: 2 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/112/112-preview.mp3' // Ocean Waves
    },
    'skin_sunset': {
        id: 'skin_sunset',
        palette: {
            bgDeep: '#4c0519', // Rose 950
            skyPrimary: '#f43f5e', // Rose 500
            skySecondary: '#d946ef', // Fuchsia 500
            skyAccent: '#fb923c', // Orange 400
            glassBorder: 'rgba(244, 63, 94, 0.3)',
            glassShine: 'rgba(251, 146, 60, 0.3)',
            skyGradient: 'linear-gradient(180deg, #4c0519 0%, #be123c 40%, #fb923c 100%)'
        },
        effect: { type: 'cloud_bird', particleCount: 15, speedFactor: 0.3, sizeFactor: 1 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/2513/2513-preview.mp3' // Chill/Relax
    },
    'skin_cherry': {
        id: 'skin_cherry',
        palette: {
            bgDeep: '#831843', // Pink 900
            skyPrimary: '#ec4899', // Pink 500
            skySecondary: '#f472b6', // Pink 400
            skyAccent: '#fbcfe8', // Pink 200
            glassBorder: 'rgba(236, 72, 153, 0.3)',
            glassShine: 'rgba(244, 114, 182, 0.3)',
            skyGradient: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #fce7f3 100%)'
        },
        effect: { type: 'petal', particleCount: 50, speedFactor: 1, sizeFactor: 1.5 },
        musicUrl: 'https://assets.mixkit.co/active_storage/sfx/209/209-preview.mp3' // Gentle Bells/Piano (Cherry Blossom Vibe)
    }
};
