export class NetworkManager {
  constructor() {
    this.peer = null;
    this.connections = new Map();
    this.remotePlayers = new Map();
    this.roomCode = '';
    this.role = 'offline';
    this.localName = 'DuckOperator_01';
    this.localSkinHex = 0xffd54f;
    this.onPlayerListChange = null;
    this.onMessage = null;
    this.onStatusChange = null;
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  setLocalProfile(name, skinHex) {
    this.localName = name || 'DuckOperator_01';
    this.localSkinHex = skinHex || 0xffd54f;
    this.broadcast({
      type: 'profile',
      name: this.localName,
      skinHex: this.localSkinHex
    });
    this.emitPlayerList();
  }

  hostRoom() {
    this.disconnect();
    this.roomCode = this.generateRoomCode();
    this.role = 'host';
    this.updateStatus(`Creating room ${this.roomCode}...`);

    this.peer = new Peer(`duckov3d-${this.roomCode}`);

    this.peer.on('open', () => {
      this.updateStatus(`HOSTING ROOM: ${this.roomCode}`);
      this.emitPlayerList();
    });

    this.peer.on('connection', (conn) => {
      this.setupConnection(conn);
    });

    this.peer.on('error', (err) => {
      this.updateStatus(`Room Error: ${err.type}`);
    });
  }
  joinRoom(code) {
    const cleanCode = (code || '').trim().toUpperCase();
    if (!cleanCode) return;

    this.disconnect();
    this.roomCode = cleanCode;
    this.role = 'client';
    this.updateStatus(`Joining room ${cleanCode}...`);

    this.peer = new Peer();

    this.peer.on('open', () => {
      const conn = this.peer.connect(`duckov3d-${cleanCode}`, { reliable: true });
      this.setupConnection(conn);
    });

    this.peer.on('error', () => {
      this.updateStatus(`Room "${cleanCode}" not found.`);
      this.role = 'offline';
    });
  }

  setupConnection(conn) {
    conn.on('open', () => {
      this.connections.set(conn.peer, conn);
      this.remotePlayers.set(conn.peer, {
        id: conn.peer,
        name: 'Online Duck',
        skinHex: 0x00e5ff,
        pos: { x: 0, y: 0, z: 32 },
        rotY: 0,
        hp: 100,
        weaponIdx: 0,
        inRaid: false
      });

      conn.send({
        type: 'profile',
        name: this.localName,
        skinHex: this.localSkinHex
      });

      if (this.role === 'host') {
        this.updateStatus(`HOSTING: ${this.roomCode} (${this.connections.size + 1} Players)`);
      } else {
        this.updateStatus(`CONNECTED TO ROOM: ${this.roomCode}`);
      }
      this.emitPlayerList();
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'profile') {
        const rp = this.remotePlayers.get(conn.peer) || { id: conn.peer };
        rp.name = data.name || 'Online Duck';
        rp.skinHex = data.skinHex || 0x00e5ff;
        this.remotePlayers.set(conn.peer, rp);
        this.emitPlayerList();
      } else if (data.type === 'state') {
        const rp = this.remotePlayers.get(conn.peer) || { id: conn.peer };
        Object.assign(rp, data.state);
        this.remotePlayers.set(conn.peer, rp);
      }

      if (this.onMessage) {
        this.onMessage(conn.peer, data);
      }
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.remotePlayers.delete(conn.peer);
      this.emitPlayerList();
    });
  }
  broadcast(payload) {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(payload);
      }
    });
  }

  sendLocalState(state) {
    if (this.connections.size === 0) return;
    this.broadcast({ type: 'state', state });
  }

  getAllPlayers() {
    const list = [
      { id: 'self', name: `${this.localName} (You)`, isSelf: true, isHost: this.role === 'host' }
    ];
    this.remotePlayers.forEach((rp) => {
      list.push({ id: rp.id, name: rp.name || 'Online Duck', isSelf: false, isHost: false });
    });
    return list;
  }

  isConnected() {
    return this.connections.size > 0;
  }

  isHost() {
    return this.role === 'host';
  }

  disconnect() {
    this.connections.forEach((c) => c.close());
    this.connections.clear();
    this.remotePlayers.clear();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
    this.role = 'offline';
    this.roomCode = '';
    this.emitPlayerList();
  }

  updateStatus(text) {
    if (this.onStatusChange) this.onStatusChange(text);
  }

  emitPlayerList() {
    if (this.onPlayerListChange) this.onPlayerListChange(this.getAllPlayers());
  }
}
