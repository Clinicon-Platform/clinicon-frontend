import { useState, useRef, useEffect } from 'react';
import { Send, RotateCcw, MessageSquare, Plus, Trash2, Mic, Square, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLang } from '../context/LangContext';
import { sendVoiceMessage } from '../utils/api';

const getSuggestions = (t) => [
  t('suggestion1'),
  t('suggestion2'),
  t('suggestion3'),
  t('suggestion4'),
];

export default function Chat() {
  const { user } = useAuth();
  const { t, lang } = useLang();
  const [messages, setMessages] = useState([
    { role: 'bot', text: t('chatWelcome') },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const scrollRef = useRef(null);
  const sentContext = useRef(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // Chat history state
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('clinicon-chat-history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, recording]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Save current conversation to history when it has user messages
  const saveToHistory = (msgs) => {
    const userMsgs = msgs.filter(m => m.role === 'user');
    if (userMsgs.length === 0) return;
    const title = userMsgs[0].text.slice(0, 40) + (userMsgs[0].text.length > 40 ? '…' : '');
    const entry = {
      id: activeChat || Date.now().toString(),
      title,
      messages: msgs,
      date: new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-US', { day: 'numeric', month: 'short' }),
    };
    setHistory(prev => {
      const filtered = prev.filter(h => h.id !== entry.id);
      const updated = [entry, ...filtered].slice(0, 20);
      try { localStorage.setItem('clinicon-chat-history', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (!activeChat) setActiveChat(entry.id);
  };

  const displayName = getDisplayName(user);
  const initial = displayName.charAt(0) || '؟';

  const send = async (text) => {
    const userMsg = (text || input).trim();
    if (!userMsg || loading || recording) return;
    setInput('');
    const newMsgs = [...messages, { role: 'user', text: userMsg }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 300000);
      const sessionId = user?.user_id || user?.id || 'anon';
      const body = { message: userMsg, session_id: sessionId };
      if (user && !sentContext.current) {
        body.user_name = user.name || user.full_name || '';
        body.user_email = user.email || '';
        sentContext.current = true;
      }
      const getAgentUrl = () => {
        let envUrl = import.meta.env?.VITE_AGENT_URL || import.meta.env?.NEXT_PUBLIC_AGENT_URL || '';
        if (!envUrl) return '/agent';
        return envUrl.replace(/\/+$/, '');
      };
      const agentBase = getAgentUrl();
      const res = await fetch(`${agentBase}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      const data = await res.json();
      const reply = data.reply || t('chatErrorReply');
      const finalMsgs = [...newMsgs, { role: 'bot', text: reply }];
      setMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } catch (err) {
      const txt = err.name === 'AbortError'
        ? t('chatErrorTimeout')
        : t('chatErrorConnection');
      const finalMsgs = [...newMsgs, { role: 'bot', text: txt }];
      setMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } finally { setLoading(false); }
  };

  const startRecording = async () => {
    if (loading || recording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        if (audioBlob.size > 0) {
          await handleSendVoice(audioBlob);
        }
      };

      mediaRecorder.start(200);
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert(lang === 'ar' ? 'تعذر الوصول للميكروفون. يرجى التأكد من السماح بالصلاحيات.' : 'Could not access microphone. Please allow permissions.');
    }
  };

  const stopRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSendVoice = async (audioBlob) => {
    const voiceMsgText = lang === 'ar' ? '🎤 [رسالة صوتية]' : '🎤 [Voice Message]';
    const newMsgs = [...messages, { role: 'user', text: voiceMsgText }];
    setMessages(newMsgs);
    setLoading(true);
    try {
      const sessionId = user?.user_id || user?.id || '';
      const response = await sendVoiceMessage(audioBlob, sessionId);
      const reply = response.reply || response.response || response.text || response.message || (lang === 'ar' ? 'تم استلام التسجيل الصوتي بنجاح.' : 'Voice recording received successfully.');
      const finalMsgs = [...newMsgs, { role: 'bot', text: reply }];
      setMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } catch (err) {
      console.error('Failed to send voice message:', err);
      const errorText = lang === 'ar' ? 'حدث خطأ أثناء إرسال التسجيل الصوتي.' : 'Error sending voice recording.';
      const finalMsgs = [...newMsgs, { role: 'bot', text: errorText }];
      setMessages(finalMsgs);
      saveToHistory(finalMsgs);
    } finally {
      setLoading(false);
    }
  };

  const startNewChat = async () => {
    const sessionId = user?.user_id || user?.id || 'anon';
    try {
      await fetch('/agent/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {}
    sentContext.current = false;
    setActiveChat(null);
    setMessages([{ role: 'bot', text: t('chatWelcomeNew') }]);
  };

  const loadChat = async (entry) => {
    const sessionId = user?.user_id || user?.id || 'anon';
    try {
      await fetch('/agent/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId }),
      });
    } catch {}
    sentContext.current = false;
    setActiveChat(entry.id);
    setMessages(entry.messages);
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    setHistory(prev => {
      const updated = prev.filter(h => h.id !== chatId);
      try { localStorage.setItem('clinicon-chat-history', JSON.stringify(updated)); } catch {}
      return updated;
    });
    if (activeChat === chatId) {
      setActiveChat(null);
      setMessages([{ role: 'bot', text: t('chatWelcomeNew') }]);
    }
  };

  const clearAllChats = () => {
    setHistory([]);
    try { localStorage.removeItem('clinicon-chat-history'); } catch {}
    setActiveChat(null);
    setMessages([{ role: 'bot', text: t('chatWelcomeNew') }]);
  };

  const showSuggestions = messages.length <= 1 && !loading && !recording;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="chat-layout">
      {/* Chat History Sidebar */}
      <div className="chat-history-panel">
        <div className="chat-history-header">
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>{t('chats')}</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {history.length > 0 && (
              <button className="chat-new-btn" onClick={clearAllChats}
                title={t('deleteAll')}
                style={{ color: 'var(--danger)' }}>
                <Trash2 size={14} />
              </button>
            )}
            <button className="chat-new-btn" onClick={startNewChat} title={t('newChat')}>
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="chat-history-list">
          {history.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
              {t('noChats')}
            </div>
          ) : (
            history.map(h => (
              <div key={h.id} className={`chat-history-item ${activeChat === h.id ? 'active' : ''}`}
                onClick={() => loadChat(h)} role="button" tabIndex={0}>
                <MessageSquare size={14} style={{ flexShrink: 0, color: 'var(--text-faint)' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {h.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 2 }}>{h.date}</div>
                </div>
                <button className="chat-delete-btn" onClick={(e) => deleteChat(h.id, e)}
                  title={t('delete')}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="chat-container">
        <div className="chat-box">
          {/* Header */}
          <div className="chat-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <img src="/clinicon-icon.svg" alt="" className="chat-ai-logo" />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{t('aiAssistant')}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--success)', marginTop: 3 }}>
                  {loading ? (
                    <span style={{ color: 'var(--warning)' }}>{t('thinking')}</span>
                  ) : (
                    <><span className="online-dot" style={{ width: 7, height: 7 }} /> {t('onlineNow')}</>
                  )}
                </div>
              </div>
            </div>
            <button onClick={startNewChat} className="btn-secondary"
              style={{ padding: '8px 14px', borderRadius: 'var(--radius-pill)', fontSize: 12.5 }}>
              <RotateCcw size={13} /> {t('newChat')}
            </button>
          </div>

          {/* Messages */}
          <div className="chat-messages" ref={scrollRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role === 'user' ? 'user' : ''}`}>
                {msg.role === 'user' ? (
                  <div className="chat-msg-avatar" style={{ background: 'var(--primary-light)', color: 'var(--primary)' }}>
                    {initial}
                  </div>
                ) : (
                  <img src="/clinicon-icon.svg" alt="" className="chat-ai-avatar" />
                )}
                <div className={`chat-bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
                  <BotText text={msg.text} />
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-msg">
                <img src="/clinicon-icon.svg" alt="" className="chat-ai-avatar" />
                <div className="chat-typing">
                  <span /><span /><span />
                </div>
              </div>
            )}
          </div>

          {/* Suggestions */}
          {showSuggestions && (
            <div className="suggestion-chips">
              {getSuggestions(t).map(s => (
                <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="chat-input-bar">
            <form onSubmit={e => { e.preventDefault(); send(); }}
              style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {recording ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 12, border: '1px solid var(--danger, #ef4444)' }}>
                  <span className="online-dot" style={{ width: 10, height: 10, backgroundColor: 'var(--danger, #ef4444)', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--danger, #ef4444)' }}>
                    {lang === 'ar' ? 'جاري التسجيل...' : 'Recording...'} {formatTime(recordingTime)}
                  </span>
                </div>
              ) : (
                <input value={input} onChange={e => setInput(e.target.value)} disabled={loading}
                  placeholder={t('typeQuestion')}
                  className="input-field" style={{ flex: 1, borderRadius: 12 }} />
              )}

              {recording ? (
                <button type="button" onClick={stopRecording}
                  title={lang === 'ar' ? 'إيقاف وإرسال' : 'Stop & Send'}
                  className="btn-danger" style={{ padding: '14px', borderRadius: 12, flexShrink: 0, backgroundColor: 'var(--danger, #ef4444)', color: '#fff', border: 'none', cursor: 'pointer' }}>
                  <Square size={16} fill="currentColor" />
                </button>
              ) : (
                <>
                  <button type="button" onClick={startRecording} disabled={loading}
                    title={lang === 'ar' ? 'تسجيل صوتي' : 'Voice Record'}
                    className="btn-secondary" style={{ padding: '14px', borderRadius: 12, flexShrink: 0 }}>
                    <Mic size={16} />
                  </button>
                  <button type="submit" disabled={loading || !input.trim()}
                    className="btn-primary" style={{ padding: '14px 24px', borderRadius: 12, flexShrink: 0 }}>
                    <Send size={16} />
                  </button>
                </>
              )}
            </form>
            <div className="chat-disclaimer">
              {t('disclaimer')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function getDisplayName(user) {
  const raw = user?.name || user?.full_name || '';
  if (!raw || raw.includes('@') || /^[a-zA-Z0-9._-]+$/.test(raw)) return '؟';
  return raw;
}

function BotText({ text }) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
