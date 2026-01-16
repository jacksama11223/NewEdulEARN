
// ... existing imports ...
import React, { useState, useContext, useMemo, useEffect, useCallback, useRef } from 'react';
import { AuthContext, DataContext, GlobalStateContext, PageContext, PetContext } from '../../contexts/AppProviders';
import { enhanceNoteWithGemini, callGeminiApi, transformNoteToLesson, refineTextWithOracle, checkNoteConnections } from '../../services/geminiService';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal'; 
import OnboardingTour, { TourStep } from '../common/OnboardingTour';
import type { PersonalNote, StudyGroup, User, Course } from '../../types';

// ... existing helper insertTextAtCursor ...
const insertTextAtCursor = (input: HTMLTextAreaElement, prefix: string, suffix: string) => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const text = input.value;
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);

    const newText = before + prefix + selection + suffix + after;
    const newCursorPos = selection.length === 0 ? start + prefix.length : end + prefix.length + suffix.length;

    return { newText, newCursorPos };
};

const NotebookPage: React.FC = () => {
    // Destructure addLessonToCourse, createFlashcardDeck, addTask
    const { user } = useContext(AuthContext)!;
    const { db, createPersonalNote, updatePersonalNote, deletePersonalNote, savePdfToNote, getPdfForNote, removePdfFromNote, shareNoteToSquadron, unshareNote, sendChatMessage, addLessonToCourse, createFlashcardDeck, addTask } = useContext(DataContext)!;
    const { setPage: setGlobalPage } = useContext(GlobalStateContext)!;
    const { navigate } = useContext(PageContext)!;
    const { triggerReaction, say } = useContext(PetContext)!;

    // ... existing states ...
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'assignment' | 'path'>('all');
    
    // Editor State
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [linkedAssignmentId, setLinkedAssignmentId] = useState('');
    const [linkedPathId, setLinkedPathId] = useState('');
    const [isPinned, setIsPinned] = useState(false);
    const [sharedWithSquadronId, setSharedWithSquadronId] = useState<string | undefined>(undefined);
    
    const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split' | 'pdf_split'>('split');

    // AI State
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiResult, setAiResult] = useState<string | null>(null);
    const [aiConnectionSuggestions, setAiConnectionSuggestions] = useState<{ noteTitle: string, reason: string }[]>([]);

    // PDF State
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [citationPage, setCitationPage] = useState<string>('1');
    const pdfUploadRef = useRef<HTMLInputElement>(null);

    // Modal State
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isFriendShareModalOpen, setIsFriendShareModalOpen] = useState(false);
    const [isConvertLessonModalOpen, setIsConvertLessonModalOpen] = useState(false);
    const [selectedCourseForLesson, setSelectedCourseForLesson] = useState<string>('');
    const [isTransformingLesson, setIsTransformingLesson] = useState(false);

    // Autocomplete Link State
    const [showLinkSuggestions, setShowLinkSuggestions] = useState(false);
    const [linkSearchTerm, setLinkSearchTerm] = useState('');
    
    // --- NEW: INTERACTIVE TOOLTIP STATE ---
    const [selectedText, setSelectedText] = useState('');
    const [tooltipPos, setTooltipPos] = useState<{ top: number, left: number } | null>(null);

    // ONBOARDING TOUR STATE
    const [isTourOpen, setIsTourOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const analysisTimeoutRef = useRef<number | null>(null);

    // Derived Data
    const myNotes = useMemo(() => {
        if (!user) return [];
        const notes = (Object.values(db.PERSONAL_NOTES || {}) as PersonalNote[])
            .filter(n => n.userId === user.id)
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        
        return notes.filter(n => {
            const matchesSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) || n.content.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = filter === 'all' 
                ? true 
                : filter === 'assignment' ? !!n.linkedAssignmentId 
                : !!n.linkedPathId;
            return matchesSearch && matchesFilter;
        });
    }, [db.PERSONAL_NOTES, user, searchQuery, filter]);

    const mySquadrons = useMemo(() => db.STUDY_GROUPS.filter(g => g.members.includes(user?.id || '')), [db.STUDY_GROUPS, user?.id]);
    const friends = useMemo(() => (Object.values(db.USERS) as User[]).filter(u => u.id !== user?.id), [db.USERS, user?.id]);
    
    const backlinks = useMemo(() => {
        if (!title || selectedNoteId === 'new' || !selectedNoteId) return [];
        return myNotes.filter(n => n.id !== selectedNoteId && n.content.includes(`[[${title}]]`));
    }, [myNotes, title, selectedNoteId]);

    const filteredLinkSuggestions = useMemo(() => {
        if (!showLinkSuggestions) return [];
        return myNotes
            .filter(n => n.id !== selectedNoteId && n.title.toLowerCase().includes(linkSearchTerm.toLowerCase()))
            .slice(0, 5); 
    }, [showLinkSuggestions, myNotes, linkSearchTerm, selectedNoteId]);

    const myTeachableCourses = useMemo(() => {
        if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN')) return [];
        if (user.role === 'ADMIN') return db.COURSES;
        return db.COURSES.filter(c => c.teacher === user.name);
    }, [db.COURSES, user]);

    // ... existing useEffect ...
    useEffect(() => {
        if (selectedNoteId && selectedNoteId !== 'new' && db.PERSONAL_NOTES[selectedNoteId]) {
            const note = db.PERSONAL_NOTES[selectedNoteId];
            setTitle(note.title);
            setContent(note.content);
            setLinkedAssignmentId(note.linkedAssignmentId || '');
            setLinkedPathId(note.linkedPathId || '');
            setIsPinned(note.isPinned || false);
            setSharedWithSquadronId(note.sharedWithSquadronId);
            setAiResult(null);
            setAiConnectionSuggestions([]);

            if (note.pdfFileId) {
                getPdfForNote(note.pdfFileId).then(file => {
                    if (file) {
                        setPdfFile(file);
                        const url = URL.createObjectURL(file);
                        setPdfUrl(url);
                        setViewMode('pdf_split');
                    } else {
                        setPdfFile(null);
                        setPdfUrl(null);
                    }
                });
            } else {
                setPdfFile(null);
                setPdfUrl(null);
                if(viewMode === 'pdf_split') setViewMode('split');
            }

        } else if (selectedNoteId === 'new') {
            setTitle('');
            setContent('');
            setLinkedAssignmentId('');
            setLinkedPathId('');
            setIsPinned(false);
            setSharedWithSquadronId(undefined);
            setAiResult(null);
            setAiConnectionSuggestions([]);
            setPdfFile(null);
            setPdfUrl(null);
            setViewMode('split');
        }
        return () => {
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        };
    }, [selectedNoteId, db.PERSONAL_NOTES, getPdfForNote]);

    // --- ONBOARDING EFFECT ---
    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenNotebookTour');
        if (!hasSeenTour) {
            setTimeout(() => setIsTourOpen(true), 1500);
        }
    }, []);

    const handleTourComplete = () => {
        setIsTourOpen(false);
        localStorage.setItem('hasSeenNotebookTour', 'true');
    };

    const tourSteps: TourStep[] = [
        {
            targetId: 'btn-share-intel',
            title: 'Kinh tế Tri thức',
            content: 'Viết note hay? Hãy chia sẻ cho Phi đội.',
            position: 'bottom'
        },
        {
            targetId: 'btn-share-intel',
            title: 'Thu nhập thụ động',
            content: 'Nếu ai đó mở khóa note của bạn, bạn sẽ nhận được XP hoa hồng!',
            position: 'left'
        }
    ];

    // --- TEXT SELECTION HANDLER ---
    const handleTextSelect = () => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0 && textareaRef.current && textareaRef.current.contains(selection.anchorNode)) {
            // Get position relative to viewport but clamp to text area
            // Actually, for textarea, standard selection Rect might be tricky if it's plain text.
            // But we can approximate using mouseup event coordinates if needed, 
            // or just center it over the textarea if precise positioning is hard.
            // Let's use a simple approach: if selection exists, check mouse position from event? 
            // Better: use the event passed to onMouseUp
        } else {
            setTooltipPos(null);
            setSelectedText('');
        }
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        if (text && text.length > 0 && textareaRef.current?.contains(e.target as Node)) {
            setSelectedText(text);
            // Calculate tooltip position near mouse cursor
            const textAreaRect = textareaRef.current.getBoundingClientRect();
            // Ensure tooltip is within bounds
            const top = Math.max(textAreaRect.top, e.clientY - 50);
            const left = Math.min(textAreaRect.right - 200, Math.max(textAreaRect.left, e.clientX - 100));
            
            setTooltipPos({ top, left });
        } else {
            setTooltipPos(null);
            setSelectedText('');
        }
    };

    // --- MANUAL ACTION HANDLERS ---
    const handleManualCreateTask = () => {
        if (!user || !selectedText) return;
        addTask(user.id, selectedText);
        setTooltipPos(null);
        alert("✅ Đã tạo Task mới!");
        triggerReaction('note');
    };

    const handleManualCreateFlashcard = () => {
        if (!selectedText) return;
        const deckName = `Inbox Deck (${new Date().toLocaleDateString()})`;
        // Create a simple deck or add to existing 'Inbox' if logic allows. 
        // For now, simple create new deck with 1 card.
        createFlashcardDeck(deckName, [{
            id: `fc_${Date.now()}`,
            front: selectedText,
            back: "...", // User fills later
            box: 0, 
            nextReview: 0
        }]);
        setTooltipPos(null);
        alert("🃏 Đã tạo Flashcard mới trong Inbox Deck! Hãy vào sửa mặt sau.");
        triggerReaction('success');
    };

    const handleManualCopy = () => {
        navigator.clipboard.writeText(selectedText);
        setTooltipPos(null);
        // Visual feedback
        const btn = document.getElementById('btn-copy-manual');
        if(btn) btn.innerText = "Copied!";
    };

    // ... existing handlers ...
    const handleCreateNew = () => { setSelectedNoteId('new'); setViewMode('split'); };
    const handleSave = () => {
        if (!user || !title.trim()) { alert("Vui lòng nhập tiêu đề."); return; }
        const links = { assignmentId: linkedAssignmentId || undefined, pathId: linkedPathId || undefined };
        if (selectedNoteId === 'new') {
            createPersonalNote(user.id, title, content, links);
            alert("Đã tạo ghi chú mới!");
            setSelectedNoteId(null); 
        } else if (selectedNoteId) {
            updatePersonalNote(selectedNoteId, { title, content, linkedAssignmentId: links.assignmentId, linkedPathId: links.pathId, isPinned });
        }
    };
    const handleDelete = (id: string) => {
        if (window.confirm("Bạn chắc chắn muốn xóa ghi chú này?")) {
            deletePersonalNote(id);
            if (selectedNoteId === id) setSelectedNoteId(null);
        }
    };
    const handleShareClick = () => {
        if (!selectedNoteId || selectedNoteId === 'new') { alert("Vui lòng lưu ghi chú trước khi chia sẻ."); return; }
        setIsShareModalOpen(true);
    };
    const handleFriendShareClick = () => {
        if (!selectedNoteId || selectedNoteId === 'new') { alert("Vui lòng lưu ghi chú trước khi chia sẻ."); return; }
        setIsFriendShareModalOpen(true);
    };
    const handleSendToFriend = (friendId: string) => {
        if (!user || !selectedNoteId) return;
        const intelPayload = { noteId: selectedNoteId, title: title, preview: content.substring(0, 100) + '...', fullContent: content };
        sendChatMessage(user.id, friendId, `[Peer Review Request] Nhờ cậu xem giúp ghi chú này: "${title}"`, undefined, intelPayload);
        alert(`Đã gửi yêu cầu Peer Review đến ${db.USERS[friendId].name}!`);
        setIsFriendShareModalOpen(false);
        navigate('chat');
    };
    const handlePlantTree = () => {
        if (!title.trim() && !content.trim()) { alert("Ghi chú trống."); return; }
        navigate('learning_path_creator', { initialTitle: title, initialContent: content, fromNotebook: true, timestamp: Date.now() });
    };
    const handleAskOracle = () => {
        if (!content.trim()) { alert("Ghi chú trống."); return; }
        const contextPrompt = `Dựa vào ghi chú của tôi:\n\n**${title}**\n${content}\n\n`;
        navigate('gemini_student', { initialPrompt: contextPrompt, fromNotebook: true, timestamp: Date.now() });
    };
    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedNoteId || selectedNoteId === 'new') { if(selectedNoteId === 'new') alert("Vui lòng lưu ghi chú trước khi tải PDF."); return; }
        if (file.type !== 'application/pdf') { alert("Chỉ hỗ trợ định dạng PDF."); return; }
        await savePdfToNote(selectedNoteId, file);
        setPdfFile(file);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
        setViewMode('pdf_split');
    };
    const handleRemovePdf = () => {
        if (selectedNoteId && window.confirm("Xóa PDF đính kèm?")) { removePdfFromNote(selectedNoteId); setPdfFile(null); setPdfUrl(null); setViewMode('split'); }
    };

    const handleFindConnections = async (isBackground = false) => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            if (!isBackground) setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }
        if (!content.trim() || content.length < 20) return; 

        if (!isBackground) {
            setIsAiProcessing(true);
            setAiConnectionSuggestions([]);
        }

        try {
            const otherNotes = myNotes.filter(n => n.id !== selectedNoteId).map(n => ({ id: n.id, title: n.title, content: n.content }));
            const suggestions = await checkNoteConnections(apiKey, content, otherNotes);
            
            if (suggestions.length > 0) { 
                setAiConnectionSuggestions(suggestions);
                if (isBackground) {
                    triggerReaction('hover_point');
                    say("Bác sĩ Note vừa tìm thấy liên kết thú vị! Xem ngay bên dưới nhé.", 5000);
                }
            } else if (!isBackground) { 
                alert("Bác sĩ Note: Không tìm thấy triệu chứng liên kết nào! (Ghi chú này có vẻ độc lập)"); 
            }
        } catch (e) { 
            console.error("AI Connection Error", e); 
        } finally { 
            if (!isBackground) setIsAiProcessing(false); 
        }
    };

    const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        const cursorPosition = e.target.selectionStart;
        const textBeforeCursor = newContent.substring(0, cursorPosition);
        const match = textBeforeCursor.match(/\[\[([^\]\n]*)$/);
        if (match) { setLinkSearchTerm(match[1]); setShowLinkSuggestions(true); } else { setShowLinkSuggestions(false); }

        if (analysisTimeoutRef.current) clearTimeout(analysisTimeoutRef.current);
        analysisTimeoutRef.current = window.setTimeout(() => {
            handleFindConnections(true); 
        }, 4000); 
    };

    const insertLinkSuggestion = (noteTitle: string) => {
        if (!textareaRef.current) return;
        const cursorPosition = textareaRef.current.selectionStart;
        const textBeforeCursor = content.substring(0, cursorPosition);
        const textAfterCursor = content.substring(cursorPosition);
        const lastOpenBracket = textBeforeCursor.lastIndexOf('[[');
        if (lastOpenBracket !== -1) {
            const newText = content.substring(0, lastOpenBracket) + `[[${noteTitle}]]` + textAfterCursor;
            setContent(newText);
            setShowLinkSuggestions(false);
            setTimeout(() => { if(textareaRef.current) { const newPos = lastOpenBracket + noteTitle.length + 4; textareaRef.current.focus(); textareaRef.current.setSelectionRange(newPos, newPos); } }, 0);
        }
    };

    const insertCitation = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (!text) { alert("Clipboard trống."); return; }
            const page = prompt("Trích dẫn này ở trang số mấy?", citationPage);
            if (page) {
                setCitationPage(page);
                const citation = `> "${text.trim()}" [[pdf:page=${page}]]\n\n`;
                const { newText, newCursorPos } = insertTextAtCursor(textareaRef.current!, citation, "");
                setContent(newText);
                setTimeout(() => { if(textareaRef.current) { textareaRef.current.focus(); textareaRef.current.selectionStart = newCursorPos; textareaRef.current.selectionEnd = newCursorPos; } }, 0);
            }
        } catch (err) { alert("Không thể truy cập Clipboard."); }
    };
    const handleAiAction = async (action: 'summarize' | 'expand' | 'fix' | 'quiz' | 'chat_pdf') => {
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) { setGlobalPage('api_key', { isApiKeyModalOpen: true }); return; }
        setIsAiProcessing(true);
        setAiResult(null);
        try {
            if (action === 'chat_pdf' && pdfFile) {
                const reader = new FileReader();
                reader.readAsDataURL(pdfFile);
                reader.onload = async () => {
                    const base64 = (reader.result as string).split(',')[1];
                    const result = await callGeminiApi(apiKey, "Hãy tóm tắt các ý chính của tài liệu này.", null, { useThinking: true, fileData: { mimeType: 'application/pdf', data: base64 } });
                    setAiResult(result);
                    setIsAiProcessing(false);
                };
            } else {
                if (!content.trim()) return;
                const result = await enhanceNoteWithGemini(apiKey, content, action as any);
                setAiResult(result);
                setIsAiProcessing(false);
            }
        } catch (e) { alert("Lỗi kết nối AI."); setIsAiProcessing(false); }
    };
    const insertAiResult = () => { if (aiResult) { setContent(prev => prev + "\n\n--- AI Assistant ---\n" + aiResult); setAiResult(null); } };
    const applySyntax = (prefix: string, suffix: string) => {
        if (textareaRef.current) {
            const { newText, newCursorPos } = insertTextAtCursor(textareaRef.current, prefix, suffix);
            setContent(newText);
            setTimeout(() => { if(textareaRef.current) { textareaRef.current.focus(); textareaRef.current.selectionStart = newCursorPos; textareaRef.current.selectionEnd = newCursorPos; } }, 0);
        }
    };
    const handleWikiLinkClick = (linkContent: string) => {
        if (linkContent.startsWith("pdf:page=")) {
            const page = linkContent.split('=')[1];
            if (pdfUrl) {
                const baseUrl = pdfUrl.split('#')[0];
                const viewer = document.getElementById('pdf-viewer') as HTMLIFrameElement;
                if(viewer) viewer.src = `${baseUrl}#page=${page}`;
            }
            return;
        }
        const targetNote = myNotes.find(n => n.title.toLowerCase() === linkContent.toLowerCase());
        if (targetNote) { setSelectedNoteId(targetNote.id); } else { if(window.confirm(`Ghi chú "[[${linkContent}]]" chưa tồn tại. Tạo mới?`)) { setSelectedNoteId('new'); setTitle(linkContent); setContent(`# ${linkContent}\n\nĐược liên kết từ bài trước.`); } }
    };
    const renderMarkdown = (text: string) => {
        if (!text) return <p className="text-gray-500 italic">Trống...</p>;
        return text.split('\n').map((line, index) => {
            let renderedLine: React.ReactNode = line;
            let className = "text-gray-300 min-h-[1.5em]";
            if (line.startsWith('# ')) { className = "text-3xl font-bold text-white mt-4 mb-2 border-b border-gray-700 pb-1"; renderedLine = line.substring(2); }
            else if (line.startsWith('## ')) { className = "text-2xl font-bold text-blue-200 mt-3 mb-2"; renderedLine = line.substring(3); }
            else if (line.startsWith('### ')) { className = "text-xl font-bold text-purple-200 mt-2 mb-1"; renderedLine = line.substring(4); }
            else if (line.startsWith('> ')) { className = "border-l-4 border-yellow-500 pl-4 italic text-gray-400 my-2"; renderedLine = line.substring(2); }
            else if (line.startsWith('- ')) { className = "list-disc list-inside text-gray-300 ml-4"; renderedLine = line.substring(2); }
            const parseInline = (text: string): React.ReactNode[] => {
                const parts: React.ReactNode[] = [];
                let buffer = "";
                let i = 0;
                while (i < text.length) {
                    if (text.startsWith('[[', i)) {
                        if (buffer) parts.push(buffer); buffer = "";
                        const end = text.indexOf(']]', i);
                        if (end > -1) {
                            const linkContent = text.substring(i + 2, end);
                            const isPdfLink = linkContent.startsWith("pdf:");
                            const exists = isPdfLink ? true : myNotes.some(n => n.title.toLowerCase() === linkContent.toLowerCase());
                            parts.push(<span key={i} onClick={() => handleWikiLinkClick(linkContent)} className={`cursor-pointer transition-colors font-semibold px-1 rounded ${isPdfLink ? 'text-yellow-400 hover:bg-yellow-900/50 border border-yellow-600' : (exists ? 'text-blue-400 hover:underline' : 'text-gray-500 hover:text-gray-400')}`} title={isPdfLink ? "Nhảy đến trang PDF" : (exists ? "Đi đến ghi chú" : "Ghi chú chưa tồn tại")}>{isPdfLink ? `📄 Page ${linkContent.split('=')[1]}` : `[[${linkContent}]]`}</span>);
                            i = end + 2; continue;
                        }
                    }
                    if (text.startsWith('==', i)) {
                        if (buffer) parts.push(buffer); buffer = "";
                        const end = text.indexOf('==', i + 2);
                        if (end > -1) { const highlightContent = text.substring(i + 2, end); parts.push(<mark key={i} className="bg-yellow-500/30 text-yellow-100 px-1 rounded mx-0.5">{highlightContent}</mark>); i = end + 2; continue; }
                    }
                    if (text.startsWith('**', i)) {
                        if (buffer) parts.push(buffer); buffer = "";
                        const end = text.indexOf('**', i + 2);
                        if (end > -1) { const boldContent = text.substring(i + 2, end); parts.push(<strong key={i} className="text-white">{boldContent}</strong>); i = end + 2; continue; }
                    }
                    buffer += text[i]; i++;
                }
                if (buffer) parts.push(buffer);
                return parts;
            };
            if (typeof renderedLine === 'string') { renderedLine = parseInline(renderedLine); }
            return <div key={index} className={className}>{renderedLine}</div>;
        });
    };

    const handleConvertClick = () => {
        if (!title.trim() || !content.trim()) {
            alert("Vui lòng lưu nội dung ghi chú trước khi soạn bài.");
            return;
        }
        setIsConvertLessonModalOpen(true);
    };

    const confirmConvertLesson = async () => {
        if (!selectedCourseForLesson || !user) return;
        
        const apiKey = db.USERS[user.id]?.apiKey;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsTransformingLesson(true);
        try {
            const lessonContent = await transformNoteToLesson(apiKey, title, content);
            addLessonToCourse(selectedCourseForLesson, title, lessonContent);
            alert("✅ Đã soạn bài giảng thành công! \nBài học mới đã được thêm vào cuối khóa học.");
            setIsConvertLessonModalOpen(false);
        } catch (e: any) {
            alert("Lỗi AI: " + e.message);
        } finally {
            setIsTransformingLesson(false);
        }
    };

    const handleRefineNote = async () => {
        if (!content.trim()) return;
        const apiKey = user ? db.USERS[user.id]?.apiKey : null;
        if (!apiKey) {
            setGlobalPage('api_key', { isApiKeyModalOpen: true });
            return;
        }

        setIsAiProcessing(true);
        try {
            const refined = await refineTextWithOracle(apiKey, content);
            setContent(refined);
        } catch (e: any) {
            alert("Lỗi Oracle: " + e.message);
        } finally {
            setIsAiProcessing(false);
        }
    };

    if (!user) return null;

    return (
        <div className="h-[calc(100vh-100px)] flex gap-4 pb-4 relative">
            
            {/* INTERACTIVE TOOLTIP */}
            {tooltipPos && (
                <div 
                    className="fixed z-50 flex flex-col gap-1 bg-gray-900 border border-blue-500/50 rounded-lg shadow-xl p-1 animate-pop-in pointer-events-auto"
                    style={{ top: tooltipPos.top, left: tooltipPos.left }}
                >
                    <div className="flex gap-1">
                        <button onClick={handleManualCreateTask} className="btn btn-xs bg-green-600 hover:bg-green-500 text-white flex items-center gap-1">
                            ✅ Task
                        </button>
                        <button onClick={handleManualCreateFlashcard} className="btn btn-xs bg-yellow-600 hover:bg-yellow-500 text-black font-bold flex items-center gap-1">
                            🃏 Card
                        </button>
                        <button id="btn-copy-manual" onClick={handleManualCopy} className="btn btn-xs bg-gray-700 hover:bg-gray-600 text-white flex items-center gap-1">
                            📋 Copy
                        </button>
                    </div>
                    <div className="w-2 h-2 bg-gray-900 border-b border-r border-blue-500/50 transform rotate-45 self-center -mt-1"></div>
                </div>
            )}

            <div className="w-1/5 min-w-[200px] flex flex-col gap-4 hidden md:flex">
                <div className="p-4 bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl shadow-lg">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 flex items-center gap-2 mb-4">
                        <span>📓</span> Sổ Tay
                    </h2>
                    <button onClick={handleCreateNew} className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-lg border border-white/10 hover:scale-[1.02] transition-all mb-4">
                        + Ghi Chú Mới
                    </button>
                    <div className="space-y-2">
                        <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" placeholder="Tìm kiếm..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                        <div className="flex gap-2">
                            <button onClick={() => setFilter('all')} className={`flex-1 text-[10px] font-bold py-1 rounded ${filter==='all' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}>ALL</button>
                            <button onClick={() => setFilter('assignment')} className={`flex-1 text-[10px] font-bold py-1 rounded ${filter==='assignment' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-400'}`}>BÀI TẬP</button>
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                    {myNotes.map(note => (
                        <div key={note.id} onClick={() => setSelectedNoteId(note.id)} className={`p-4 rounded-xl border cursor-pointer transition-all group relative overflow-hidden ${selectedNoteId === note.id ? 'bg-blue-900/30 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-black/20 border-white/5 hover:bg-white/5'}`}>
                            <div className="flex justify-between items-start mb-1">
                                <h3 className={`font-bold truncate pr-4 ${selectedNoteId === note.id ? 'text-white' : 'text-gray-300'}`}>
                                    {note.isPinned && <span className="text-yellow-400 mr-1">📌</span>}
                                    {note.title || 'Không tiêu đề'}
                                </h3>
                                {note.sharedWithSquadronId && <span className="text-[10px] bg-green-500 text-black px-1 rounded ml-1 animate-pulse">SHARED</span>}
                                {note.pdfFileId && <span className="text-[10px] text-red-400 border border-red-500/50 px-1 rounded ml-1">PDF</span>}
                                <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                            </div>
                            <p className="text-xs text-gray-500 line-clamp-2 font-mono">{note.content.substring(0, 50)}</p>
                        </div>
                    ))}
                    {myNotes.length === 0 && <p className="text-center text-gray-500 text-sm mt-4">Chưa có ghi chú nào.</p>}
                </div>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-4 overflow-hidden relative">
                <div className={`flex flex-col bg-black/40 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${viewMode === 'pdf_split' ? 'w-full md:w-1/2' : 'w-full'}`}>
                    {!selectedNoteId ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                            <div className="text-6xl mb-4 opacity-50">📝</div>
                            <p>Chọn một ghi chú hoặc tạo mới để bắt đầu.</p>
                            <button onClick={handleCreateNew} className="mt-4 btn btn-secondary">Tạo mới ngay</button>
                        </div>
                    ) : (
                        <>
                            <div className="p-4 border-b border-white/10 flex flex-col space-y-3 bg-white/5">
                                <div className="flex justify-between items-center gap-4">
                                    <input 
                                        type="text" 
                                        className="bg-transparent text-xl font-bold text-white placeholder-gray-500 focus:outline-none flex-1 min-w-0" 
                                        placeholder="Tiêu đề ghi chú..."
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                    />
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button 
                                            type="button"
                                            onClick={handleAskOracle}
                                            className="btn btn-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center gap-1 hover:scale-105 transition-transform"
                                            title="Hỏi Nhà Tiên Tri về ghi chú này"
                                        >
                                            🔮 Hỏi Tiên Tri
                                        </button>
                                        
                                        <div className="h-6 w-px bg-white/10 mx-1"></div>

                                        <button
                                            type="button"
                                            onClick={handleRefineNote}
                                            disabled={isAiProcessing}
                                            className="btn btn-sm bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg flex items-center gap-1 hover:scale-105 transition-transform"
                                            title="Biên tập lại nội dung theo phong cách học thuật (Oracle)"
                                        >
                                            {isAiProcessing ? <LoadingSpinner size={3} /> : '✨ Refine (Oracle)'}
                                        </button>

                                        <button 
                                            type="button"
                                            onClick={handlePlantTree}
                                            className="btn btn-sm bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] animate-pulse hover:animate-none flex items-center gap-1"
                                            title="Biến ghi chú này thành Lộ trình học (Cây tri thức)"
                                        >
                                            🌱 Gieo Hạt
                                        </button>

                                        {/* NEW: TEACHER ONLY - CONVERT TO LESSON */}
                                        {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                                            <button
                                                type="button"
                                                onClick={handleConvertClick}
                                                className="btn btn-sm bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center gap-1 hover:scale-105 transition-transform ml-1"
                                                title="Biến ghi chú thành Bài giảng"
                                            >
                                                👩‍🏫 Soạn Bài
                                            </button>
                                        )}

                                        <div className="h-6 w-px bg-white/10 mx-1"></div>
                                        <div className="flex bg-black/30 rounded-lg p-1">
                                            <button 
                                                id="btn-share-intel"
                                                onClick={handleShareClick} 
                                                className={`p-2 rounded-lg transition-colors ${sharedWithSquadronId ? 'text-green-400 bg-green-900/30' : 'text-gray-500 hover:text-green-400'}`} 
                                                title={sharedWithSquadronId ? "Đã chia sẻ (Nhấn để hủy)" : "Truyền dữ liệu đến Phi đội"}
                                            >
                                                📡
                                            </button>
                                            <button onClick={handleFriendShareClick} className="p-2 rounded-lg transition-colors text-gray-500 hover:text-blue-400" title="Gửi mật thư cho bạn bè">📨</button>
                                        </div>
                                        <button onClick={() => setIsPinned(!isPinned)} className={`p-2 rounded-lg transition-colors ${isPinned ? 'text-yellow-400 bg-yellow-400/10' : 'text-gray-500 hover:text-yellow-200'}`} title="Ghim ghi chú">📌</button>
                                        <button onClick={handleSave} className="btn btn-sm btn-primary px-4">Lưu</button>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center gap-4 flex-wrap">
                                    <div className="flex gap-2 items-center flex-wrap">
                                        <button onClick={() => applySyntax('# ', '')} className="btn-icon-xs text-lg font-bold" title="Heading 1">H1</button>
                                        <button onClick={() => applySyntax('## ', '')} className="btn-icon-xs text-base font-bold" title="Heading 2">H2</button>
                                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                        <button onClick={() => applySyntax('**', '**')} className="btn-icon-xs font-bold" title="Bold">B</button>
                                        <button onClick={() => applySyntax('[[', ']]')} className="btn-icon-xs text-blue-300" title="Internal Link">Link</button>
                                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                        <button onClick={insertCitation} className={`btn-icon-xs border border-yellow-500/50 text-yellow-300 hover:bg-yellow-900/30 ${!pdfUrl ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={!pdfUrl} title="Trích dẫn đoạn văn vừa copy từ PDF">❝ Paste Citation</button>
                                        <div className="w-px h-4 bg-gray-700 mx-1"></div>
                                        <button onClick={() => handleFindConnections(false)} className="btn-icon-xs text-purple-300 border border-purple-500/30 bg-purple-900/10 hover:bg-purple-900/30" title="Check Connections (Note Doctor)">🩺 Note Doctor</button>
                                    </div>
                                    <div className="flex gap-2">
                                        {pdfUrl ? (
                                            <>
                                                <button onClick={() => setViewMode(prev => prev === 'pdf_split' ? 'split' : 'pdf_split')} className="btn btn-xs btn-secondary">{viewMode === 'pdf_split' ? 'Ẩn PDF' : 'Hiện PDF'}</button>
                                                <button onClick={handleRemovePdf} className="text-red-400 text-xs hover:underline">Xóa PDF</button>
                                                <button onClick={() => handleAiAction('chat_pdf')} className="btn btn-xs bg-purple-600 text-white">✨ Hỏi AI</button>
                                            </>
                                        ) : (
                                            <label className="btn btn-xs btn-secondary cursor-pointer"><span>📎 Tải PDF lên</span><input type="file" className="hidden" accept="application/pdf" onChange={handlePdfUpload} ref={pdfUploadRef} /></label>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {viewMode !== 'pdf_split' && (
                                <div className="flex border-b border-white/10 bg-gray-900/50">
                                    <button onClick={() => setViewMode('edit')} className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider ${viewMode === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Edit</button>
                                    <button onClick={() => setViewMode('split')} className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider ${viewMode === 'split' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Split</button>
                                    <button onClick={() => setViewMode('preview')} className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider ${viewMode === 'preview' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}>Preview</button>
                                </div>
                            )}
                            <div className="flex-1 flex overflow-hidden relative">
                                <div className={`flex-1 relative ${viewMode === 'preview' ? 'hidden' : ''} ${viewMode === 'split' ? 'border-r border-white/10' : ''}`}>
                                    <textarea 
                                        ref={textareaRef} 
                                        className="w-full h-full bg-transparent text-gray-200 resize-none outline-none font-mono text-sm leading-relaxed custom-scrollbar p-6" 
                                        placeholder="Ghi chú tại đây (Gõ [[ để liên kết, bôi đen để tạo thẻ)..." 
                                        value={content} 
                                        onChange={handleContentChange}
                                        onMouseUp={handleMouseUp} // ADDED HANDLER
                                    />
                                    {isAiProcessing && <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20"><LoadingSpinner size={8} /><p className="text-blue-300 mt-2 animate-pulse font-bold">AI đang phân tích...</p></div>}
                                    
                                    {/* Link Suggestions Dropdown */}
                                    {showLinkSuggestions && filteredLinkSuggestions.length > 0 && (
                                        <div className="absolute bottom-12 left-6 w-64 bg-gray-800 border border-blue-500 rounded-lg shadow-xl z-50 overflow-hidden animate-fade-in-up">
                                            <div className="bg-blue-900/30 px-3 py-1 text-[10px] font-bold text-blue-300 uppercase">Gợi ý liên kết</div>
                                            {filteredLinkSuggestions.map(n => (
                                                <button 
                                                    key={n.id} 
                                                    onClick={() => insertLinkSuggestion(n.title)}
                                                    className="w-full text-left px-3 py-2 text-sm text-gray-200 hover:bg-blue-600 hover:text-white transition-colors"
                                                >
                                                    {n.title}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className={`flex-1 bg-gray-900/30 overflow-y-auto custom-scrollbar p-6 ${viewMode === 'edit' ? 'hidden' : ''}`}>
                                    <div className="prose prose-invert prose-sm max-w-none">{renderMarkdown(content)}</div>
                                    
                                    {/* BACKLINKS SECTION */}
                                    {backlinks.length > 0 && (
                                        <div className="mt-8 pt-6 border-t border-white/10">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">🔗 Các ghi chú dẫn tới đây (Backlinks)</h4>
                                            <div className="space-y-2">
                                                {backlinks.map(bn => (
                                                    <div key={bn.id} onClick={() => setSelectedNoteId(bn.id)} className="p-3 bg-white/5 border border-white/5 rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                                                        <p className="text-sm font-bold text-blue-300">{bn.title}</p>
                                                        <p className="text-xs text-gray-500 truncate">{bn.content.substring(0, 60)}...</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {viewMode !== 'preview' && (
                                    <div className="absolute bottom-4 left-4 flex gap-2 z-30">
                                        <button onClick={() => handleAiAction('fix')} disabled={isAiProcessing} className="btn btn-xs bg-indigo-600/80 hover:bg-indigo-500 text-white backdrop-blur shadow-lg border border-indigo-400/30">✨ Sửa lỗi</button>
                                        <button onClick={() => handleAiAction('summarize')} disabled={isAiProcessing} className="btn btn-xs bg-indigo-600/80 hover:bg-indigo-500 text-white backdrop-blur shadow-lg border border-indigo-400/30">📝 Tóm tắt</button>
                                    </div>
                                )}
                            </div>
                            
                            {/* AI CONNECTION SUGGESTIONS */}
                            {aiConnectionSuggestions.length > 0 && (
                                <div className="p-4 bg-purple-900/20 border-t border-purple-500/30 animate-slide-up flex flex-col gap-2">
                                    <div className="flex justify-between items-center"><h4 className="text-xs font-bold text-purple-300 uppercase">🩺 Bác sĩ Note gợi ý:</h4><button onClick={() => setAiConnectionSuggestions([])} className="text-gray-400 hover:text-white text-xs">✕</button></div>
                                    <div className="flex flex-col gap-2">
                                        {aiConnectionSuggestions.map((sug, idx) => (
                                            <div key={idx} className="flex justify-between items-start p-2 bg-purple-500/10 rounded border border-purple-500/20">
                                                <div>
                                                    <span className="text-purple-200 font-bold text-sm">[[{sug.noteTitle}]]</span>
                                                    <p className="text-gray-400 text-xs mt-1 italic">"{sug.reason}"</p>
                                                </div>
                                                <button 
                                                    onClick={() => { applySyntax(`[[${sug.noteTitle}]]`, ''); setAiConnectionSuggestions(prev => prev.filter(t => t !== sug)); }}
                                                    className="ml-2 px-3 py-1 rounded bg-purple-600 text-white text-xs hover:bg-purple-500 transition-colors whitespace-nowrap"
                                                >
                                                    Link
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {aiResult && (
                                <div className="p-4 bg-indigo-900/20 border-t border-indigo-500/30 animate-slide-up relative flex-shrink-0 max-h-48 overflow-hidden flex flex-col">
                                    <div className="flex justify-between items-center mb-2"><h4 className="text-xs font-bold text-indigo-300 uppercase">AI Suggestion</h4><button onClick={() => setAiResult(null)} className="text-gray-400 hover:text-white text-xs">✕</button></div>
                                    <div className="text-sm text-gray-200 bg-black/40 p-3 rounded-lg overflow-y-auto whitespace-pre-wrap font-mono border border-white/5 flex-1 mb-2">{aiResult}</div>
                                    <button onClick={insertAiResult} className="btn btn-sm btn-secondary w-full text-xs border-indigo-500/50 text-indigo-200 hover:bg-indigo-500/20">📥 Chèn vào nội dung</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
                {viewMode === 'pdf_split' && pdfUrl && (
                    <div className="w-full md:w-1/2 flex flex-col bg-gray-900 rounded-2xl border border-white/10 overflow-hidden shadow-2xl animate-fade-in-right">
                        <div className="bg-gray-800 p-2 border-b border-gray-700 flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-300 px-2 flex items-center gap-2">📄 {pdfFile?.name}</span>
                            <button onClick={() => setViewMode('split')} className="text-gray-400 hover:text-white px-2">✖</button>
                        </div>
                        <iframe id="pdf-viewer" src={`${pdfUrl}#toolbar=0`} className="w-full flex-1 bg-white" title="PDF Viewer"></iframe>
                    </div>
                )}
            </div>
            
            {/* Share to Squadron Modal */}
            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title="Truyền Dữ Liệu (Transmit Intel)">
                {mySquadrons.length === 0 ? (
                    <div className="text-center p-6 text-gray-400"><div className="text-4xl mb-4">🚫</div><p className="mb-2">Bạn chưa tham gia Phi đội nào.</p><p className="text-xs">Hãy tham gia một nhóm học tập để chia sẻ tài liệu này.</p></div>
                ) : (
                    <div className="space-y-3 p-2">
                        <p className="text-sm text-gray-400 mb-2">Chọn Phi đội để chia sẻ ghi chú:</p>
                        <p className="text-xs text-yellow-400 mb-4 bg-yellow-900/20 p-2 rounded border border-yellow-500/30">
                            💰 <strong>Kinh Tế Tri Thức:</strong> Khi bạn chia sẻ, tài liệu sẽ bị khóa (Locked Intel).
                            Thành viên khác cần trả <strong>5 XP</strong> để mở khóa. Số XP này sẽ được chuyển cho bạn!
                        </p>
                        {mySquadrons.map(sq => (
                            <div key={sq.id} className="flex justify-between items-center p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3"><span className="text-2xl">🚀</span><div><p className="font-bold text-white">{sq.name}</p><p className="text-xs text-gray-500">{sq.members.length} thành viên</p></div></div>
                                {sharedWithSquadronId === sq.id ? (
                                    <button onClick={() => { if(selectedNoteId) { unshareNote(selectedNoteId); setSharedWithSquadronId(undefined); } }} className="btn btn-sm bg-red-500/20 text-red-300 border border-red-500/50 hover:bg-red-500 hover:text-white">Ngừng chia sẻ</button>
                                ) : (
                                    <button onClick={() => { if(selectedNoteId) { shareNoteToSquadron(selectedNoteId, sq.id); setSharedWithSquadronId(sq.id); setIsShareModalOpen(false); alert("📡 Dữ liệu đã được truyền đi! Bạn sẽ nhận được XP khi có người mở khóa."); } }} className="btn btn-sm btn-primary">Truyền tin</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex justify-end mt-4 pt-4 border-t border-white/10"><button onClick={() => setIsShareModalOpen(false)} className="btn btn-secondary">Đóng</button></div>
            </Modal>

            {/* Share to Friend Modal (Peer Review Request) */}
            <Modal isOpen={isFriendShareModalOpen} onClose={() => setIsFriendShareModalOpen(false)} title="Gửi Mật Thư (Peer Review)">
                <div className="space-y-4 p-2">
                    <div className="bg-blue-900/30 p-3 rounded-lg border border-blue-500/50 flex gap-2">
                        <span className="text-2xl">📨</span>
                        <div className="text-sm">
                            <p className="font-bold text-blue-200">Yêu cầu Đánh giá</p>
                            <p className="text-gray-300 text-xs">Gửi ghi chú này cho bạn bè để họ xem và góp ý. Ghi chú sẽ được gửi dưới dạng "Intel Card" trong hộp thư.</p>
                        </div>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                        {friends.map(friend => (
                            <button 
                                key={friend.id} 
                                onClick={() => handleSendToFriend(friend.id)}
                                className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-blue-600/20 hover:border-blue-500/50 transition-all group"
                            >
                                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white group-hover:bg-blue-500 transition-colors">
                                    {friend.name.charAt(0)}
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-sm font-bold text-gray-200 group-hover:text-white">{friend.name}</p>
                                    <p className="text-xs text-gray-500 uppercase">{friend.role}</p>
                                </div>
                                <span className="text-gray-500 group-hover:text-blue-400">➤</span>
                            </button>
                        ))}
                        {friends.length === 0 && <p className="text-center text-gray-500 text-sm">Không tìm thấy người dùng khác.</p>}
                    </div>
                </div>
                <div className="flex justify-end mt-4 pt-4 border-t border-white/10"><button onClick={() => setIsFriendShareModalOpen(false)} className="btn btn-secondary">Đóng</button></div>
            </Modal>

            {/* NEW: Convert to Lesson Modal */}
            <Modal isOpen={isConvertLessonModalOpen} onClose={() => setIsConvertLessonModalOpen(false)} title="Soạn Bài Giảng (Từ Ghi Chú)">
                <div className="space-y-4 p-2">
                    <div className="bg-orange-900/30 p-3 rounded-lg border border-orange-500/50 flex gap-2">
                        <span className="text-2xl">👩‍🏫</span>
                        <div className="text-sm">
                            <p className="font-bold text-orange-200">AI Teaching Assistant</p>
                            <p className="text-gray-300 text-xs">
                                Gemini sẽ chuyển đổi ghi chú thô của bạn thành một giáo án bài bản (Introduction, Concepts, Examples, Summary) và thêm vào khóa học.
                            </p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Chọn khóa học đích:</label>
                        <select 
                            className="form-select w-full bg-gray-900 border-gray-700"
                            value={selectedCourseForLesson}
                            onChange={(e) => setSelectedCourseForLesson(e.target.value)}
                        >
                            <option value="">-- Chọn khóa học --</option>
                            {myTeachableCourses.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex justify-end mt-4 pt-4 border-t border-white/10 gap-3">
                        <button onClick={() => setIsConvertLessonModalOpen(false)} className="btn btn-secondary">Hủy</button>
                        <button 
                            onClick={confirmConvertLesson} 
                            disabled={!selectedCourseForLesson || isTransformingLesson}
                            className="btn btn-primary bg-gradient-to-r from-orange-600 to-amber-600 border-none shadow-lg"
                        >
                            {isTransformingLesson ? <LoadingSpinner size={4} /> : '✨ Tạo Bài Giảng'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* --- ONBOARDING TOUR --- */}
            <OnboardingTour 
                steps={tourSteps} 
                isOpen={isTourOpen} 
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />

            <style>{`.btn-icon-xs {@apply p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors border border-transparent text-xs;}`}</style>
        </div>
    );
};

export default NotebookPage;
