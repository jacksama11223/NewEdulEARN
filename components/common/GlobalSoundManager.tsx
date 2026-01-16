
import React, { useEffect, useRef, useContext } from 'react';
import { DataContext } from '../../contexts/AppProviders';
import { SKIN_CONFIG } from './SkinConfig';

const THOCK_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2364/2364-preview.mp3'; // Mechanical click

const GlobalSoundManager: React.FC = () => {
    const { db } = useContext(DataContext)!;
    const equippedSkin = db.GAMIFICATION.equippedSkin || 'skin_default';
    
    // Refs to manage audio instances
    const skinAudioRef = useRef<HTMLAudioElement | null>(null);
    const fadeIntervalRef = useRef<number | null>(null);
    const stopTimeoutRef = useRef<number | null>(null);
    
    // Preload Thock Sound
    const thockAudioBase = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        thockAudioBase.current = new Audio(THOCK_SOUND_URL);
        thockAudioBase.current.volume = 0.25; // Subtle volume
    }, []);

    // --- 1. THOCKY EFFECT (Click & Type) ---
    useEffect(() => {
        const playThock = () => {
            if (thockAudioBase.current) {
                // Clone node allows rapid firing (typing fast) without cutting off previous sound
                const clone = thockAudioBase.current.cloneNode() as HTMLAudioElement;
                clone.volume = 0.2; // Keep it subtle
                // Randomize pitch slightly for realism
                clone.playbackRate = 0.9 + Math.random() * 0.2; 
                clone.play().catch(() => {}); // Ignore interaction errors
            }
        };

        // Attach listeners
        window.addEventListener('keydown', playThock);
        window.addEventListener('mousedown', playThock);

        return () => {
            window.removeEventListener('keydown', playThock);
            window.removeEventListener('mousedown', playThock);
        };
    }, []);

    // --- 2. SKIN AMBIENCE EFFECT ---
    useEffect(() => {
        const config = SKIN_CONFIG[equippedSkin];
        if (!config || !config.musicUrl) return;

        // Cleanup previous sound
        if (skinAudioRef.current) {
            const prevAudio = skinAudioRef.current;
            // Quick fade out for previous track
            const quickFade = setInterval(() => {
                if (prevAudio.volume > 0.05) prevAudio.volume -= 0.1;
                else {
                    prevAudio.pause();
                    clearInterval(quickFade);
                }
            }, 50);
        }
        if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
        if (stopTimeoutRef.current) clearTimeout(stopTimeoutRef.current);

        // Setup new sound
        const audio = new Audio(config.musicUrl);
        audio.volume = 0.6; // Start volume
        audio.loop = true; // Loop just in case the clip is short, we control stop manually
        skinAudioRef.current = audio;

        // Play
        const playPromise = audio.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log("Audio play prevented:", error);
            });
        }

        // Schedule Fade Out after 7 seconds, Stop after 10 seconds
        const FADE_START_MS = 7000;
        const TOTAL_DURATION_MS = 10000;

        // Start Fade Out Logic
        stopTimeoutRef.current = window.setTimeout(() => {
            const fadeStep = 0.05;
            const fadeIntervalTime = 100; // Run every 100ms
            
            fadeIntervalRef.current = window.setInterval(() => {
                if (audio.volume > fadeStep) {
                    audio.volume -= fadeStep;
                } else {
                    audio.volume = 0;
                    audio.pause();
                    if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
                }
            }, fadeIntervalTime);

        }, FADE_START_MS);

        // Hard Stop safety (though fade should handle it)
        const safetyStop = window.setTimeout(() => {
             if (audio) audio.pause();
        }, TOTAL_DURATION_MS + 2000);

        return () => {
            clearTimeout(safetyStop);
        };

    }, [equippedSkin]);

    return null; // Invisible component
};

export default GlobalSoundManager;
