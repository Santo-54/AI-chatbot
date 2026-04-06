import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Volume2, Info, Activity, RefreshCw, Zap } from 'lucide-react';
import api from '../../api/axios';
import './RealtimeVoiceAssistant.css';

/**
 * Singleton state to prevent overlapping sessions across React remounts.
 */
let globalPC = null;
let globalDC = null;
let globalStream = null;
let currentSessionId = 0;

const RealtimeVoiceAssistant = ({ onClose }) => {
    // UX States: 'idle', 'listening', 'processing', 'speaking'
    const [status, setStatus] = useState('idle');
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [aiResponseText, setAiResponseText] = useState('');
    const [micVolume, setMicVolume] = useState(0);
    const [aiVolume, setAiVolume] = useState(0);

    const audioRef = useRef(null);
    const isMounted = useRef(true);
    const animationFrameRef = useRef(null);
    const audioCtxRef = useRef(null);
    const lastInteractionTime = useRef(Date.now());

    // Recovery / Fallback Refs
    const fallbackTimerRef = useRef(null);
    const hasSentTranscription = useRef(false);
    const speechStartTime = useRef(0);
    const mySessionId = useRef(0);

    useEffect(() => {
        isMounted.current = true;
        currentSessionId++;
        mySessionId.current = currentSessionId;

        console.log(`[Voice] 🚀 Initializing Session #${mySessionId.current}`);

        stopAllSessions();
        startSession(mySessionId.current);

        const silenceInterval = setInterval(checkSessionSilence, 1000);

        return () => {
            console.log(`[Voice] 🧹 Cleaning up Session #${mySessionId.current}`);
            isMounted.current = false;
            clearInterval(silenceInterval);
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioCtxRef.current) audioCtxRef.current.close().catch(() => { });
            if (mySessionId.current === currentSessionId) {
                stopAllSessions();
            }
        };
    }, []);

    const stopAllSessions = () => {
        if (globalDC) { try { globalDC.close(); } catch (e) { } globalDC = null; }
        if (globalPC) { try { globalPC.close(); } catch (e) { } globalPC = null; }
        if (globalStream) {
            globalStream.getTracks().forEach(t => { t.stop(); t.enabled = false; });
            globalStream = null;
        }
    };

    const checkSessionSilence = () => {
        if (!isConnected) return;
        const now = Date.now();
        const inactiveTime = (now - lastInteractionTime.current) / 1000;

        if (inactiveTime > 25 && status === 'listening') {
            lastInteractionTime.current = now;
            console.log("[Voice] Session health heartbeat...");
        }
    };

    const startSession = async (sid) => {
        setIsConnecting(true);
        setError(null);
        try {
            const res = await api.get('/voice/session');
            if (!isMounted.current || sid !== currentSessionId) return;

            const EPHEMERAL_KEY = res.data.client_secret.value;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });
            globalPC = pc;

            pc.ontrack = (e) => {
                console.log("[Voice] 🔊 AI Audio track received");
                if (audioRef.current) {
                    audioRef.current.srcObject = e.streams[0];
                    audioRef.current.muted = false;

                    const playAudio = async () => {
                        try {
                            if (audioCtxRef.current?.state === 'suspended') {
                                await audioCtxRef.current.resume();
                            }
                            await audioRef.current.play();
                            console.log("[Voice] 🎵 Playback started successfully");
                        } catch (err) {
                            console.warn("[Voice] 🔇 Playback blocked by browser", err);
                            setError("Audio blocked. Click anywhere to unmute.");
                            // Attempt to resume context on next interaction
                        }
                    };

                    playAudio();
                    setupAnalyzer(e.streams[0], setAiVolume);
                }
            };

            const ms = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            if (!isMounted.current || sid !== currentSessionId) {
                ms.getTracks().forEach(t => t.stop());
                return;
            }

            globalStream = ms;
            pc.addTrack(ms.getTracks()[0]);
            setupAnalyzer(ms, setMicVolume, true);

            const dc = pc.createDataChannel("oai-events");
            globalDC = dc;

            dc.onopen = () => {
                console.log("[Voice] 🟢 Data channel opened");
                // Explicitly sync session configuration
                dc.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        modalities: ["audio", "text"],
                        instructions: (
                            "You are a turn-based conversational assistant. " +
                            "STRICT RULE: Always respond after human speech ends. Never stay silent. " +
                            "Detect the user's language (Tamil or English) and respond accordingly. " +
                            "Use the provided context to answer questions. Be concise (1-2 sentences)."
                        ),
                        input_audio_transcription: { model: "whisper-1" },
                        turn_detection: {
                            type: "server_vad",
                            threshold: 0.4,
                            prefix_padding_ms: 300,
                            silence_duration_ms: 1000
                        }
                    }
                }));
            };

            dc.onmessage = (e) => {
                if (!isMounted.current || sid !== currentSessionId) return;
                const event = JSON.parse(e.data);
                handleRealtimeEvent(event);
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            const sdpRes = await fetch(`https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17`, {
                method: "POST",
                body: offer.sdp,
                headers: {
                    Authorization: `Bearer ${EPHEMERAL_KEY}`,
                    "Content-Type": "application/sdp",
                },
            });

            if (!isMounted.current || sid !== currentSessionId) return;
            const answerText = await sdpRes.text();
            await pc.setRemoteDescription({ type: "answer", sdp: answerText });

            if (isMounted.current) {
                setIsConnected(true);
                setStatus('listening');
                lastInteractionTime.current = Date.now();
                console.log("[Voice] Realtime system ready");
            }
        } catch (err) {
            console.error(`[Voice] ❌ Session start failed:`, err);
            if (isMounted.current) setError("Microphone or network error.");
        } finally {
            if (isMounted.current) setIsConnecting(false);
        }
    };

    const setupAnalyzer = (stream, setVol, isMic = false) => {
        try {
            const audioCtx = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
            audioCtxRef.current = audioCtx;
            const analyzer = audioCtx.createAnalyser();
            const source = audioCtx.createMediaStreamSource(stream);
            source.connect(analyzer);

            analyzer.fftSize = 64;
            const dataArray = new Uint8Array(analyzer.frequencyBinCount);

            const check = () => {
                if (!isMounted.current) return;
                analyzer.getByteFrequencyData(dataArray);
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
                const avg = sum / dataArray.length;
                setVol(avg);
                if (isMic && avg > 12 && status === 'listening') lastInteractionTime.current = Date.now();
                animationFrameRef.current = requestAnimationFrame(check);
            };
            check();
        } catch (e) {
            console.warn("[Voice] Visualizer fail", e);
        }
    };

    const handleRealtimeEvent = async (event) => {
        // Detailed log for turn state and response events
        if (event.type.includes("speech") || event.type.includes("buffer") || event.type.includes("response")) {
            console.log(`[Voice Event] ${event.type}`, event);
        }

        switch (event.type) {
            case "response.audio_transcript.delta":
                setAiResponseText(prev => prev + event.delta);
                break;

            case "input_audio_buffer.speech_started":
                console.log("[Voice] 🗣️ User speech detected");
                lastInteractionTime.current = Date.now();
                speechStartTime.current = Date.now();
                hasSentTranscription.current = false;

                // ONLY cancel if we are currently speaking.
                // Don't cancel if we are 'processing' (waiting for RAG) as noise might trigger this.
                if (status === 'speaking' && globalDC?.readyState === "open") {
                    console.log("[Voice] ⏹️ Interruption detected, cancelling response.");
                    globalDC.send(JSON.stringify({ type: "response.cancel" }));
                    setStatus('listening');
                    setAiResponseText("I'm hearing you...");
                } else if (status === 'listening') {
                    setAiResponseText("I'm hearing you...");
                }
                break;

            case "input_audio_buffer.speech_stopped":
                const duration = Date.now() - speechStartTime.current;
                console.log(`[Voice] 🔇 Speech stop after ${duration}ms.`);

                // STEP 2: Commit Audio Buffer explicitly only if it's long enough (>200ms)
                // OpenAI requires at least 100ms, we use 200ms to be safe.
                if (globalDC?.readyState === "open" && duration > 200) {
                    console.log("[Voice] Buffer committed.");
                    globalDC.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
                    setStatus('processing');
                } else {
                    console.log("[Voice] Speech too short, ignoring buffer.");
                    setStatus('listening');
                    return;
                }

                if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = setTimeout(() => {
                    if (!hasSentTranscription.current && isMounted.current) {
                        console.log("[Voice] ⏰ STT fallback trigger");
                        injectRagContext("");
                    }
                }, 4000); // Wait a bit longer for STT
                break;

            case "conversation.item.input_audio_transcription.completed":
                const q = event.transcript?.trim() || "";
                console.log(`[Voice] Transcript: "${q}"`);

                if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
                hasSentTranscription.current = true;

                setTranscript(q || "...");
                setAiResponseText('');
                setStatus('processing');

                // Cancel the server-vad's auto-response to use our RAG response
                if (globalDC?.readyState === "open") {
                    globalDC.send(JSON.stringify({ type: "response.cancel" }));
                }

                await injectRagContext(q);
                break;

            case "response.created":
                console.log("[Voice] 🤖 Response created");
                setStatus('speaking');
                break;

            case "response.done":
                console.log("[Voice] ✅ Response completed");
                setStatus('listening');
                lastInteractionTime.current = Date.now();
                break;

            case "response.output_item.added":
                console.log("[Voice] 📝 Item added to output");
                break;

            case "response.output_item.done":
                console.log("[Voice] ✅ Output item done");
                break;

            case "error":
                console.error("[Voice API Error]", event.error);
                const msg = event.error.message || "";
                if (!msg.includes("no active response") && !msg.includes("buffer too small")) {
                    setError(msg);
                }
                break;
            default:
                // Log unhandled events for debug
                if (event.type !== "input_audio_buffer.appended") {
                    console.debug(`[Voice Event] ${event.type}`, event);
                }
                break;
        }
    };

    const injectRagContext = async (query) => {
        try {
            console.log(`[Voice] Injecting context for query: "${query}"`);
            const res = await api.post('/voice/rag-context', { query });
            const context = res.data.context;

            if (globalDC?.readyState === "open") {
                const systemText = query
                    ? `CONTEXT:\n${context}\n\nINSTRUCTION: Respond naturally and briefly (1-2 sentences).`
                    : "The user finished speaking but no text was captured. Ask them to repeat if necessary.";

                globalDC.send(JSON.stringify({
                    type: "conversation.item.create",
                    item: {
                        type: "message",
                        role: "system",
                        content: [{ type: "input_text", text: systemText }]
                    }
                }));

                // STEP 3: Trigger Response Generation
                globalDC.send(JSON.stringify({
                    type: "response.create",
                    response: {
                        modalities: ["audio", "text"],
                        instructions: "Respond naturally to the user query using the context. Be brief."
                    }
                }));
                console.log("[Voice] ⚡ Response Create event sent");
            }
        } catch (err) {
            console.error("[Voice] RAG failure", err);
            if (globalDC?.readyState === "open") {
                globalDC.send(JSON.stringify({ type: "response.create" }));
            }
        }
    };

    const manualCommit = () => {
        if (globalDC?.readyState === "open") {
            console.log("[Voice] 🖱️ Manual commitment triggered");
            globalDC.send(JSON.stringify({ type: "input_audio_buffer.commit" }));
            setStatus('processing');

            // If transcription takes too long, fall back to RAG with empty query
            if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = setTimeout(() => {
                if (!hasSentTranscription.current && isMounted.current) {
                    console.log("[Voice] ⏰ Manual mode RAG fallback");
                    injectRagContext("");
                }
            }, 2000); // Shorter fallback for manual trigger
        }
    };

    const healInterface = async () => {
        console.log("[Voice] 🛠️ Manual sync requested");
        setError(null);
        if (audioCtxRef.current?.state === 'suspended') {
            await audioCtxRef.current.resume();
        }
        if (audioRef.current) {
            audioRef.current.play().catch(() => { });
        }

        // Connectivity Ping
        if (globalDC?.readyState === "open") {
            globalDC.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                    type: "message",
                    role: "system",
                    content: [{ type: "input_text", text: "Are you online? Response 'Yes'." }]
                }
            }));
            globalDC.send(JSON.stringify({ type: "response.create" }));
        }
    };

    return (
        <div className="realtime-voice-overlay" onClick={healInterface}>
            <audio
                ref={audioRef}
                autoPlay
                playsInline
                style={{ position: 'fixed', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.1, zIndex: 9999 }}
            />

            <div className="voice-container" onClick={(e) => e.stopPropagation()}>
                <button className="close-voice" onClick={onClose}><X size={20} /></button>

                <div className="voice-header" style={{ borderBottom: aiVolume > 5 ? '2px solid #4ade80' : '2px solid transparent' }}>
                    <h2>Virtual Assistant</h2>
                    {!error && <div className="status-label">{
                        isConnecting ? "Connecting..." :
                            status === 'listening' ? "I'm listening..." :
                                status === 'processing' ? "Analyzing..." :
                                    status === 'speaking' ? "Speaking..." : "Ready"
                    }</div>}
                </div>

                <div className="visualizer-container">
                    <div className={`voice-orb ${status}`}
                        style={{
                            transform: `scale(${1 + (micVolume / 180) + (aiVolume / 140)})`,
                            boxShadow: `0 0 ${20 + micVolume + (aiVolume * 2)}px rgba(0, 123, 255, 0.4)`
                        }}>
                        <div className="orb-inner"></div>
                        <div className="orb-ring"></div>
                    </div>
                </div>

                <div className="transcript-container">
                    {error && <p className="error-msg">⚠️ {error} <br /><small>Click here to fix audio.</small></p>}

                    <div className="user-text">
                        <Mic size={14} color={status === 'listening' ? '#007bff' : '#666'} />
                        <p>{transcript || (isConnected ? "Go ahead, I'm listening..." : "...")}</p>
                    </div>

                    <div className="ai-text">
                        <Volume2 size={14} color={status === 'speaking' ? '#4ade80' : '#666'} />
                        <p>{aiResponseText || (status === 'processing' ? "Got it! Looking into that..." : "...")}</p>
                    </div>
                </div>

                <div className="voice-footer">
                    <button
                        className="manual-send-btn"
                        onClick={(e) => { e.stopPropagation(); manualCommit(); }}
                        disabled={status !== 'listening'}
                        title="Click if I don't stop listening automatically"
                    >
                        <Zap size={14} /> Send Now
                    </button>
                    <div className="mic-meter">
                        <Activity size={12} color="#4ade80" />
                        <div className="meter-bar">
                            <div className="meter-fill" style={{ width: `${Math.min(micVolume * 4, 100)}%` }}></div>
                        </div>
                    </div>
                    {aiVolume > 2 && (
                        <div className="signal-badge">
                            <Zap size={10} fill="#4ade80" color="#4ade80" />
                            <span>AI ACTIVE</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RealtimeVoiceAssistant;
