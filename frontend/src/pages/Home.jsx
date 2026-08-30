import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  return (
    <div className="wrap">
      <div className="eyebrow">Whisper &middot; anonymous</div>
      <h1 className="headline">Say the thing<br/>you can't <em>say</em>.</h1>
      <p className="sub">Make a link. Drop it in your bio or your story. What comes back is honest, because no one has to sign their name.</p>
      <div className="card">
        <button onClick={() => navigate('/signup')}>Create your inbox</button>
        <button className="ghost" style={{ marginTop: 10 }} onClick={() => navigate('/login')}>I already have an inbox</button>
      </div>
      <p className="footnote">Anyone with your link can send you a message. Only you can read what's inside.</p>
    </div>
  );
}
