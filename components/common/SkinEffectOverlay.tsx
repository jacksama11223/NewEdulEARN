
import React, { useRef, useEffect, useContext } from 'react';
import { DataContext } from '../../contexts/AppProviders';
import { SKIN_CONFIG } from './SkinConfig';

// Enhanced Particle Interface
interface Particle {
    x: number;
    y: number;
    vx: number; // Velocity X
    vy: number; // Velocity Y
    size: number;
    color: string;
    alpha: number;
    life: number;
    maxLife: number;
    type?: 'leaf' | 'firefly' | 'char' | 'bubble' | 'bird' | 'cloud' | 'sparkle' | 'ember' | 'dot' | 'petal' | 'star' | 'spiral';
    char?: string; // For Matrix
    angle?: number;
    rotationSpeed?: number;
    wobble?: number; // Sine wave phase
}

const SkinEffectOverlay: React.FC = () => {
    const { db } = useContext(DataContext)!;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    const skinId = db?.GAMIFICATION?.equippedSkin || 'skin_default';
    const config = SKIN_CONFIG[skinId]?.effect || SKIN_CONFIG['skin_default'].effect;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let width = window.innerWidth;
        let height = window.innerHeight;
        
        const handleResize = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initParticles(); 
        };

        canvas.width = width;
        canvas.height = height;
        window.addEventListener('resize', handleResize);

        let particles: Particle[] = [];

        // --- PARTICLE CREATION HELPERS ---

        const createParticle = (initial: boolean = false): Particle => {
            const type = config.type;
            const p: Particle = {
                x: Math.random() * width,
                y: initial ? Math.random() * height : height + 10,
                vx: 0, vy: 0,
                size: Math.random() * 2 + 1,
                color: 'white',
                alpha: Math.random(),
                life: Math.random() * 100,
                maxLife: 100 + Math.random() * 100,
                type: 'dot',
                angle: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.1,
                wobble: Math.random() * Math.PI * 2
            };

            if (type === 'matrix') {
                p.y = initial ? Math.random() * height : -20;
                p.vy = (2 + Math.random() * 3) * config.speedFactor;
                p.size = 10 + Math.random() * 10;
                p.type = 'char';
                p.char = String.fromCharCode(0x30A0 + Math.random() * 96); // Katakana
                p.color = '#0f0';
            } else if (type === 'ember') {
                p.x = Math.random() * width;
                p.y = initial ? Math.random() * height : height + 20;
                p.vy = -(1 + Math.random() * 2) * config.speedFactor;
                p.vx = (Math.random() - 0.5) * 0.5;
                p.size = 2 + Math.random() * 4 * config.sizeFactor;
                p.type = 'ember';
                p.life = 100;
                p.color = `rgba(255, ${Math.floor(100 + Math.random() * 155)}, 0, 1)`;
            } else if (type === 'sparkle') {
                p.y = Math.random() * height;
                p.vy = (Math.random() - 0.5) * 0.2;
                p.vx = (Math.random() - 0.5) * 0.2;
                p.size = (2 + Math.random() * 5) * config.sizeFactor;
                p.type = 'sparkle';
                p.life = Math.random() * 100;
                p.color = '#ffd700'; // Gold
            } else if (type === 'leaf_firefly') {
                if (Math.random() > 0.7) {
                    // Firefly
                    p.type = 'firefly';
                    p.y = Math.random() * height;
                    p.vx = (Math.random() - 0.5) * 0.5;
                    p.vy = (Math.random() - 0.5) * 0.5;
                    p.size = 2;
                    p.color = '#bef264'; // Lime
                } else {
                    // Leaf
                    p.type = 'leaf';
                    p.y = initial ? Math.random() * height : -10;
                    p.vy = (1 + Math.random()) * config.speedFactor;
                    p.vx = (Math.random() - 0.5) * 1;
                    p.size = 5 + Math.random() * 5;
                    p.color = Math.random() > 0.5 ? '#15803d' : '#4ade80'; // Dark/Light Green
                }
            } else if (type === 'bubble') {
                p.type = 'bubble';
                p.y = initial ? Math.random() * height : height + 10;
                p.vy = -(0.5 + Math.random()) * config.speedFactor;
                p.size = (2 + Math.random() * 6) * config.sizeFactor;
                p.color = 'rgba(255, 255, 255, 0.15)';
            } else if (type === 'petal') {
                p.type = 'petal';
                p.y = initial ? Math.random() * height : -10;
                p.vy = (1 + Math.random() * 1.5) * config.speedFactor;
                p.vx = 0.5 + Math.random() * 0.5; // Drift right
                p.size = (4 + Math.random() * 4) * config.sizeFactor;
                p.color = Math.random() > 0.5 ? '#fbcfe8' : '#f9a8d4'; // Pink
            } else if (type === 'cloud_bird') {
                if (Math.random() > 0.8) {
                    p.type = 'bird';
                    p.y = Math.random() * (height * 0.5);
                    p.x = initial ? Math.random() * width : -10;
                    p.vx = (1 + Math.random()) * config.speedFactor;
                    p.vy = (Math.random() - 0.5) * 0.2;
                    p.size = 2 + Math.random() * 2;
                    p.color = '#000';
                } else {
                    p.type = 'cloud';
                    p.y = Math.random() * (height * 0.6);
                    p.vx = (0.2 + Math.random() * 0.2) * config.speedFactor;
                    p.size = 40 + Math.random() * 40;
                    p.color = 'rgba(255, 255, 255, 0.05)';
                }
            } else if (type === 'spiral') {
                // Galaxy Spiral
                p.x = width / 2;
                p.y = height / 2;
                p.angle = Math.random() * Math.PI * 2;
                // Reuse size as radius from center
                p.life = Math.random() * Math.min(width, height) / 2; // Initial radius
                p.maxLife = 0; // Not used for death, used for speed maybe
                p.size = 1 + Math.random();
                p.color = Math.random() > 0.5 ? '#a855f7' : '#60a5fa';
                p.type = 'spiral';
            } else {
                // Default Stars
                p.type = 'star';
                p.y = Math.random() * height;
                p.vx = (Math.random() - 0.5) * 0.05;
                p.vy = (Math.random() - 0.5) * 0.05;
                p.size = Math.random() * 2;
                p.life = Math.random() * 100; // Blinking phase
            }

            return p;
        };

        const initParticles = () => {
            particles = [];
            for (let i = 0; i < config.particleCount; i++) {
                particles.push(createParticle(true));
            }
        };

        // --- RENDER LOOP ---

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            particles.forEach((p, index) => {
                // --- UPDATE ---
                
                if (config.type === 'matrix') {
                    p.y += p.vy;
                    // Randomly change char
                    if (Math.random() > 0.95) p.char = String.fromCharCode(0x30A0 + Math.random() * 96);
                    if (p.y > height) particles[index] = createParticle();
                } 
                else if (config.type === 'ember') {
                    p.y += p.vy;
                    p.x += p.vx + Math.sin(p.y * 0.02) * 0.2;
                    p.life--;
                    p.alpha = Math.max(0, p.life / 100);
                    // Fade color to smoke
                    if (p.life < 40) p.color = `rgba(100, 100, 100, ${p.alpha})`;
                    if (p.life <= 0) particles[index] = createParticle();
                }
                else if (config.type === 'sparkle') {
                    p.x += p.vx; p.y += p.vy;
                    p.angle = (p.angle || 0) + 0.05;
                    p.life++;
                    // Twinkle opacity
                    p.alpha = 0.5 + 0.5 * Math.sin(p.life * 0.1);
                    if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                    if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
                }
                else if (config.type === 'leaf_firefly') {
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.type === 'leaf') {
                        p.x += Math.sin((p.wobble || 0) + p.y * 0.01);
                        p.angle = (p.angle || 0) + (p.rotationSpeed || 0);
                        if (p.y > height) particles[index] = createParticle();
                    } else {
                        // Firefly random walk
                        p.vx += (Math.random() - 0.5) * 0.05;
                        p.vy += (Math.random() - 0.5) * 0.05;
                        // Keep fireflies roughly in bounds or wrap
                        if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                        if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
                    }
                }
                else if (config.type === 'bubble') {
                    p.y += p.vy;
                    p.wobble = (p.wobble || 0) + 0.05;
                    p.x += Math.sin(p.wobble) * 0.5;
                    if (p.y < -10) particles[index] = createParticle();
                }
                else if (config.type === 'petal') {
                    p.y += p.vy;
                    p.x += p.vx + Math.sin(p.y * 0.01) * 0.5;
                    p.angle = (p.angle || 0) + (p.rotationSpeed || 0);
                    if (p.y > height || p.x > width) particles[index] = createParticle();
                }
                else if (config.type === 'cloud_bird') {
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.type === 'bird') {
                        // Flap movement (visual only in draw)
                        p.wobble = (p.wobble || 0) + 0.2; 
                        if (p.x > width) particles[index] = createParticle();
                    } else {
                        if (p.x > width + p.size) p.x = -p.size;
                    }
                }
                else if (config.type === 'spiral') {
                    // Spiral logic: rotate around center and move outward/inward
                    const centerX = width / 2;
                    const centerY = height / 2;
                    p.angle = (p.angle || 0) + 0.005; // slow rotation
                    // p.life stores radius here
                    p.life += 0.2; // Move outward
                    if (p.life > Math.max(width, height)) p.life = 0;
                    
                    p.x = centerX + Math.cos(p.angle) * p.life;
                    p.y = centerY + Math.sin(p.angle) * p.life;
                }
                else {
                    // Stars
                    p.x += p.vx; p.y += p.vy;
                    p.life++;
                    p.alpha = 0.3 + 0.7 * Math.abs(Math.sin(p.life * 0.02));
                    if (p.x < 0) p.x = width; if (p.x > width) p.x = 0;
                    if (p.y < 0) p.y = height; if (p.y > height) p.y = 0;
                }

                // --- DRAW ---
                ctx.save();
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.strokeStyle = p.color;

                if (p.type === 'char' && p.char) {
                    ctx.font = `${p.size}px monospace`;
                    ctx.fillText(p.char, p.x, p.y);
                }
                else if (p.type === 'sparkle') {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle || 0);
                    ctx.beginPath();
                    // Draw 4-point star
                    for(let i=0; i<4; i++) {
                        ctx.rotate(Math.PI / 2);
                        ctx.lineTo(0, -p.size);
                        ctx.lineTo(p.size/4, -p.size/4);
                    }
                    ctx.fill();
                }
                else if (p.type === 'leaf') {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle || 0);
                    ctx.beginPath();
                    ctx.ellipse(0, 0, p.size, p.size/2, 0, 0, Math.PI*2);
                    ctx.fill();
                }
                else if (p.type === 'bubble') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.stroke();
                    // Shine
                    ctx.beginPath();
                    ctx.arc(p.x - p.size*0.3, p.y - p.size*0.3, p.size/3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255,255,255,0.4)';
                    ctx.fill();
                }
                else if (p.type === 'petal') {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.angle || 0);
                    ctx.beginPath();
                    // Heart-ish shape for petal
                    ctx.moveTo(0,0);
                    ctx.bezierCurveTo(p.size, -p.size, p.size*2, 0, 0, p.size*1.5);
                    ctx.bezierCurveTo(-p.size*2, 0, -p.size, -p.size, 0, 0);
                    ctx.fill();
                }
                else if (p.type === 'bird') {
                    ctx.beginPath();
                    const wingY = Math.sin(p.wobble || 0) * 3;
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x - 5, p.y - wingY);
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x + 5, p.y - wingY);
                    ctx.lineWidth = 1.5;
                    ctx.stroke();
                }
                else if (p.type === 'cloud') {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.arc(p.x + p.size*0.8, p.y + p.size*0.2, p.size*0.7, 0, Math.PI * 2);
                    ctx.arc(p.x - p.size*0.8, p.y + p.size*0.2, p.size*0.7, 0, Math.PI * 2);
                    ctx.fill();
                }
                else {
                    // Default circle (ember, dot, firefly, star, spiral)
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        // Initialize and Start
        initParticles();
        render();

        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
        };
    }, [config]); // Re-run when config changes

    return (
        <canvas 
            ref={canvasRef} 
            className="fixed inset-0 z-[1] pointer-events-none transition-opacity duration-1000"
            style={{ opacity: 1 }}
        />
    );
};

export default SkinEffectOverlay;
