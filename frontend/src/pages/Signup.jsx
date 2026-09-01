import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.register({ username, displayName, password });
      setToken(token);
      navigate('/inbox');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="wrap">
      <div className="eyebrow">Whisper &middot; anonymous</div>
      <h1 className="headline">Claim your <em>link</em></h1>
      <p className="sub">This becomes your inbox: whisper.app/u/{username || 'yourname'}</p>
      <form className="card" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="lowercase, no spaces" required />
        <label>Display name</label>
        <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="what people will see" required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="8+ characters" required minLength={8} />
        <button disabled={loading}>{loading ? 'Creating…' : 'Create your inbox'}</button>
      </form>
      <p className="footnote">Already have an inbox? <Link to="/login">Log in</Link></p>
    </div>
  );
}
