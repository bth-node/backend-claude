const App = (() => {
  // ── State ────────────────────────────────────────────────────────────────
  let currentUser = null
  let socket = null
  let chatUsername = null
  let apiDoc = null
  const onlineUsers = new Set()

  // ── API Helper (cookie-based auth) ───────────────────────────────────────
  async function api(method, path, body) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    }

    if (body) opts.body = JSON.stringify(body)

    const res = await fetch(path, opts)
    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      throw new Error(data.message || `HTTP ${res.status}`)
    }

    return data
  }

  // ── Health ───────────────────────────────────────────────────────────────
  async function loadHealth() {
    const dot = document.querySelector('.health-dot')
    const text = document.getElementById('health-text')
    const pre = document.getElementById('health-response')

    try {
      const data = await api('GET', '/health')
      dot.classList.add('health-dot--ok')
      dot.classList.remove('health-dot--error')
      text.textContent = 'Server is running'
      pre.textContent = JSON.stringify(data, null, 2)
      pre.classList.remove('hidden')
    } catch {
      dot.classList.add('health-dot--error')
      dot.classList.remove('health-dot--ok')
      text.textContent = 'Server not reachable — is npm run dev running?'
      pre.classList.add('hidden')
    }
  }

  // ── API Doc ──────────────────────────────────────────────────────────────
  function hasEndpoint(method, path) {
    if (!apiDoc) return false
    return apiDoc.endpoints.some((ep) => ep.method === method && ep.path === path)
  }

  function unlockFeatures() {
    if (hasEndpoint('GET', '/api/users?name=')) {
      document.getElementById('users-search').classList.remove('hidden')
    }
  }

  async function loadApiDoc() {
    const tbody = document.getElementById('doc-tbody')

    try {
      const doc = await api('GET', '/api/doc')
      apiDoc = doc
      unlockFeatures()
      tbody.innerHTML = doc.endpoints
        .map(
          (ep) => `
        <tr>
          <td><span class="doc-method doc-method--${ep.method.toLowerCase()}">${ep.method}</span></td>
          <td><code>${ep.path}</code></td>
          <td>${ep.auth ? '<span class="doc-auth-badge">auth</span>' : ''}</td>
          <td class="doc-desc">${ep.description}</td>
        </tr>
      `
        )
        .join('')
    } catch {
      // leave placeholder
    }
  }

  // ── Users ────────────────────────────────────────────────────────────────
  async function searchUsers() {
    const query = document.getElementById('users-search-input').value.trim()
    await loadUsers(query)
  }

  async function loadUsers(name = '') {
    const grid = document.getElementById('users-grid')
    const path = name ? `/api/users?name=${encodeURIComponent(name)}` : '/api/users'

    try {
      const users = await api('GET', path)

      if (users.length === 0) {
        grid.innerHTML = `
          <div class="api-badge" style="background:rgba(251,191,36,0.08);border-color:rgba(251,191,36,0.2);color:var(--amber);">
            <span class="dot"></span>
            No users in the database yet — add one via MongoDB Compass to see it appear here
          </div>`
        return
      }

      grid.innerHTML = users
        .map(
          (u, i) => `
        <div class="user-card" style="animation-delay:${i * 0.05}s" onclick="App.loadUser('${u._id}')">
          ${
            u.avatar
              ? `<img class="user-avatar user-avatar--img" src="/img/${u.avatar}" alt="${u.name}">`
              : `<div class="user-avatar">${u.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}</div>`
          }
          <div class="user-name">${u.name}</div>
          <div class="user-email">${u.email}</div>
        </div>
      `
        )
        .join('')
    } catch (err) {
      console.error('GET /api/users failed:', err.message)
    }
  }

  async function loadUser(id) {
    const detail = document.getElementById('user-detail')
    const label = document.getElementById('user-detail-label')
    const pre = document.getElementById('user-detail-response')

    label.textContent = `GET /api/users/${id}`
    pre.textContent = 'Loading…'
    detail.classList.remove('hidden')

    try {
      const user = await api('GET', `/api/users/${id}`)
      pre.textContent = JSON.stringify(user, null, 2)
    } catch (err) {
      pre.textContent = `Error: ${err.message}`
    }
  }

  // ── Dashboard ───────────────────────────────────────────────────────────
  async function renderDashboard() {
    const profileContent = document.getElementById('profile-content')
    const messagesList = document.getElementById('messages-list')
    const messageForm = document.getElementById('message-form')

    if (!currentUser) {
      profileContent.innerHTML = `
        <div class="lock-state">
          <div class="lock-icon">⚿</div>
          <p>Sign in to see your profile</p>
        </div>`
      messagesList.innerHTML = `
        <div class="lock-state">
          <div class="lock-icon">⚿</div>
          <p>Sign in to see your messages</p>
        </div>`
      messageForm.classList.add('hidden')
      return
    }

    messageForm.classList.remove('hidden')

    // GET /api/messages/stream
    initStream()

    // GET /api/me
    try {
      const user = await api('GET', '/api/me')
      currentUser = user
      profileContent.innerHTML = `
        <div class="profile-avatar-wrap">
          ${
            user.avatar
              ? `<img class="profile-avatar" src="/img/${user.avatar}" alt="${user.name}">`
              : `<div class="profile-avatar profile-avatar--initials">${user.name
                  .split(' ')
                  .map((w) => w[0])
                  .join('')
                  .toUpperCase()}</div>`
          }
        </div>
        <div class="profile-row">
          <span class="profile-key">Name</span>
          <span class="profile-val">${user.name}</span>
        </div>
        <div class="profile-row">
          <span class="profile-key">Email</span>
          <span class="profile-val">${user.email}</span>
        </div>
        <div class="profile-row">
          <span class="profile-key">Member since</span>
          <span class="profile-val">${new Date(user.createdAt).toLocaleDateString('en-SE', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
        </div>
        ${
          hasEndpoint('PATCH', '/api/me')
            ? `
        <div class="profile-edit-wrap">
          <button class="msg-btn" onclick="App.showEditProfile()">Edit profile</button>
          <form id="edit-profile-form" class="hidden" onsubmit="App.saveProfile(event)" style="margin-top:12px;">
            <input id="edit-name" type="text" value="${user.name}" placeholder="Name" style="width:100%;padding:8px;margin-bottom:8px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;">
            <select id="edit-avatar" style="width:100%;padding:8px;margin-bottom:8px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:6px;">
              <option value="">— keep current avatar —</option>
              <option value="alice" ${user.avatar === 'alice' ? 'selected' : ''}>Alice</option>
              <option value="bob" ${user.avatar === 'bob' ? 'selected' : ''}>Bob</option>
              <option value="clara" ${user.avatar === 'clara' ? 'selected' : ''}>Clara</option>
            </select>
            <button type="submit" class="msg-btn">Save</button>
            <button type="button" class="msg-btn" onclick="App.cancelEditProfile()">Cancel</button>
          </form>
        </div>`
            : ''
        }`
    } catch {
      profileContent.innerHTML = `
        <div class="lock-state">
          <div class="lock-icon">⚠</div>
          <p><code>GET /api/me</code> not implemented</p>
        </div>`
    }

    // GET /api/messages
    try {
      const messages = await api('GET', '/api/messages')
      if (messages.length === 0) {
        messagesList.innerHTML = `<p class="muted-text" style="padding:20px 0;">No messages yet — write one below.</p>`
      } else {
        messagesList.innerHTML = messages
          .map(
            (m) => `
          <div class="msg-item" data-id="${m._id}">
            <div class="msg-text">${m.text}</div>
            <div class="msg-footer">
              <span class="msg-time">${timeAgo(m.createdAt)}</span>
              <span class="msg-actions">
                <button class="msg-btn" onclick="App.editMessage('${m._id}', this)">Edit</button>
                <button class="msg-btn msg-btn--delete" onclick="App.deleteMessage('${m._id}')">Delete</button>
              </span>
            </div>
          </div>`
          )
          .join('')
      }
    } catch {
      messagesList.innerHTML = `
        <div class="lock-state">
          <div class="lock-icon">⚠</div>
          <p><code>GET /api/messages</code> not implemented</p>
        </div>`
    }
  }

  async function postMessage(e) {
    e.preventDefault()

    const input = document.getElementById('message-input')
    const text = input.value.trim()
    if (!text) return

    try {
      await api('POST', '/api/messages', { text })
      input.value = ''
      renderDashboard()
    } catch (err) {
      console.error('POST /api/messages failed:', err.message)
    }
  }

  async function deleteMessage(id) {
    try {
      await api('DELETE', `/api/messages/${id}`)
      renderDashboard()
    } catch (err) {
      console.error('DELETE /api/messages failed:', err.message)
    }
  }

  function editMessage(id, btn) {
    const item = btn.closest('.msg-item')
    const textEl = item.querySelector('.msg-text')
    const current = textEl.textContent

    textEl.innerHTML = `
      <input class="msg-edit-input" value="${current}">
      <button class="msg-btn" onclick="App.saveMessage('${id}', this)">Save</button>
      <button class="msg-btn" onclick="App.cancelEdit(this, '${current}')">Cancel</button>
    `
    const inputEl = item.querySelector('.msg-edit-input')
    inputEl.focus()
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') saveMessage(id, inputEl)
    })
  }

  async function saveMessage(id, btn) {
    const item = btn.closest('.msg-item')
    const input = item.querySelector('.msg-edit-input')
    const text = input.value.trim()
    if (!text) return

    try {
      await api('PATCH', `/api/messages/${id}`, { text })
      renderDashboard()
    } catch (err) {
      console.error('PATCH /api/messages failed:', err.message)
    }
  }

  function cancelEdit(btn, original) {
    const item = btn.closest('.msg-item')
    const textEl = item.querySelector('.msg-text')
    textEl.innerHTML = original
  }

  // ── SSE Stream ───────────────────────────────────────────────────────────
  let eventSource = null

  function initStream() {
    if (eventSource) return

    const dot = document.getElementById('stream-dot')
    const statusText = document.getElementById('stream-status-text')
    const list = document.getElementById('stream-list')

    list.innerHTML = ''

    eventSource = new EventSource('/api/messages/stream')

    eventSource.onopen = () => {
      dot.classList.add('stream-dot--connected')
      statusText.textContent = 'connected'
    }

    eventSource.onmessage = (event) => {
      const message = JSON.parse(event.data)
      const { name, avatar } = message.user || {}
      const initials = name
        ? name
            .split(' ')
            .map((w) => w[0])
            .join('')
            .toUpperCase()
        : '?'
      const el = document.createElement('div')
      el.className = 'msg-item stream-msg-item'
      el.innerHTML = `
        <div class="stream-msg-header">
          ${
            avatar
              ? `<img class="user-avatar user-avatar--img stream-avatar" src="/img/${avatar}" alt="${name}">`
              : `<div class="user-avatar stream-avatar">${initials}</div>`
          }
          <span class="stream-msg-name">${name || 'Unknown'}</span>
          <span class="msg-time">${timeAgo(message.createdAt)}</span>
        </div>
        <div class="msg-text">${message.text}</div>`
      list.prepend(el)
    }

    eventSource.onerror = () => {
      dot.classList.remove('stream-dot--connected')
      statusText.textContent = 'disconnected'
      eventSource.close()
      eventSource = null
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  function initChat() {
    if (socket?.connected) return

    if (socket) {
      socket.disconnect()
      socket = null
    }

    const statusEl = document.getElementById('chat-status')
    const chatInput = document.getElementById('chat-input')
    const chatSend = document.getElementById('chat-send')
    const statusText = document.getElementById('chat-status-text')

    chatUsername =
      currentUser?.name ||
      JSON.parse(localStorage.getItem('cachedUser'))?.name ||
      `Guest_${Math.floor(Math.random() * 1000)}`

    socket = io(window.location.origin, { withCredentials: true })

    socket.on('connect', () => {
      statusText.textContent = `Connected as ${chatUsername}`
      statusEl.className = 'chat-status connected'

      socket.emit('join', chatUsername)
      onlineUsers.add(chatUsername)
      chatInput.disabled = false
      chatSend.disabled = false
      renderOnlineList()
    })

    socket.on('message', ({ user, text, system }) => {
      appendChatMessage({ user, text, system, mine: user === chatUsername && !system })

      if (system) {
        if (text.includes('joined')) onlineUsers.add(user)
        if (text.includes('left')) onlineUsers.delete(user)
        renderOnlineList()
      }
    })

    socket.on('disconnect', () => {
      statusText.textContent = 'Disconnected'
      onlineUsers.clear()
      renderOnlineList()
    })

    socket.on('users', (list) => {
      onlineUsers.clear()
      list.forEach((u) => onlineUsers.add(u))
      renderOnlineList()
    })

    socket.on('connect_error', (err) => {
      console.error('Socket error:', err.message)
      statusText.textContent = 'Socket connection failed'
    })
  }

  function sendChat(e) {
    e.preventDefault()

    const input = document.getElementById('chat-input')
    const text = input.value.trim()

    if (!text || !socket?.connected) return

    socket.emit('message', { user: chatUsername, text })
    input.value = ''
  }

  function appendChatMessage({ user, text, system, mine }) {
    const container = document.getElementById('chat-messages')
    const el = document.createElement('div')

    if (system) {
      el.className = 'chat-msg system'
      el.textContent = `${user} ${text}`
    } else {
      el.className = `chat-msg ${mine ? 'mine' : 'theirs'}`
      el.innerHTML = `
        <div class="chat-msg-author">${user}</div>
        <div class="chat-msg-text">${text}</div>
      `
    }

    container.appendChild(el)
    container.scrollTop = container.scrollHeight
  }

  function renderOnlineList() {
    const list = document.getElementById('online-list')
    if (!list) return

    if (onlineUsers.size === 0) {
      list.innerHTML = `<p class="muted-text">No one connected</p>`
      return
    }

    list.innerHTML = [...onlineUsers]
      .map(
        (u) => `
      <div class="online-user">
        <span class="online-dot"></span>
        ${u}
      </div>
    `
      )
      .join('')
  }

  // ── Edit Profile ─────────────────────────────────────────────────────────
  function showEditProfile() {
    document.getElementById('edit-profile-form').classList.remove('hidden')
  }

  function cancelEditProfile() {
    document.getElementById('edit-profile-form').classList.add('hidden')
  }

  async function saveProfile(e) {
    e.preventDefault()
    const name = document.getElementById('edit-name').value.trim()
    const avatar = document.getElementById('edit-avatar').value
    const body = {}
    if (name) body.name = name
    if (avatar) body.avatar = avatar
    if (!Object.keys(body).length) return

    try {
      const user = await api('PATCH', '/api/me', body)
      currentUser = user
      setLoggedIn(user)
      renderDashboard()
    } catch (err) {
      console.error('PATCH /api/me failed:', err.message)
    }
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  function setLoggedIn(user) {
    currentUser = user
    localStorage.setItem('cachedUser', JSON.stringify(user))

    document.getElementById('nav-auth-links').classList.add('hidden')
    document.getElementById('nav-user').classList.remove('hidden')
    document.getElementById('nav-username-label').textContent = user.name

    closeModal()
  }

  function logout() {
    currentUser = null

    document.getElementById('nav-auth-links').classList.remove('hidden')
    document.getElementById('nav-user').classList.add('hidden')
    document.getElementById('nav-username-label').textContent = ''

    socket?.disconnect()
    socket = null

    renderDashboard()
  }

  async function initAuth() {
    try {
      const user = await api('GET', '/api/me')
      setLoggedIn(user)
    } catch {
      currentUser = null
      localStorage.removeItem('cachedUser')
    }
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  function showModal(view) {
    document.getElementById('modal-overlay').classList.remove('hidden')
    document.getElementById('modal-login').classList.toggle('hidden', view !== 'login')
    document.getElementById('modal-register').classList.toggle('hidden', view !== 'register')
  }

  function closeModal(e) {
    if (e && e.target !== document.getElementById('modal-overlay')) return
    document.getElementById('modal-overlay').classList.add('hidden')
  }

  // ── Auth forms ────────────────────────────────────────────────────────────
  async function login(e) {
    e.preventDefault()

    const email = document.getElementById('login-email').value
    const password = document.getElementById('login-password').value
    const errorEl = document.getElementById('login-error')

    try {
      const data = await api('POST', '/auth/login', { email, password })
      errorEl.classList.add('hidden')
      setLoggedIn(data.user)
      renderDashboard()
    } catch (err) {
      errorEl.textContent = err.message
      errorEl.classList.remove('hidden')
    }
  }

  async function register(e) {
    e.preventDefault()

    const name = document.getElementById('reg-name').value
    const email = document.getElementById('reg-email').value
    const password = document.getElementById('reg-password').value
    const errorEl = document.getElementById('reg-error')

    try {
      await api('POST', '/auth/register', { name, email, password })
      errorEl.classList.add('hidden')
      loadUsers()
      closeModal()
      navigate('users')
    } catch (err) {
      errorEl.textContent = err.message
      errorEl.classList.remove('hidden')
    }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  function navigate(view) {
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'))
    document.querySelectorAll('.nav-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.view === view)
    })

    document.getElementById(`view-${view}`).classList.add('active')

    if (view === 'home') {
      loadHealth()
      loadApiDoc()
    }
    if (view === 'users') {
      loadUsers()
    }
    if (view === 'dashboard') renderDashboard()
    if (view === 'chat') initChat()
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function timeAgo(dateStr) {
    const seconds = Math.floor((Date.now() - new Date(dateStr)) / 1000)

    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  // ── Init ──────────────────────────────────────────────────────────────────
  async function init() {
    await initAuth()
    await loadApiDoc()
    loadHealth()

    if (currentUser) renderDashboard()
  }

  init()

  // ── Public API ────────────────────────────────────────────────────────────
  return {
    navigate,
    showModal,
    closeModal,
    login,
    register,
    logout,
    postMessage,
    sendChat,
    loadUser,
    deleteMessage,
    editMessage,
    saveMessage,
    cancelEdit,
    searchUsers,
    showEditProfile,
    cancelEditProfile,
    saveProfile,
  }
})()

App.navigate('home')
