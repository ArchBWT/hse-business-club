import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import {
  getInitials, timeAgo, parseTags,
  APPLICATION_STATUS_LABELS, POST_TYPE_LABELS
} from '../utils/helpers'
import {
  User, Edit3, Save, X, Briefcase, Send, Inbox,
  CheckCircle, XCircle, Clock, BarChart2, Link as LinkIcon
} from 'lucide-react'
import './DashboardPage.css'

export default function DashboardPage() {
  const { user, refreshUser } = useAuth()
  const [stats, setStats] = useState(null)
  const [sentApps, setSentApps] = useState([])
  const [receivedApps, setReceivedApps] = useState([])
  const [tab, setTab] = useState('profile')
  const [editing, setEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [respondingId, setRespondingId] = useState(null)
  const [respondForm, setRespondForm] = useState({ status: '', message: '' })

  useEffect(() => {
    loadStats()
    loadSentApps()
    loadReceivedApps()
  }, [])

  useEffect(() => {
    if (user) {
      setProfileForm({
        full_name: user.full_name || '',
        bio: user.bio || '',
        telegram_handle: user.telegram_handle || '',
        linkedin_url: user.linkedin_url || '',
        skills_tags: user.skills_tags || '',
      })
    }
  }, [user])

  const loadStats = async () => {
    try {
      const { data } = await api.get('/users/me/stats')
      setStats(data)
    } catch {}
  }

  const loadSentApps = async () => {
    try {
      const { data } = await api.get('/applications/sent')
      setSentApps(data)
    } catch {}
  }

  const loadReceivedApps = async () => {
    try {
      const { data } = await api.get('/applications/received')
      setReceivedApps(data)
    } catch {}
  }

  const saveProfile = async () => {
    setSaving(true)
    try {
      await api.patch('/users/me', profileForm)
      await refreshUser()
      setEditing(false)
      toast.success('Профиль обновлён!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка сохранения')
    } finally {
      setSaving(false)
    }
  }

  const respond = async (appId, status, message) => {
    try {
      await api.patch(`/applications/${appId}/respond`, {
        status,
        response_message: message || null,
      })
      toast.success(status === 'accepted' ? 'Отклик принят!' : 'Отклик отклонён')
      setRespondingId(null)
      loadReceivedApps()
      loadStats()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка')
    }
  }

  const statusIcon = (status) => {
    if (status === 'accepted') return <CheckCircle size={14} style={{ color: '#6ee7b7' }} />
    if (status === 'rejected') return <XCircle size={14} style={{ color: '#fca5a5' }} />
    return <Clock size={14} style={{ color: '#fcd34d' }} />
  }

  return (
    <div className="dashboard-page">
      {/* Hero */}
      <div className="dashboard-hero">
        <div className="avatar-placeholder dashboard-avatar">
          {getInitials(user?.full_name)}
        </div>
        <div>
          <h1 className="dashboard-name">{user?.full_name}</h1>
          <p className="dashboard-username">@{user?.username}</p>
          {user?.is_admin && <span className="badge badge-admin" style={{ marginTop: 6 }}>👑 Администратор</span>}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="dashboard-stats">
          {[
            { icon: <Briefcase size={20} />, label: 'Публикаций', value: stats.posts_count },
            { icon: <Send size={20} />, label: 'Откликов отправлено', value: stats.sent_applications },
            { icon: <Inbox size={20} />, label: 'Откликов получено', value: stats.received_applications },
            { icon: <Clock size={20} />, label: 'Ожидают ответа', value: stats.pending_received, highlight: stats.pending_received > 0 },
          ].map((s) => (
            <div key={s.label} className={`dashboard-stat-card ${s.highlight ? 'dashboard-stat-card--highlight' : ''}`}>
              <div className="dashboard-stat-icon">{s.icon}</div>
              <div className="dashboard-stat-value">{s.value}</div>
              <div className="dashboard-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="dashboard-tabs">
        {[
          { id: 'profile', label: '👤 Профиль' },
          { id: 'sent', label: `📤 Мои отклики (${sentApps.length})` },
          { id: 'received', label: `📥 Входящие (${receivedApps.length})` },
        ].map((t) => (
          <button
            key={t.id}
            className={`feed-tab ${tab === t.id ? 'feed-tab--active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {tab === 'profile' && (
        <div className="dashboard-profile card">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">Профиль участника</h2>
            {!editing ? (
              <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>
                <Edit3 size={14} /> Редактировать
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>
                  <X size={14} /> Отмена
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={saving}>
                  {saving ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Save size={14} />}
                  Сохранить
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="dashboard-edit-form">
              {[
                { key: 'full_name', label: 'Полное имя', type: 'input', required: true },
                { key: 'bio', label: 'О себе', type: 'textarea' },
                { key: 'telegram_handle', label: 'Telegram (без @)', type: 'input', placeholder: 'username' },
                { key: 'linkedin_url', label: 'LinkedIn URL', type: 'input', placeholder: 'https://linkedin.com/in/...' },
                { key: 'skills_tags', label: 'Навыки (через запятую)', type: 'input', placeholder: 'python, product, react' },
              ].map(({ key, label, type, placeholder, required }) => (
                <div className="form-group" key={key}>
                  <label className={`form-label ${required ? 'required' : ''}`}>{label}</label>
                  {type === 'textarea' ? (
                    <textarea
                      className="form-textarea"
                      value={profileForm[key] || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                      placeholder={placeholder}
                      rows={3}
                    />
                  ) : (
                    <input
                      className="form-input"
                      value={profileForm[key] || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                      placeholder={placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-profile-view">
              <div className="profile-field">
                <span className="profile-field-label">Email</span>
                <span>{user?.email}</span>
              </div>
              {user?.bio && (
                <div className="profile-field">
                  <span className="profile-field-label">О себе</span>
                  <p style={{ lineHeight: 1.6 }}>{user.bio}</p>
                </div>
              )}
              {user?.telegram_handle && (
                <div className="profile-field">
                  <span className="profile-field-label">Telegram</span>
                  <a href={`https://t.me/${user.telegram_handle}`} target="_blank" rel="noreferrer"
                     style={{ color: 'var(--color-secondary)' }}>
                    @{user.telegram_handle}
                  </a>
                </div>
              )}
              {user?.linkedin_url && (
                <div className="profile-field">
                  <span className="profile-field-label">LinkedIn</span>
                  <a href={user.linkedin_url} target="_blank" rel="noreferrer"
                     style={{ color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LinkIcon size={14} /> Открыть профиль
                  </a>
                </div>
              )}
              {user?.skills_tags && (
                <div className="profile-field">
                  <span className="profile-field-label">Навыки</span>
                  <div className="tags-list" style={{ marginTop: 4 }}>
                    {parseTags(user.skills_tags).map((t) => <span key={t} className="tag">{t}</span>)}
                  </div>
                </div>
              )}
              {!user?.bio && !user?.skills_tags && (
                <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--font-size-sm)' }}>
                  Заполните профиль, чтобы другие участники могли узнать о вас больше
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Sent Applications */}
      {tab === 'sent' && (
        <div className="dashboard-apps-list">
          {sentApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📤</div>
              <h3>Нет отправленных откликов</h3>
              <p>Перейдите в ленту и откликнитесь на интересные стартапы или вакансии</p>
            </div>
          ) : sentApps.map((app) => (
            <div key={app.id} className="app-card card">
              <div className="app-card-header">
                <div>
                  <span className={`badge ${app.post.type === 'startup' ? 'badge-startup' : 'badge-vacancy'}`}>
                    {POST_TYPE_LABELS[app.post.type]}
                  </span>
                  <h3 className="app-card-title">{app.post.title}</h3>
                  <p className="app-card-meta">
                    Автор: {app.post.author?.full_name} · {timeAgo(app.created_at)}
                  </p>
                </div>
                <div className="app-card-status">
                  {statusIcon(app.status)}
                  <span className={`badge badge-${app.status}`}>
                    {APPLICATION_STATUS_LABELS[app.status]}
                  </span>
                </div>
              </div>
              {app.cover_letter && (
                <div className="app-card-cover">
                  <p className="app-card-cover-label">Ваше письмо:</p>
                  <p className="app-card-cover-text line-clamp-3">{app.cover_letter}</p>
                </div>
              )}
              {app.response_message && (
                <div className={`app-card-response app-card-response--${app.status}`}>
                  <p className="app-card-cover-label">Ответ автора:</p>
                  <p>{app.response_message}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Received Applications */}
      {tab === 'received' && (
        <div className="dashboard-apps-list">
          {receivedApps.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📥</div>
              <h3>Нет входящих откликов</h3>
              <p>Когда кто-то откликнется на вашу публикацию, отклик появится здесь</p>
            </div>
          ) : receivedApps.map((app) => (
            <div key={app.id} className="app-card card">
              <div className="app-card-header">
                <div className="app-card-applicant">
                  <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                    {getInitials(app.applicant?.full_name)}
                  </div>
                  <div>
                    <p className="app-card-applicant-name">{app.applicant?.full_name}</p>
                    <p className="app-card-meta">@{app.applicant?.username} · {timeAgo(app.created_at)}</p>
                    {app.applicant?.skills_tags && (
                      <div className="tags-list" style={{ marginTop: 4 }}>
                        {parseTags(app.applicant.skills_tags).slice(0, 4).map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`badge badge-${app.status}`}>
                  {APPLICATION_STATUS_LABELS[app.status]}
                </span>
              </div>

              {app.cover_letter && (
                <div className="app-card-cover">
                  <p className="app-card-cover-label">Сопроводительное письмо:</p>
                  <p className="app-card-cover-text">{app.cover_letter}</p>
                </div>
              )}

              {app.status === 'pending' && (
                respondingId === app.id ? (
                  <div className="app-card-respond-form">
                    <div className="form-group">
                      <label className="form-label">Ответное сообщение (необязательно)</label>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="Напишите что-нибудь кандидату..."
                        value={respondForm.message}
                        onChange={(e) => setRespondForm({ ...respondForm, message: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => respond(app.id, 'accepted', respondForm.message)}
                      >
                        <CheckCircle size={14} /> Принять
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => respond(app.id, 'rejected', respondForm.message)}
                      >
                        <XCircle size={14} /> Отклонить
                      </button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setRespondingId(null)}>
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setRespondingId(app.id); setRespondForm({ status: '', message: '' }) }}
                  >
                    Ответить на отклик
                  </button>
                )
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
