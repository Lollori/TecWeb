// src/pages/Item.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import './Item.css'

const LUNGHEZZE = ['3s', '15s', '40s', '1min', '4min']
const LINGUAGGI = ['infantile', 'elementare', 'medio', 'specialistico']

const formVuoto = {
    titolo: '', testo: '', opera: '', autore: '', stile: '',
    lunghezza: '15s', linguaggio: 'medio',
    autoreContenuto: '', licenza: 'CC-BY',
    prezzo: 0, museo: '', immagine: ''
}

const API_URL = 'http://localhost:3000/api/items'

function Item() {
    const navigate = useNavigate()
    const [items, setItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [mostraForm, setMostraForm] = useState(false)
    const [form, setForm] = useState(formVuoto)
    const [editId, setEditId] = useState(null)
    const [errore, setErrore] = useState('')

    const carica = () => {
        fetch(API_URL)
            .then(res => res.json())
            .then(data => { setItems(data); setLoading(false) })
            .catch(() => {
                setErrore('Connessione al server fallita.')
                setLoading(false)
            })
    }

    useEffect(() => { carica() }, [])

    const handleChange = e => {
        const { name, value } = e.target
        setForm(f => ({ ...f, [name]: value }))
    }

    const handleSubmit = async e => {
        e.preventDefault()
        setErrore('')
        const url = editId ? `${API_URL}/${editId}` : API_URL
        const method = editId ? 'PUT' : 'POST'

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            if (!res.ok) {
                const err = await res.json()
                setErrore(err.error || 'Errore salvataggio.')
                return
            }
            setForm(formVuoto); setEditId(null); setMostraForm(false); carica()
        } catch {
            setErrore('Errore di rete.')
        }
    }

    const handleEdit = item => {
        setForm({ ...item })
        setEditId(item._id)
        setMostraForm(true)
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const handleDelete = async id => {
        if (!confirm('Eliminare definitivamente?')) return
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' })
        carica()
    }

    if (loading) return (
        <div className="item-page">
            <p className="empty-msg">Caricamento...</p>
        </div>
    )

    return (
        <div className="item-page">

            {/* TASTO INDIETRO */}
            <div className="nav-container">
                <button onClick={() => navigate('/')} className="btn-back">
                    ← Torna al Menu Principale
                </button>
            </div>

            {/* HEADER */}
            <header className="header-center">
                <h2>Gestione Catalogo</h2>
                <button className="btn-primary" onClick={() => {
                    setMostraForm(!mostraForm)
                    setEditId(null)
                    setForm(formVuoto)
                }}>
                    {mostraForm ? '✕ Chiudi Form' : '+ Nuovo Item'}
                </button>
            </header>

            {/* FORM */}
            {mostraForm && (
                <form className="form-card" onSubmit={handleSubmit}>
                    <h3>{editId ? 'Modifica Opera' : '➕ Nuova Opera'}</h3>
                    {errore && <p className="errore-box">{errore}</p>}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Titolo dell'Opera *</label>
                            <input name="titolo" value={form.titolo} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Museo / Collezione *</label>
                            <input name="museo" value={form.museo} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label>Lunghezza *</label>
                            <select name="lunghezza" value={form.lunghezza} onChange={handleChange} className="form-select">
                                {LUNGHEZZE.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Linguaggio *</label>
                            <select name="linguaggio" value={form.linguaggio} onChange={handleChange} className="form-select">
                                {LINGUAGGI.map(l => <option key={l}>{l}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Testo Descrittivo *</label>
                        <textarea name="testo" value={form.testo} onChange={handleChange} rows={5} required className="form-textarea" />
                    </div>

                    <div className="form-actions">
                        <button type="button" className="btn-secondary" onClick={() => setMostraForm(false)}>Annulla</button>
                        <button type="submit" className="btn-primary">{editId ? 'Salva Modifiche' : 'Crea'}</button>
                    </div>
                </form>
            )}

            {/* GRIGLIA */}
            {items.length === 0
                ? <p className="empty-msg">Nessun item trovato. Inizia ora!</p>
                : (
                    <div className="item-grid">
                        {items.map(item => (
                            <div key={item._id} className="item-card">
                                <div className="card-body">
                                    <h3>{item.titolo}</h3>
                                    <div className="card-tags">
                                        <span className="tag">{item.lunghezza}</span>
                                        <span className="tag">{item.linguaggio}</span>
                                    </div>
                                    <p className="card-text">{item.testo.substring(0, 100)}...</p>
                                    <p className="card-meta">📍 {item.museo}</p>
                                </div>
                                <div className="card-footer">
                                    <button onClick={() => handleEdit(item)} className="btn-text-edit">Modifica</button>
                                    <button onClick={() => handleDelete(item._id)} className="btn-text-delete">Elimina</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )
            }
        </div>
    )
}

export default Item
