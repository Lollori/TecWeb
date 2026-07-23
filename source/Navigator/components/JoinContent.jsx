function JoinContent({ onJoined }) {
  const [code,      setCode]      = React.useState('');
  const [joining,   setJoining]   = React.useState(false);
  const [joinError, setJoinError] = React.useState(null);

  async function handleJoin() {
    const trimmed = code.trim();
    if (!trimmed || joining) return;
    setJoining(true);
    setJoinError(null);
    if (!acquireNavLock(trimmed, 'studente')) {
      setJoinError('Questo browser sta già partecipando a questa visita in un\'altra scheda.');
      setJoining(false);
      return;
    }
    try {
      const nomeAccount = localStorage.getItem('userUsername') || '';
      const ruoloAccount = localStorage.getItem('userRole') || '';
      const res  = await fetch(`/api/sessioni/${encodeURIComponent(trimmed)}/join`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: nomeAccount, ruolo: ruoloAccount }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        releaseNavLock(trimmed);
        setJoinError(data.error || 'Codice non trovato. Riprova.');
      } else {
        onJoined(trimmed, data.nome, data.museoIsil);
      }
    } catch (_) {
      releaseNavLock(trimmed);
      setJoinError('Impossibile connettersi al server. Riprova.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="join-wrapper">
      <h1 className="page-title">Unisciti a una Visita</h1>
      <p>Inserisci il codice stanza fornito dal docente</p>
      <div className="join-card">
        <input
          type="text"
          className={`join-code-input${joinError ? ' join-code-input--error' : ''}`}
          placeholder='es. "Fenice rossa"'
          value={code}
          onChange={e => { setCode(e.target.value); setJoinError(null); }}
          onKeyDown={e => e.key === 'Enter' && handleJoin()}
          autoFocus
        />
        {joinError && <p className="join-error">{joinError}</p>}
        <button className="student-join-btn" onClick={handleJoin} disabled={!code.trim() || joining}>
          {joining ? 'Connessione…' : 'Entra →'}
        </button>
      </div>
    </div>
  );
}
