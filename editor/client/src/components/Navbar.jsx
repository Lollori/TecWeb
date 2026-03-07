import { useNavigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPalette, faLandmark, faUser, faMap } from '@fortawesome/free-solid-svg-icons'

function Navbar() {
    const navigate = useNavigate()
    const location = useLocation()

    const voci = [
        { path: '/item', icon: faPalette, label: 'Item' },
        { path: '/musei', icon: faLandmark, label: 'Musei' },
        { path: '/utenti', icon: faUser, label: 'Utenti' },
        { path: '/visite', icon: faMap, label: 'Visite' },
    ]

    return (
        <nav id="topnav">
            {voci.map(v => (
                <a
                    key={v.path}
                    className={`nav-item ${location.pathname === v.path ? 'active' : ''}`}
                    onClick={() => navigate(v.path)}
                    style={{ cursor: 'pointer' }}
                >
                    {/* Aggiunta la prop size="2xl" qui sotto */}
                    <FontAwesomeIcon icon={v.icon} size="2xl" />
                    <span>{v.label}</span>
                </a>
            ))}
        </nav>
    )
}

export default Navbar 

