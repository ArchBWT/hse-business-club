import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { getInitials, timeAgo, POST_TYPE_LABELS, POST_STATUS_LABELS } from '../utils/helpers'
import { Users, FileText, Shield, UserCheck, UserX, Trash2, Search } from 'lucide-react'
import './AdminPage.css'

export default function AdminPage() {
  const [users, setUsers] = useState([])
  const [posts, setPosts] = useState([])
  const [tab, setTab] = useState('users')
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [{ data: u }, { data: p }] = await Promise.all([
        api.get('/users/', { params: { limit: 100 } }),
        api.get('/posts/', { params: { per_page: 50, status: undefined } }),
      ])
      setUsers(u)
      // Also load closed/draft posts for admin
      const { data: allPosts } = await api.get('/posts/', { params: { per_page: 50 } })
      setPosts(allPosts.items)
    } catch (err) {
      toast.error('Ошибка загрузки данных')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = async (user) => {
    try {
      if (user.is_active) {
        await api.patch(`/users/${user.id}/deactivate`)
        toast.success(`${user.full_name} деактивирован`)
      } else {
        await api.patch(`/users/${user.id}/activate`)
        toast.success(`${user.full_name} активирован`)
      }
      loadAll()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
  }

  const deletePost = async (post) => {
    if (!confirm(`Удалить публикацию "${post.title}"?`)) return
    try {
      await api.delete(`/posts/${post.id}`)
      toast.success('Публикация удалена')
      loadAll()
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  const filteredUsers = users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase())
  )

  const filteredPosts = posts.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      (p.industry || '').toLowerCase().includes(search.toLowerCase())
  )

  const activeUsers = users.filter((u) => u.is_active).length
  const adminCount = users.filter((u) => u.is_admin).length

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="feed-title">
            <Shield size={28} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8, color: '#fcd34d' }} />
            Администрирование
          </h1>
          <p className="feed-subtitle">Управление пользователями и публикациями</p>
        </div>
      </div>

      {/* Stats */}
      {!loading && (
        <div className="admin-stats">
          {[
            { icon: <Users size={20} />, label: 'Всего пользователей', value: users.length },
            { icon: <UserCheck size={20} />, label: 'Активных', value: activeUsers },
            { icon: <Shield size={20} />, label: 'Администраторов', value: adminCount },
            { icon: <FileText size={20} />, label: 'Публикаций', value: posts.length },
          ].map((s) => (
            <div key={s.label} className="dashboard-stat-card">
              <div className="dashboard-stat-icon">{s.icon}</div>
              <div className="dashboard-stat-value">{s.value}</div>
              <div className="dashboard-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="admin-search">
        <Search size={16} style={{ position: 'absolute', left: 12, color: 'var(--color-text-faint)' }} />
        <input
          type="search"
          className="feed-search-input"
          style={{ paddingLeft: 36 }}
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div className="dashboard-tabs">
        <button
          className={`feed-tab ${tab === 'users' ? 'feed-tab--active' : ''}`}
          onClick={() => setTab('users')}
        >
          👥 Пользователи ({users.length})
        </button>
        <button
          className={`feed-tab ${tab === 'posts' ? 'feed-tab--active' : ''}`}
          onClick={() => setTab('posts')}
        >
          📋 Публикации ({posts.length})
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : tab === 'users' ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Пользователь</th>
                <th>Email</th>
                <th>Роль</th>
                <th>Статус</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className={!u.is_active ? 'admin-row--inactive' : ''}>
                  <td>
                    <div className="admin-user-cell">
                      <div className="avatar-placeholder" style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                        {getInitials(u.full_name)}
                      </div>
                      <div>
                        <p className="admin-user-name">{u.full_name}</p>
                        <p className="admin-user-handle">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="admin-td-muted">{u.email}</td>
                  <td>
                    {u.is_admin
                      ? <span className="badge badge-admin">👑 Admin</span>
                      : <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>User</span>
                    }
                  </td>
                  <td>
                    <span className={`badge ${u.is_active ? 'badge-active' : 'badge-closed'}`}>
                      {u.is_active ? 'Активен' : 'Заблок.'}
                    </span>
                  </td>
                  <td className="admin-td-muted">{timeAgo(u.created_at)}</td>
                  <td>
                    {!u.is_admin && (
                      <button
                        className={`btn btn-sm ${u.is_active ? 'btn-danger' : 'btn-secondary'}`}
                        onClick={() => toggleUser(u)}
                      >
                        {u.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
                        {u.is_active ? 'Блок.' : 'Разблок.'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Публикация</th>
                <th>Тип</th>
                <th>Автор</th>
                <th>Статус</th>
                <th>Отклики</th>
                <th>Дата</th>
                <th>Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredPosts.map((p) => (
                <tr key={p.id}>
                  <td>
                    <p className="admin-post-title">{p.title}</p>
                    {p.industry && <p className="admin-td-muted" style={{ fontSize: '0.7rem' }}>{p.industry}</p>}
                  </td>
                  <td>
                    <span className={`badge ${p.type === 'startup' ? 'badge-startup' : 'badge-vacancy'}`}>
                      {POST_TYPE_LABELS[p.type]}
                    </span>
                  </td>
                  <td className="admin-td-muted">{p.author?.full_name}</td>
                  <td>
                    <span className={`badge badge-${p.status}`}>
                      {POST_STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  <td className="admin-td-muted">{p.applications_count}</td>
                  <td className="admin-td-muted">{timeAgo(p.created_at)}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => deletePost(p)}>
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
