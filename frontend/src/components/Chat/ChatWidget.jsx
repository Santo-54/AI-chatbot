import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minus } from 'lucide-react';
import api from '../../api/axios';
import ReactMarkdown from 'react-markdown';
import './ChatWidget.css';
import RealtimeVoiceAssistant from './RealtimeVoiceAssistant';

const ChatWidget = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState('');
    const messagesEndRef = useRef(null);

    const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

    useEffect(() => {
        // Init session
        let storedSession = localStorage.getItem('chat_session_id');
        if (!storedSession) {
            storedSession = crypto.randomUUID();
            localStorage.setItem('chat_session_id', storedSession);
        }
        setSessionId(storedSession);

        // Track view
        api.post('/track-view').catch(err => console.error("Tracking error", err));

        if (messages.length === 0) {
            setMessages([
                { role: 'assistant', content: "Hi! 👋 I'm Edsurance AI. How can I help you today?" }
            ]);
        }
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (overrideText) => {
        const textToSend = overrideText || inputText;
        if (!textToSend.trim()) return;

        const userMsg = { role: 'user', content: textToSend };
        setMessages(prev => [...prev, userMsg]);
        if (!overrideText) setInputText('');
        setIsTyping(true);

        try {
            const response = await api.post('/chat', {
                message: textToSend,
                session_id: sessionId
            });

            const botRes = response.data.response;
            setMessages(prev => [...prev, { role: 'assistant', content: botRes }]);
        } catch (error) {
            console.error("Chat error", error);
            setMessages(prev => [...prev, { role: 'assistant', content: "I'm having trouble connecting right now." }]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="chat-widget-container">
            {!isOpen && (
                <button className="chat-trigger-btn" onClick={() => setIsOpen(true)}>
                    <MessageCircle size={28} />
                </button>
            )}

            {isOpen && (
                <div className={`chat-window ${isOpen ? 'open' : ''}`}>
                    <div className="chat-header">
                        <div className="chat-header-info">
                            <h3>Edsurance AI</h3>
                            <span className="status-dot"></span>
                        </div>
                        <div className="chat-header-actions">
                            <button onClick={() => setIsOpen(false)}><Minus size={20} /></button>
                        </div>
                    </div>

                    <div className="chat-messages">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`message ${msg.role}`}>
                                <div className="message-content">
                                    {msg.role === 'assistant' ? (
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    ) : (
                                        msg.content
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className="message assistant">
                                <div className="typing-indicator">
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                        <RealtimeVoiceAssistant />
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-area">
                        <input
                            type="text"
                            placeholder="Type a message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button onClick={() => handleSend()} disabled={!inputText.trim()}>
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatWidget;
