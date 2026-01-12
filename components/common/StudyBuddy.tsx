
import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { PetContext, DataContext, MusicContext } from '../../contexts/AppProviders';

type PetAction = 
    | 'idle' | 'sleep' | 'poke' | 'love' | 'confused' 
    | 'surf' | 'fly' | 'type' | 'success' | 'panic' 
    | 'jump' | 'note' | 'offer' | 'sad' | 'welcome' 
    | 'observe' | 'dizzy'
    | 'hover_btn' | 'hover_input' | 'hover_coin' | 'hover_muscle' 
    | 'hover_popcorn' | 'hover_smart' | 'hover_music' | 'hover_mechanic' 
    | 'hover_doctor' | 'hover_ninja' | 'hover_scared' | 'hover_love' 
    | 'hover_sleepy' | 'hover_camera' | 'hover_magic' | 'hover_write' 
    | 'hover_game' | 'hover_lock' | 'hover_cool' | 'hover_detective'
    | 'hover_point';

// --- ANIME CAT COMPONENT (SVG) ---
const AnimeCat: React.FC<{ action: string, style?: React.CSSProperties }> = ({ action: propAction, style }) => {
    // Determine face/prop expression states
    const action = propAction as PetAction; // Cast safely

    const isHappy = ['success', 'welcome', 'love', 'jump', 'offer', 'surf', 'hover_love', 'hover_coin', 'hover_cool', 'hover_smart', 'hover_music', 'hover_point'].includes(action);
    const isSad = ['sad', 'panic', 'hover_scared'].includes(action);
    const isClosedEyes = ['sleep', 'fly', 'happy', 'hover_sleepy', 'hover_music'].includes(action);
    const isDizzy = action === 'dizzy';
    const isConfused = ['confused', 'hover_lock'].includes(action);
    const isFocused = ['type', 'observe', 'note', 'hover_btn', 'hover_input', 'hover_write', 'hover_game', 'hover_mechanic', 'hover_doctor'].includes(action);
    const isNinja = action === 'hover_ninja';
    const isMoneyEyes = action === 'hover_coin';

    return (
        <div className="relative w-32 h-32 md:w-40 md:h-40 pointer-events-none select-none z-[100]">
            <style>{`
                /* --- BASE ANIMATIONS --- */
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                @keyframes blink { 0%, 96%, 100% { transform: scaleY(1); } 98% { transform: scaleY(0.1); } }
                @keyframes tail { 0%, 100% { transform: rotate(-10deg); } 50% { transform: rotate(10deg); } }
                
                /* --- ACTION SPECIFIC ANIMATIONS --- */
                @keyframes poke { 0% { transform: scale(1); } 40% { transform: scale(1.2, 0.8); } 80% { transform: scale(0.9, 1.1); } 100% { transform: scale(1); } }
                @keyframes love { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                @keyframes confused { 0%, 100% { transform: rotate(0); } 50% { transform: rotate(-15deg); } }
                @keyframes surf { 0%, 100% { transform: translateY(0) rotate(5deg); } 50% { transform: translateY(10px) rotate(5deg); } }
                @keyframes fly { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
                @keyframes type { 0%, 100% { transform: translateY(0); } 25% { transform: translateY(2px); } 75% { transform: translateY(2px); } }
                @keyframes success { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px) rotate(360deg); } }
                @keyframes panic { 0% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } 100% { transform: translateX(0); } }
                @keyframes jump { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-30px); } }
                @keyframes note { 0% { transform: rotate(0); } 50% { transform: rotate(5deg); } 100% { transform: rotate(0); } }
                @keyframes offer { 0% { transform: translateY(0); } 50% { transform: translateY(-5px) scale(1.05); } 100% { transform: translateY(0); } }
                @keyframes sad { 0% { transform: translateY(0); } 50% { transform: translateY(5px); } 100% { transform: translateY(0); } }
                @keyframes welcome { 0% { transform: rotate(0); } 25% { transform: rotate(-10deg); } 75% { transform: rotate(10deg); } 100% { transform: rotate(0); } }
                @keyframes observe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
                @keyframes dizzy { 0% { transform: rotate(0); } 100% { transform: rotate(360deg); } }
                @keyframes snot { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.5); opacity: 0.8; } 100% { transform: scale(0); opacity: 0; } }
                @keyframes headbang { 0%, 100% { transform: translateY(0) rotate(0); } 25% { transform: translateY(5px) rotate(-5deg); } 75% { transform: translateY(5px) rotate(5deg); } }
                @keyframes eat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
                @keyframes peek { 0% { transform: translateY(20px); } 100% { transform: translateY(0); } }
                @keyframes ninja-vanish { 0% { opacity: 1; } 50% { opacity: 0.2; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }
                @keyframes money-dance { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
                @keyframes point-up { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(-10deg); } }

                /* CSS CLASSES MAP */
                .anim-idle { animation: float 3s ease-in-out infinite; }
                .anim-poke { animation: poke 0.4s ease-in-out; }
                .anim-love, .anim-hover_love { animation: love 0.6s ease-in-out infinite; }
                .anim-confused, .anim-hover_lock { animation: confused 1s ease-in-out infinite; }
                .anim-surf, .anim-hover_cool { animation: surf 0.5s ease-in-out infinite; }
                .anim-fly { animation: float 2s ease-in-out infinite; }
                .anim-type, .anim-hover_write, .anim-hover_game { animation: type 0.2s linear infinite; }
                .anim-success, .anim-hover_magic { animation: success 0.8s ease-in-out; }
                .anim-panic, .anim-hover_scared { animation: panic 0.2s linear infinite; }
                .anim-jump, .anim-hover_btn { animation: jump 0.5s ease-in-out infinite; }
                .anim-note { animation: note 1s ease-in-out infinite; }
                .anim-offer { animation: offer 1s ease-in-out infinite; }
                .anim-sad { animation: sad 2s ease-in-out infinite; }
                .anim-welcome { animation: welcome 0.5s ease-in-out infinite; }
                .anim-observe, .anim-hover_detective { animation: observe 2s ease-in-out infinite; }
                .anim-dizzy { animation: dizzy 1s linear infinite; }
                .anim-sleep, .anim-hover_sleepy { animation: float 4s ease-in-out infinite; }
                .anim-hover_music { animation: headbang 0.5s ease-in-out infinite; }
                .anim-hover_popcorn { animation: eat 0.5s linear infinite; }
                .anim-hover_input { animation: peek 0.3s ease-out forwards; }
                .anim-hover_ninja { animation: ninja-vanish 2s infinite; }
                .anim-hover_smart { animation: float 3s ease-in-out infinite; }
                .anim-hover_muscle { animation: jump 1s ease-in-out infinite; }
                .anim-hover_coin { animation: money-dance 0.4s ease-in-out infinite; }
                .anim-hover_point { animation: point-up 0.5s ease-in-out infinite; }

                .cat-eye { transform-origin: center; transform-box: fill-box; animation: blink 4s infinite; }
                .cat-tail { transform-origin: bottom center; transform-box: fill-box; animation: tail 2s ease-in-out infinite; }
                .cat-snot { transform-origin: bottom left; transform-box: fill-box; animation: snot 2.5s infinite; }
            `}</style>

            <svg viewBox="0 0 200 200" className={`w-full h-full drop-shadow-2xl transition-all duration-300 anim-${action}`} style={style}>
                {/* --- ACCESSORIES BEHIND --- */}
                {action === 'fly' && (
                    <g transform="translate(140, 20)">
                        <line x1="0" y1="100" x2="-20" y2="140" stroke="#ccc" strokeWidth="1" />
                        <circle cx="0" cy="0" r="25" fill="#f87171" opacity="0.8" />
                        <circle cx="-15" cy="10" r="20" fill="#60a5fa" opacity="0.8" />
                    </g>
                )}
                {action === 'hover_muscle' && <path d="M40 100 Q 20 80 40 60 Q 60 40 80 60" fill="#fca5a5" opacity="0.5" />}
                <path d="M100 160 Q 140 180 150 120" stroke="#fff" strokeWidth="14" fill="none" strokeLinecap="round" className="cat-tail" />
                <ellipse cx="100" cy="145" rx="60" ry="45" fill={isNinja ? "#1f2937" : "#fff"} />
                <g transform="translate(0, 0)">
                    <path d="M60 75 L 35 20 L 95 55 Z" fill={isNinja ? "#1f2937" : "#fff"} stroke={isNinja ? "#000" : "#e5e7eb"} strokeWidth="2" />
                    <path d="M58 70 L 45 35 L 85 60 Z" fill={isNinja ? "#374151" : "#fda4af"} />
                </g>
                <g transform="translate(0, 0)">
                    <path d="M140 75 L 165 20 L 105 55 Z" fill={isNinja ? "#1f2937" : "#fff"} stroke={isNinja ? "#000" : "#e5e7eb"} strokeWidth="2" />
                    <path d="M142 70 L 155 35 L 115 60 Z" fill={isNinja ? "#374151" : "#fda4af"} />
                </g>
                <circle cx="100" cy="95" r="55" fill={isNinja ? "#1f2937" : "#fff"} />
                {isNinja && <path d="M45 80 Q 100 110 155 80 L 155 60 Q 100 30 45 60 Z" fill="#ef4444" />}
                {isDizzy ? (
                    <g>
                        <circle cx="75" cy="90" r="10" fill="none" stroke="#333" strokeWidth="3" />
                        <circle cx="75" cy="90" r="4" fill="#333" />
                        <circle cx="125" cy="90" r="10" fill="none" stroke="#333" strokeWidth="3" />
                        <circle cx="125" cy="90" r="4" fill="#333" />
                        <path d="M95 110 Q 100 105 105 110" stroke="#333" strokeWidth="2" fill="none" />
                    </g>
                ) : isClosedEyes || action === 'sleep' ? (
                    <g>
                        <path d="M60 95 Q 75 105 90 95" stroke="#333" strokeWidth="3" fill="none" />
                        <path d="M110 95 Q 125 105 140 95" stroke="#333" strokeWidth="3" fill="none" />
                        {(action === 'sleep' || action === 'hover_sleepy') && <><text x="140" y="60" fontSize="20" fill="#60a5fa" className="animate-pulse">Zzz</text><circle cx="110" cy="105" r="12" fill="rgba(147, 197, 253, 0.5)" className="cat-snot" /></>}
                        {action === 'hover_music' && <text x="140" y="60" fontSize="20" fill="#f43f5e" className="animate-bounce">♪</text>}
                    </g>
                ) : isHappy ? (
                    <g>
                        <path d="M60 95 L 75 85 L 90 95" stroke="#333" strokeWidth="4" fill="none" strokeLinecap="round" />
                        <path d="M110 95 L 125 85 L 140 95" stroke="#333" strokeWidth="4" fill="none" strokeLinecap="round" />
                        {(action === 'love' || action === 'hover_love') && <path d="M85 60 Q 100 40 115 60 L 100 80 Z" fill="#f43f5e" transform="translate(0, -20)" className="animate-bounce" />}
                        {action === 'hover_coin' && <g><text x="60" y="95" fontSize="20" className="cat-eye">$</text><text x="110" y="95" fontSize="20" className="cat-eye">$</text></g>}
                    </g>
                ) : isSad ? (
                    <g>
                        <path d="M60 90 Q 75 80 90 90" stroke="#333" strokeWidth="3" fill="none" />
                        <path d="M110 90 Q 125 80 140 90" stroke="#333" strokeWidth="3" fill="none" />
                        <circle cx="65" cy="100" r="3" fill="#60a5fa" opacity="0.6" /><circle cx="135" cy="100" r="3" fill="#60a5fa" opacity="0.6" />
                        {action === 'hover_scared' && <path d="M 60 110 Q 100 130 140 110" stroke="#333" strokeWidth="2" fill="none" />}
                    </g>
                ) : isConfused ? (
                    <g><circle cx="75" cy="90" r="8" fill="#333" /><rect x="115" y="88" width="20" height="4" fill="#333" /><text x="140" y="70" fontSize="30" fill="#333">?</text></g>
                ) : (
                    <g>
                        <g className={isFocused ? '' : 'cat-eye'}><ellipse cx="75" cy="90" rx="8" ry="10" fill={isNinja ? "#fff" : "#333"} /><circle cx="72" cy="86" r="3" fill={isNinja ? "#000" : "#fff"} /></g>
                        <g className={isFocused ? '' : 'cat-eye'}><ellipse cx="125" cy="90" rx="8" ry="10" fill={isNinja ? "#fff" : "#333"} /><circle cx="122" cy="86" r="3" fill={isNinja ? "#000" : "#fff"} /></g>
                    </g>
                )}
                {!isDizzy && !isNinja && <g><path d="M95 108 L 105 108 L 100 113 Z" fill="#fda4af" /><path d="M100 113 Q 90 120 80 115 M 100 113 Q 110 120 120 115" stroke="#333" strokeWidth="2" fill="none" /></g>}
                {(action === 'surf' || action === 'hover_cool') && <g><path d="M55 85 H 95 V 100 H 55 Z M 105 85 H 145 V 100 H 105 Z M 95 90 H 105" fill="#000" stroke="#000" strokeWidth="2" />{action === 'surf' && <path d="M 60 170 Q 100 160 140 180" stroke="#f59e0b" strokeWidth="8" strokeLinecap="round" />}</g>}
                {(action === 'type' || action === 'hover_write') && <g transform="translate(50, 160)"><rect width="100" height="30" fill="#333" rx="5" /><rect x="10" y="5" width="80" height="20" fill="#555" /></g>}
                {action === 'note' && <text x="140" y="160" fontSize="40">✏️</text>}
                {action === 'offer' && <text x="140" y="160" fontSize="40">🎁</text>}
                {(action === 'observe' || action === 'hover_detective') && <text x="130" y="100" fontSize="50" transform="rotate(-15 130 100)">🔍</text>}
                {(action === 'success' || action === 'hover_magic') && <g><circle cx="50" cy="50" r="5" fill="#f00" className="animate-ping" /><circle cx="150" cy="40" r="5" fill="#0f0" className="animate-ping" style={{animationDelay: '0.2s'}} /><circle cx="100" cy="20" r="5" fill="#00f" className="animate-ping" style={{animationDelay: '0.4s'}} />{action === 'hover_magic' && <text x="130" y="80" fontSize="40">🪄</text>}</g>}
                {action === 'hover_popcorn' && <text x="120" y="160" fontSize="40">🍿</text>}
                {action === 'hover_smart' && <path d="M50 60 L 100 40 L 150 60 L 100 80 Z M 150 60 V 90" fill="#374151" stroke="#000" strokeWidth="2" />}
                {action === 'hover_music' && <path d="M50 90 V 60 Q 100 20 150 60 V 90" fill="none" stroke="#ef4444" strokeWidth="8" />}
                {action === 'hover_mechanic' && <text x="140" y="140" fontSize="40" transform="rotate(45 140 140)">🔧</text>}
                {action === 'hover_doctor' && <g><path d="M70 50 H 130 V 30 H 70 Z" fill="#fff" stroke="#ccc" /><path d="M95 35 H 105 M 100 30 V 40" stroke="#f00" strokeWidth="3" /></g>}
                {action === 'hover_game' && <text x="50" y="170" fontSize="40">🎮</text>}
                {action === 'hover_lock' && <text x="140" y="80" fontSize="30">🔒</text>}
                {action === 'hover_camera' && <text x="130" y="150" fontSize="40">📸</text>}
                {action === 'hover_coin' && <g><text x="10" y="60" fontSize="24" className="animate-bounce">💰</text><text x="160" y="40" fontSize="24" className="animate-bounce" style={{animationDelay: '0.1s'}}>💎</text><text x="140" y="150" fontSize="24" className="animate-bounce" style={{animationDelay: '0.2s'}}>💰</text></g>}
                {action === 'hover_point' && <text x="150" y="100" fontSize="40" className="animate-pulse">👆</text>}
                <ellipse cx="70" cy="165" rx="14" ry="10" fill="#fff" stroke="#e5e7eb" strokeWidth="2" className={action.includes('type') || action.includes('write') ? 'cat-paw-l' : ''} />
                <ellipse cx="130" cy="165" rx="14" ry="10" fill="#fff" stroke="#e5e7eb" strokeWidth="2" className={action.includes('type') || action === 'welcome' || action === 'hover_btn' ? 'cat-paw-r' : ''} />
            </svg>
        </div>
    );
};

// --- ANIME DRAGON COMPONENT ---
const AnimeDragon: React.FC<{ action: string, style?: React.CSSProperties }> = ({ action: propAction, style }) => {
    const action = propAction as PetAction;
    const isFire = ['hover_btn', 'hover_input', 'success', 'jump', 'hover_game', 'hover_magic'].includes(action);
    const isFlying = ['fly', 'surf', 'hover_smart', 'hover_music', 'hover_cool'].includes(action);
    const isCloud = ['surf', 'hover_cool'].includes(action);
    const isSleeping = ['sleep', 'hover_sleepy'].includes(action);
    const isHappy = ['love', 'welcome', 'offer', 'hover_love', 'hover_coin', 'hover_point'].includes(action);
    const isAngry = ['panic', 'sad', 'hover_scared'].includes(action);

    return (
        <div className="relative w-32 h-32 md:w-40 md:h-40 pointer-events-none select-none z-[100]">
            <style>{`
                @keyframes dragon-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
                @keyframes dragon-wings { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(10deg); } }
                @keyframes dragon-fire { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.5); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }
                @keyframes dragon-fly-up { 0% { transform: translateY(0); } 50% { transform: translateY(-30px); } 100% { transform: translateY(0); } }
                @keyframes dragon-smoke { 0% { opacity: 0; transform: translateY(0) scale(0.5); } 50% { opacity: 0.6; } 100% { opacity: 0; transform: translateY(-15px) scale(1.2); } }
                @keyframes dragon-cloud-move { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(5px); } }
                @keyframes dragon-money-dance { 0%, 100% { transform: translateY(0) rotate(-5deg); } 50% { transform: translateY(-10px) rotate(5deg); } }
                @keyframes dragon-point { 0%, 100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-10px) rotate(10deg); } }

                .dragon-idle { animation: dragon-float 3s ease-in-out infinite; }
                .dragon-fly { animation: dragon-fly-up 2s ease-in-out infinite; }
                .wing-flap { transform-origin: center left; animation: dragon-wings 0.5s ease-in-out infinite; }
                .wing-flap-slow { transform-origin: center left; animation: dragon-wings 1.5s ease-in-out infinite; }
                .fire-breath { transform-origin: center; animation: dragon-fire 0.6s linear infinite; }
                .smoke-puff { transform-origin: center; animation: dragon-smoke 2s linear infinite; }
                .cloud-float { animation: dragon-cloud-move 2s ease-in-out infinite; }
                .anim-hover_coin { animation: dragon-money-dance 0.4s ease-in-out infinite; }
                .anim-hover_point { animation: dragon-point 0.5s ease-in-out infinite; }
            `}</style>

            <svg viewBox="0 0 200 200" className={`w-full h-full drop-shadow-2xl transition-all duration-500 ${isFlying ? 'dragon-fly' : action === 'hover_coin' ? 'anim-hover_coin' : action === 'hover_point' ? 'anim-hover_point' : 'dragon-idle'}`} style={style}>
                {isCloud && <g className="cloud-float" transform="translate(0, 160)"><ellipse cx="60" cy="10" rx="30" ry="15" fill="#e0f2fe" opacity="0.8" /><ellipse cx="100" cy="15" rx="40" ry="20" fill="#e0f2fe" opacity="0.9" /><ellipse cx="140" cy="10" rx="30" ry="15" fill="#e0f2fe" opacity="0.8" /></g>}
                <g transform="translate(130, 80)"><path d="M0 0 Q 40 -40 60 -10 Q 30 10 0 0" fill="#fbbf24" stroke="#d97706" strokeWidth="2" className={isFlying || isFire ? 'wing-flap' : 'wing-flap-slow'} /></g>
                <path d="M60 140 Q 20 160 30 120" stroke="#10b981" strokeWidth="12" fill="none" strokeLinecap="round" className="dragon-tail" /><path d="M25 115 L 35 125 L 20 130" fill="#fbbf24" />
                <ellipse cx="100" cy="140" rx="50" ry="40" fill="#10b981" /><ellipse cx="100" cy="140" rx="30" ry="25" fill="#a7f3d0" />
                <g transform="translate(70, 80) scale(-1, 1)"><path d="M0 0 Q 40 -40 60 -10 Q 30 10 0 0" fill="#fbbf24" stroke="#d97706" strokeWidth="2" className={isFlying || isFire ? 'wing-flap' : 'wing-flap-slow'} /></g>
                <g transform={isFlying ? "translate(0, -10)" : "translate(0,0)"}>
                    <circle cx="100" cy="90" r="45" fill="#10b981" />
                    <path d="M70 60 L 60 30 L 85 50 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2" /><path d="M130 60 L 140 30 L 115 50 Z" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
                    {isSleeping ? <g><path d="M70 90 Q 80 100 90 90" stroke="#064e3b" strokeWidth="3" fill="none" /><path d="M110 90 Q 120 100 130 90" stroke="#064e3b" strokeWidth="3" fill="none" /><circle cx="110" cy="95" r="10" fill="rgba(255,255,255,0.5)" className="smoke-puff" /></g> : isHappy ? <g><path d="M70 85 Q 80 75 90 85" stroke="#064e3b" strokeWidth="3" fill="none" /><path d="M110 85 Q 120 75 130 85" stroke="#064e3b" strokeWidth="3" fill="none" /></g> : <g><circle cx="80" cy="85" r="5" fill="#064e3b" /><circle cx="120" cy="85" r="5" fill="#064e3b" /></g>}
                    <ellipse cx="100" cy="105" rx="15" ry="10" fill="#34d399" /><circle cx="95" cy="105" r="2" fill="#064e3b" /><circle cx="105" cy="105" r="2" fill="#064e3b" />
                    {isFire && <g transform="translate(100, 115)"><circle cx="0" cy="10" r="10" fill="#ef4444" opacity="0.8" className="fire-breath" /><circle cx="-5" cy="20" r="8" fill="#f97316" opacity="0.8" className="fire-breath" style={{animationDelay: '0.1s'}} /><circle cx="5" cy="25" r="6" fill="#fbbf24" opacity="0.8" className="fire-breath" style={{animationDelay: '0.2s'}} /></g>}
                    {isAngry && <g><circle cx="60" cy="60" r="8" fill="#52525b" className="smoke-puff" /><circle cx="140" cy="60" r="8" fill="#52525b" className="smoke-puff" style={{animationDelay: '0.5s'}} /></g>}
                </g>
                {action === 'note' && <text x="130" y="150" fontSize="30" transform="rotate(20 130 150)">📜</text>}
                {action === 'hover_coin' && <g><text x="30" y="60" fontSize="30" className="animate-bounce">💎</text><text x="150" y="160" fontSize="30" className="animate-bounce" style={{animationDelay: '0.2s'}}>💰</text></g>}
                {action === 'hover_point' && <text x="150" y="100" fontSize="40" className="animate-pulse">👆</text>}
            </svg>
        </div>
    );
};

const StudyBuddy: React.FC = () => {
    // USE CONTEXT instead of local state for triggers
    const { currentReaction, triggerReaction, petDialogue, petPosition, setPetPosition, say } = useContext(PetContext)!; // NEW: get petPosition & setPetPosition
    const { db } = useContext(DataContext)!; // Get DB for equipped pet
    const { isPlaying, currentTrack } = useContext(MusicContext)!; // New: Get Music State
    
    // Internal state just for idle timer
    const idleTimerRef = useRef<number | null>(null);
    const lastScrollY = useRef(0);

    const resetIdleTimer = useCallback(() => {
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        idleTimerRef.current = window.setTimeout(() => {
            triggerReaction('sleep');
        }, 10000); // Sleep after 10s idle
    }, [triggerReaction]);

    // --- EFFECT: Calculate Music Vibe ---
    const effectiveAction = (isPlaying && (currentReaction === 'idle' || currentReaction === 'sleep')) 
        ? 'hover_music' 
        : currentReaction;

    const tempoStyle: React.CSSProperties = React.useMemo(() => {
        if (!isPlaying || !currentTrack) return {};
        
        let duration = '1s';
        if (currentTrack.tempo === 'slow') duration = '3s'; // Slow Lofi
        if (currentTrack.tempo === 'fast') duration = '0.5s'; // Fast Rock/Synth

        return { animationDuration: duration };
    }, [isPlaying, currentTrack]);

    // --- EXIT INTENT LOGIC ---
    useEffect(() => {
        const handleMouseLeave = (e: MouseEvent) => {
            // Detect if mouse left via the top
            if (e.clientY <= 5) { 
                // Set Global Pet Position to "Hanging"
                setPetPosition({
                    top: '0px',
                    left: '50%',
                    transform: 'translateX(-50%) translateY(10%)',
                    zIndex: 9999, // On top of everything
                    position: 'fixed'
                });
                triggerReaction('panic'); // Looks like holding on? Or 'fly'
                say("Đừng bỏ tớ mà! 😭 Còn một chút nữa là xong rồi!", 5000);
            }
        };

        const handleMouseEnter = () => {
            // If pet was hanging, reset position
            if (petPosition && petPosition.top === '0px') {
                setPetPosition(null); // Revert to default
                triggerReaction('love');
                say("Yay! Cậu đã quay lại! ❤️", 3000);
            }
        };

        document.addEventListener('mouseleave', handleMouseLeave);
        document.addEventListener('mouseenter', handleMouseEnter);
        return () => {
            document.removeEventListener('mouseleave', handleMouseLeave);
            document.removeEventListener('mouseenter', handleMouseEnter);
        };
    }, [petPosition, setPetPosition, triggerReaction, say]);


    // --- EVENT LISTENERS ---
    useEffect(() => {
        const handleScroll = () => {
            const currentY = window.scrollY;
            if (Math.abs(currentY - lastScrollY.current) > 20) {
                if (currentY > lastScrollY.current) triggerReaction('surf');
                else triggerReaction('fly');
                lastScrollY.current = currentY;
            }
            resetIdleTimer();
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (currentReaction.startsWith('hover_')) return; // Priority to hover events
            
            if (e.key === 'Enter') triggerReaction('success');
            else if (e.key === 'Backspace' || e.key === 'Delete') triggerReaction('panic');
            else if (e.key === ' ') triggerReaction('jump');
            else if ((e.ctrlKey || e.metaKey) && e.key === 'c') triggerReaction('note');
            else if ((e.ctrlKey || e.metaKey) && e.key === 'v') triggerReaction('offer');
            else if (e.key.length === 1) triggerReaction('type'); 
            resetIdleTimer();
        };

        const handleMouseEnter = () => triggerReaction('welcome');
        const handleMouseLeave = () => triggerReaction('sad');
        const handleSelectionChange = () => {
            const selection = window.getSelection();
            if (selection && selection.toString().length > 0) {
                triggerReaction('observe');
            }
        };
        const handleResize = () => triggerReaction('dizzy');
        const handleClick = () => triggerReaction('poke');
        const handleDblClick = () => triggerReaction('love');
        const handleContextMenu = () => triggerReaction('confused');

        // Attach listeners
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('keydown', handleKeyDown);
        document.body.addEventListener('mouseleave', handleMouseLeave);
        document.body.addEventListener('mouseenter', handleMouseEnter);
        document.addEventListener('selectionchange', handleSelectionChange);
        window.addEventListener('resize', handleResize);
        window.addEventListener('click', handleClick);
        window.addEventListener('dblclick', handleDblClick);
        window.addEventListener('contextmenu', handleContextMenu);

        resetIdleTimer();

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('keydown', handleKeyDown);
            document.body.removeEventListener('mouseleave', handleMouseLeave);
            document.body.removeEventListener('mouseenter', handleMouseEnter);
            document.removeEventListener('selectionchange', handleSelectionChange);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('click', handleClick);
            window.removeEventListener('dblclick', handleDblClick);
            window.removeEventListener('contextmenu', handleContextMenu);
            if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        };
    }, [triggerReaction, resetIdleTimer, currentReaction]);

    // Determine current pet from DB
    const currentPet = db.GAMIFICATION.equippedPet || 'pet_cat';

    // Default Position vs Context Position
    const defaultStyle: React.CSSProperties = {
        position: 'fixed',
        bottom: '5rem',
        right: '1.5rem',
        zIndex: 60,
        pointerEvents: 'auto',
        transition: 'all 1s ease-in-out' // Smooth transition for position changes
    };

    const finalStyle = petPosition ? { ...defaultStyle, ...petPosition } : defaultStyle;

    return (
        <div style={finalStyle}>
            {petDialogue && (
                <div className="absolute bottom-full right-0 mb-4 w-64 bg-white/90 backdrop-blur-md border border-blue-200 text-gray-800 p-4 rounded-2xl rounded-br-none shadow-[0_10px_30px_rgba(0,0,0,0.2)] animate-pop-in z-20">
                    <p className="text-sm font-medium leading-relaxed">{petDialogue}</p>
                    {/* Speech Bubble Arrow */}
                    <div className="absolute -bottom-2 right-6 w-4 h-4 bg-white/90 border-r border-b border-blue-200 transform rotate-45"></div>
                </div>
            )}
            
            {currentPet === 'pet_dragon' ? (
                <AnimeDragon action={effectiveAction} style={tempoStyle} />
            ) : (
                <AnimeCat action={effectiveAction} style={tempoStyle} />
            )}
        </div>
    );
};

export default StudyBuddy;
