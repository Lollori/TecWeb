import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Topbar from './components/Topbar';
import Navbar from './components/Navbar';
import Bolle from './components/Bolle';   // ← AGGIUNTO
import Item from './pages/Item';
import Musei from './pages/Musei';
import Utenti from './pages/Utenti';
import Visite from './pages/Visite';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <Bolle />        {/* ← AGGIUNTO, fuori da tutto il resto */}
      <Topbar />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Navbar />} />
          <Route path="/item" element={<Item />} />
          <Route path="/musei" element={<Musei />} />
          <Route path="/utenti" element={<Utenti />} />
          <Route path="/visite" element={<Visite />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
