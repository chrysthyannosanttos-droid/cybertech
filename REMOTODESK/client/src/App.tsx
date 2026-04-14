import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Monitor, Shield, MousePointer2, Keyboard, Activity, Search,
  MessageSquare, LogOut, Users, Clock, Wifi, Cpu, ArrowRight,
  Copy, Star, Trash2, MoreHorizontal, Settings, Maximize2,
  Volume2, VolumeX, RefreshCcw, Power, ChevronDown, Bell,
  Zap, Globe, Lock, Eye, Download, Upload
} from 'lucide-react';

const SERVER_URL = 'http://localhost:3000';

// ─── Mock Data ───
const mockDevices = [
  { id: '482910', name: 'PC-Recepção', os: 'Windows 11', ip: '192.168.1.10', status: 'online' as const, lastSeen: 'Agora', favorite: true },
  { id: '719384', name: 'DESKTOP-MARIA', os: 'Windows 10', ip: '192.168.1.22', status: 'online' as const, lastSeen: 'Agora', favorite: true },
  { id: '305821', name: 'NOTE-VENDAS', os: 'Windows 11', ip: '192.168.1.35', status: 'offline' as const, lastSeen: '2h atrás', favorite: false },
  { id: '112944', name: 'SVR-BACKUP', os: 'Ubuntu 22.04', ip: '192.168.1.5', status: 'online' as const, lastSeen: 'Agora', favorite: false },
  { id: '887201', name: 'NOTEBOOK-TI', os: 'Windows 11', ip: '192.168.1.50', status: 'online' as const, lastSeen: 'Agora', favorite: true },
  { id: '334556', name: 'PC-FINANCEIRO', os: 'Windows 10', ip: '192.168.1.44', status: 'offline' as const, lastSeen: '1d atrás', favorite: false },
];

const recentSessions = [
  { id: '482910', name: 'PC-Recepção', date: 'Hoje, 14:32', duration: '23 min' },
  { id: '719384', name: 'DESKTOP-MARIA', date: 'Hoje, 10:15', duration: '1h 12min' },
  { id: '112944', name: 'SVR-BACKUP', date: 'Ontem, 16:40', duration: '45 min' },
];

// ─── Main App ───
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [targetId, setTargetId] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'recent' | 'favorites'>('devices');
  const [sidebarTab, setSidebarTab] = useState<'connect' | 'address'>('connect');
  // WebRTC toggle and connection objects
  const [useWebRTC, setUseWebRTC] = useState(false);
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [webrtcStream, setWebrtcStream] = useState<MediaStream | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);
  const fpsCountRef = useRef(0);
  const fpsTimerRef = useRef(0);

  useEffect(() => {
    if (isLoggedIn) {
      const s = io(SERVER_URL);
      setSocket(s);

      s.on('screen-frame', (data: ArrayBuffer) => {
        const blob = new Blob([data], { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx?.drawImage(img, 0, 0);
            URL.revokeObjectURL(url);
            setLatency(Date.now() - startTimeRef.current);
            startTimeRef.current = Date.now();
            fpsCountRef.current++;
          }
        };
        img.src = url;
      });

      // FPS counter
      const fpsInterval = setInterval(() => {
        setFps(fpsCountRef.current);
        fpsCountRef.current = 0;
      }, 1000);

      s.on('tech-joined', () => { setIsConnected(true); setError(''); });
      s.on('error-msg', (msg) => { setError(msg); setIsConnected(false); });
      
      return () => { 
        s.disconnect(); 
        clearInterval(fpsInterval);
      };
    }
  }, [isLoggedIn]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setTimeout(() => { setIsLoggedIn(true); setIsAuthenticating(false); }, 1200);
  };

  const handleConnect = async (id?: string) => {
    const connId = id || targetId;
    if (!socket || connId.length !== 6) {
      setError('ID inválido');
      return;
    }
    setTargetId(connId);
    if (useWebRTC) {
      // Initiate WebRTC offer via signaling server
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      });
      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('webrtc-ice', { roomId: connId, candidate: e.candidate });
        }
      };
      pc.ontrack = (event) => {
        setWebrtcStream(event.streams[0]);
      };
      // Create data channel for control messages (optional)
      const dc = pc.createDataChannel('control');
      dc.onopen = () => console.log('DataChannel open');

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('webrtc-offer', { roomId: connId, sdp: offer });

      // Listen for answer
      socket.once('webrtc-answer', async ({ sdp }) => {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp));
        setPeerConnection(pc);
        setIsConnected(true);
      });

      // ICE candidates from remote
      socket.on('webrtc-ice', async ({ candidate }) => {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error(e);
        }
      });
    } else {
      // Fallback to Socket.io signaling
      socket.emit('join-room', connId);
    }
  };

  const sendMouseEvent = (e: React.MouseEvent) => {
    if (!socket || !isConnected || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    socket.emit('mouse-event', { roomId: targetId, event: { type: e.type, x, y, button: e.button } });
  };

  const copyId = () => navigator.clipboard.writeText('738291');

  const onlineCount = mockDevices.filter(d => d.status === 'online').length;
  const filteredDevices = mockDevices.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || d.id.includes(searchTerm);
    if (activeTab === 'favorites') return matchesSearch && d.favorite;
    return matchesSearch;
  });

  // Keyboard state
  const [keyboardActive, setKeyboardActive] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!socket || !isConnected || !keyboardActive) return;
      // Prevent browser shortcuts when controlling remote
      e.preventDefault();
      socket.emit('keyboard-event', { 
        roomId: targetId, 
        event: { 
          type: e.type, 
          key: e.key, 
          keyCode: e.keyCode,
          ctrl: e.ctrlKey,
          shift: e.shiftKey,
          alt: e.altKey
        } 
      });
    };

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKey);
    };
  }, [socket, isConnected, keyboardActive, targetId]);

  // ─── LOGIN SCREEN ───
  if (!isLoggedIn) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        {isAuthenticating ? (
          <div className="flex flex-col items-center gap-5 animate-fadeIn">
            <div style={{ width: 48, height: 48, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 500 }}>Autenticando...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div className="animate-fadeIn" style={{ width: '100%', maxWidth: 420 }}>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Monitor size={22} color="#000" strokeWidth={2.5} />
                </div>
                <span style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px' }}>
                  Remote<span style={{ color: 'var(--accent)' }}>Desk</span>
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Plataforma de suporte remoto seguro</p>
            </div>

            {/* Login Card */}
            <div className="card" style={{ padding: 32 }}>
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Email</label>
                  <input type="email" defaultValue="tecnico@empresa.com" className="input" style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Senha</label>
                  <input type="password" defaultValue="••••••••" className="input" style={{ width: '100%', height: 44, padding: '0 14px', fontSize: 14 }} />
                </div>
                <button type="submit" className="btn-primary" style={{ height: 44, fontSize: 14, marginTop: 4 }}>Entrar</button>
              </form>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-light)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Lock size={12} style={{ color: 'var(--accent)' }} /> TLS 1.3
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                  <Shield size={12} style={{ color: 'var(--accent)' }} /> E2E Encrypted
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ─── REMOTE SESSION VIEW ───  
  if (isConnected) {
    return (
      <div style={{ height: '100vh', width: '100vw', background: '#000', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ height: 48, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="dot-online" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{targetId}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{latency}ms</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>•</span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{fps} fps</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ToolbarBtn icon={<MousePointer2 size={15}/>} active tooltip="Mouse" />
            <ToolbarBtn 
              icon={<Keyboard size={15}/>} 
              active={keyboardActive} 
              onClick={() => setKeyboardActive(!keyboardActive)} 
              tooltip="Teclado (Ativa captura de teclas)" 
            />
            <ToolbarBtn icon={<Maximize2 size={15}/>} tooltip="Tela cheia" />
            <ToolbarBtn icon={<Monitor size={15}/>} tooltip="Monitores" />
            <div style={{ width: 1, height: 20, background: 'var(--border-light)', margin: '0 8px' }} />
            <ToolbarBtn icon={<RefreshCcw size={15}/>} tooltip="Reconectar" />
            <button onClick={() => setIsConnected(false)} className="btn-danger" style={{ height: 32, padding: '0 14px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Power size={13} /> Encerrar
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={sendMouseEvent}
            onMouseUp={sendMouseEvent}
            onMouseMove={(e) => e.buttons === 1 && sendMouseEvent(e)}
            style={{ maxWidth: '100%', maxHeight: '100%', cursor: 'none' }}
          />
          <div className="scanline" />
        </div>

        {/* Status Bar */}
        <div style={{ height: 28, background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatusPill icon={<Upload size={10}/>} text="12 KB/s" />
            <StatusPill icon={<Download size={10}/>} text="1.2 MB/s" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <StatusPill icon={<Shield size={10}/>} text="AES-256" />
            <StatusPill icon={<Globe size={10}/>} text="Socket.IO" />
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN DASHBOARD ───
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* ─── Top Bar ─── */}
      <header style={{ height: 56, background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Monitor size={17} color="#000" strokeWidth={2.5} />
          </div>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.3px' }}>
            Remote<span style={{ color: 'var(--accent)' }}>Desk</span>
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button className="btn-ghost" style={{ height: 34, padding: '0 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <MessageSquare size={14} /> Chat
          </button>
          <button className="btn-ghost" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={15} />
          </button>
          <button className="btn-ghost" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Settings size={15} />
          </button>
          <div style={{ width: 1, height: 20, background: 'var(--border-light)', margin: '0 4px' }} />
          <button onClick={() => setIsLoggedIn(false)} className="btn-ghost" style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <LogOut size={15} />
          </button>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* ─── Left Panel: Connection ─── */}
        <div style={{ width: 360, borderRight: '1px solid var(--border-light)', display: 'flex', flexDirection: 'column', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          
          {/* Your Desk */}
          <div className="animate-fadeIn" style={{ padding: 24, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Sua Estação</div>
            <div className="card-inner" style={{ padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>Seu ID</div>
                <div style={{ fontSize: 24, fontWeight: 900, letterSpacing: '3px', color: 'var(--text-primary)' }}>738 291</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                <button onClick={copyId} className="btn-ghost" style={{ height: 28, padding: '0 10px', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Copy size={12} /> Copiar
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="dot-online" style={{ width: 6, height: 6 }} />
                  <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>Pronto</span>
                </div>
              </div>
            </div>
            
            {/* Download Button */}
            <a 
              href="/RemoteDesk-Installer.exe" 
              download 
              className="btn-ghost" 
              style={{ 
                marginTop: 16, width: '100%', height: 40, border: '1px dashed var(--border)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                fontSize: 12, fontWeight: 700, textDecoration: 'none', color: 'var(--text-secondary)'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Download size={16} style={{ color: 'var(--accent)' }} />
              Baixar Agente Windows
            </a>
          </div>

          {/* Remote Desk */}
          <div className="animate-fadeIn-delay" style={{ padding: 24, borderBottom: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 14 }}>Acesso Remoto</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="ID do dispositivo"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                maxLength={6}
                className="input"
                style={{ flex: 1, height: 44, padding: '0 14px', fontSize: 14, fontWeight: 600, letterSpacing: '1px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
              <button
                onClick={() => handleConnect()}
                disabled={targetId.length < 6}
                className="btn-primary"
                style={{ height: 44, padding: '0 20px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Zap size={15} /> Conectar
              </button>
            </div>
            {error && <p style={{ marginTop: 8, fontSize: 12, color: 'var(--danger)', fontWeight: 500 }}>{error}</p>}
          </div>

          {/* Stats */}
          <div className="animate-fadeIn-delay2" style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <MiniStat icon={<Monitor size={14}/>} label="Dispositivos" value={String(mockDevices.length)} />
            <MiniStat icon={<Wifi size={14}/>} label="Online" value={String(onlineCount)} color="var(--success)" />
            <MiniStat icon={<Clock size={14}/>} label="Sessões hoje" value="12" />
            <MiniStat icon={<Activity size={14}/>} label="Tempo médio" value="34m" />
          </div>

          {/* Recent Sessions */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 12 }}>Sessões Recentes</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recentSessions.map(s => (
                <button key={s.id} onClick={() => { setTargetId(s.id); handleConnect(s.id); }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', transition: '0.15s' }}
                  onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
                  onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Monitor size={14} style={{ color: 'var(--text-muted)' }} />
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{s.name}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.date}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>{s.duration}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ─── Right Panel: Devices ─── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* Tabs + Search */}
          <div style={{ padding: '20px 28px 0', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: 0 }}>
                <TabBtn label="Todos" active={activeTab === 'devices'} onClick={() => setActiveTab('devices')} count={mockDevices.length} />
                <TabBtn label="Favoritos" active={activeTab === 'favorites'} onClick={() => setActiveTab('favorites')} count={mockDevices.filter(d => d.favorite).length} />
                <TabBtn label="Recentes" active={activeTab === 'recent'} onClick={() => setActiveTab('recent')} count={recentSessions.length} />
              </div>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" placeholder="Buscar dispositivo..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                  className="input" style={{ width: 260, height: 36, paddingLeft: 34, paddingRight: 12, fontSize: 12 }}
                />
              </div>
            </div>
          </div>

          {/* Device List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 28px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {filteredDevices.map((dev, i) => (
                <div
                  key={dev.id}
                  className="animate-fadeIn"
                  style={{ 
                    animationDelay: `${i * 0.05}s`,
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 16px', borderRadius: 'var(--radius-md)',
                    border: '1px solid transparent',
                    transition: 'all 0.15s', cursor: 'pointer'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Icon */}
                    <div style={{ width: 42, height: 42, borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                      <Monitor size={18} style={{ color: dev.status === 'online' ? 'var(--accent)' : 'var(--text-muted)' }} />
                      <div className={dev.status === 'online' ? 'dot-online' : 'dot-offline'} style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, border: '2px solid var(--bg-primary)' }} />
                    </div>
                    {/* Info */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{dev.name}</span>
                        {dev.favorite && <Star size={12} style={{ color: 'var(--warning)', fill: 'var(--warning)' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, fontWeight: 500 }}>
                        {dev.id} · {dev.os} · {dev.ip}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Wifi size={13} style={{ color: dev.status === 'online' ? 'var(--success)' : 'var(--text-muted)' }} />
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{dev.lastSeen}</span>
                    </div>
                    {dev.status === 'online' ? (
                      <button onClick={(e) => { e.stopPropagation(); handleConnect(dev.id); }} className="btn-primary" style={{ height: 32, padding: '0 16px', fontSize: 12, fontWeight: 700 }}>
                        Conectar
                      </button>
                    ) : (
                      <span style={{ height: 32, padding: '0 16px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)' }}>
                        Offline
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub Components ───

const ToolbarBtn = ({ icon, active = false, tooltip, onClick }: { icon: any, active?: boolean, tooltip?: string, onClick?: () => void }) => (
  <button
    title={tooltip}
    onClick={onClick}
    style={{
      width: 34, height: 34, borderRadius: 'var(--radius-sm)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: active ? 'var(--accent)' : 'transparent',
      color: active ? '#000' : 'var(--text-secondary)',
      border: active ? 'none' : '1px solid transparent',
      cursor: 'pointer', transition: '0.1s'
    }}
    onMouseOver={(e) => { if (!active) { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}}
    onMouseOut={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}}
  >
    {icon}
  </button>
);

const StatusPill = ({ icon, text }: { icon: any, text: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
    <span style={{ color: 'var(--text-muted)' }}>{icon}</span>
    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{text}</span>
  </div>
);

const MiniStat = ({ icon, label, value, color }: { icon: any, label: string, value: string, color?: string }) => (
  <div className="card-inner" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
    <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

const TabBtn = ({ label, active, onClick, count }: { label: string, active: boolean, onClick: () => void, count: number }) => (
  <button
    onClick={onClick}
    style={{
      height: 36, padding: '0 16px', fontSize: 12, fontWeight: 600,
      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
      background: active ? 'var(--bg-secondary)' : 'transparent',
      border: active ? '1px solid var(--border-light)' : '1px solid transparent',
      borderRadius: 'var(--radius-sm)',
      cursor: 'pointer', transition: '0.15s',
      display: 'flex', alignItems: 'center', gap: 6
    }}
    onMouseOver={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
    onMouseOut={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-muted)'; }}
  >
    {label}
    <span style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--accent)' : 'var(--text-muted)', background: active ? 'var(--accent-soft)' : 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: 10 }}>{count}</span>
  </button>
);

export default App;
