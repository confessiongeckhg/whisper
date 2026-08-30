import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api.js';

export default function Send() {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getProfile(username).then(setProfile).catch(() => setNotFound(true));
  }, [username]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setError('');
    setLoading(true);
    try {
      await api.sendMessage(username, text.trim());
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (notFound) {
    return (
      <div className="wrap">
        <div className="eyebrow">Whisper &middot; anonymous</div>
        <h1 className="headline">This inbox doesn't exist</h1>
        <p className="sub">The link you followed doesn't lead anywhere.</p>
        <Link to="/"><button>Create your own inbox</button></Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="wrap">
        <div className="eyebrow">Whisper &middot; anonymous</div>
        <h1 className="headline">Sent.</h1>
        <p className="sub">{profile?.displayName} will never know it was you.</p>
        <div className="card">
          <button onClick={() => { setSent(false); setText(''); }}>Send another</button>
          <Link to="/signup"><button className="accent" style={{ marginTop: 10 }}>Make your own inbox</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <div className="eyebrow">Whisper &middot; anonymous</div>
      <h1 className="headline">Tell <em>{profile ? profile.displayName : '…'}</em><br/>what you really think.</h1>
      <p className="sub">They will never see your name, device, or where this came from.</p>
      <form className="card" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          maxLength={500}
          placeholder="Type honestly. No one will know it was you…"
          required
        />
        <button className="accent" disabled={loading || !text.trim()}>{loading ? 'Sending…' : 'Send anonymously'}</button>
      </form>
    </div>
  );
}
