import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../lib/api.js';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { token } = await api.login({ username, password });
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
      <h1 className="headline">Welcome <em>back</em></h1>
      <form className="card" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <label>Username</label>
        <input value={username} onChange={e => setUsername(e.target.value)} required />
        <label>Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button disabled={loading}>{loading ? 'Creating…' : 'Create your inbox'}</button>
      </form>
      <p className="footnote">Already have an inbox? <Link to="/login">Log in</Link></p>
    </div>
  );
}
