import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';
import { generateShareImage, shareImageOrDownload } from '../lib/shareCard.js';

const EMOJIS = ['🔥', '😂', '❤️', '💀'];

export default function Inbox() {
  const [me, setMe] = useState(null);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharingId, setSharingId] = useState(null);
  const [downloadHint, setDownloadHint] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const navigate = useNavigate();

  const shareLink = me ? `${window.location.origin}/u/${me.username}` : '';

  async function load() {
    try {
      const meData = await api.me();
      setMe(meData);
      const msgs = await api.getMessages();
      setMessages(msgs);
    } catch (err) {
      setError(err.message);
      setToken(null);
      navigate('/login');
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(async () => {
      try { setMessages(await api.getMessages()); } catch {}
    }, 8000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function copyLink() {
    navigator.clipboard.writeText(shareLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  async function shareLinkNative() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Send me an anonymous message',
          text: `Send ${me.displayName} an anonymous message 👀`,
          url: shareLink,
        });
      } catch {
        // user cancelled the share sheet — do nothing
      }
    } else {
      copyLink();
    }
  }

  async function shareMessage(id, text) {
    setSharingId(id);
    try {
      const blob = await generateShareImage({ message: text, displayName: me.displayName, link: shareLink });
      const result = await shareImageOrDownload(blob, {
        filename: 'anonymous-message.png',
        title: 'Anonymous message',
        text: `Someone sent me this anonymously — send me one too: ${shareLink}`,
      });
      if (result.method === 'download') {
        showDownloadHint(true);
      }
    } finally {
      setSharingId(null);
    }
  }

  function showDownloadHint(v) {
    setDownloadHint(v);
    if (v) setTimeout(() => setDownloadHint(false), 6000);
  }

  async function toggleReaction(msg, emoji) {
    const next = msg.reaction === emoji ? null : emoji;
    const updated = await api.react(msg.id, next);
    setMessages(prev => prev.map(m => (m.id === msg.id ? updated : m)));
  }

  async function remove(id) {
    await api.deleteMessage(id);
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  function logout() {
    setToken(null);
    navigate('/');
  }

  async function deleteAccount() {
    const sure = window.confirm(
      `Delete your account permanently?\n\nThis removes your inbox link (whisper.app/u/${me.username}) and every message in it. This cannot be undone.`
    );
    if (!sure) return;
    setDeletingAccount(true);
    try {
      await api.deleteAccount();
      setToken(null);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setDeletingAccount(false);
    }
  }

  if (!me) return <div className="wrap"><p className="sub">loading…</p></div>;

  return (
    <div className="wrap">
      <div className="top-nav">
        <div className="eyebrow">Whisper &middot; anonymous</div>
        <button className="ghost small" onClick={logout}>Log out</button>
      </div>
      <h1 className="headline">Hi, <em>{me.displayName}</em>.</h1>
      <p className="sub">Share this link. Every reply lands here — no names attached.</p>
      <div className="linkrow">
        <span>{shareLink}</span>
        <button className="small white" onClick={copyLink}>{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <button className="accent" onClick={shareLinkNative} style={{ marginBottom: 18 }}>Share your link</button>

      {error && <div className="error">{error}</div>}
      {downloadHint && (
        <div className="error" style={{ borderColor: '#C6A8FF', color: '#C6A8FF', background: 'rgba(198,168,255,0.08)' }}>
          Image saved — open Instagram, tap Story, and pick it from your gallery.
        </div>
      )}

      {messages.length === 0 && (
        <div className="card empty">Nothing yet.<br />Share your link to start receiving confessions.</div>
      )}

      {messages.map(m => (
        <div className="msg" key={m.id}>
          <p>{m.text}</p>
          <div className="msg-meta">
            <span className="msg-time">{new Date(m.createdAt).toLocaleString()}</span>
            <div style={{ display: 'flex', gap: 14 }}>
              <button className="del-link" onClick={() => shareMessage(m.id, m.text)} disabled={sharingId === m.id}>
                {sharingId === m.id ? 'Preparing…' : 'Share to Story'}
              </button>
              <button className="del-link" onClick={() => remove(m.id)}>Delete</button>
            </div>
          </div>
          <div className="reactions" style={{ marginTop: 10 }}>
            {EMOJIS.map(e => (
              <button
                key={e}
                className={m.reaction === e ? 'active' : ''}
                onClick={() => toggleReaction(m, e)}
              >{e}</button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ marginTop: 40, textAlign: 'center' }}>
        <button
          className="ghost small"
          onClick={deleteAccount}
          disabled={deletingAccount}
          style={{ color: '#FF7396', borderColor: 'rgba(255,115,150,0.35)' }}
        >
          {deletingAccount ? 'Deleting…' : 'Delete account'}
        </button>
      </div>
    </div>
  );
}
