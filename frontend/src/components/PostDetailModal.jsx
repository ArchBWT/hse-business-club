import { useState, useEffect } from 'react'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import {
  parseTags, timeAgo, getInitials,
  POST_TYPE_LABELS, APPLICATION_STATUS_LABELS, STAGE_LABELS
} from '../utils/helpers'
import {
  MapPin, Wifi, Users, Eye, Clock, X, Send, CheckCircle,
  XCircle, ExternalLink, Rocket, Briefcase
} from 'lucide-react'
import './PostDetailModal.css'

export default function PostDetailModal({ postId, onClose, onApply }) {
  const { user } = useAuth()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showApplyForm, setShowApplyForm] = useState(false)

  useEffect(() => {
    fetchPost()
  }, [postId])

  // Close on Escape
  useEffect(() => {
    const handle = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  const fetchPost = async () => {
    setLoading(true)
    try {
      const { data } = await api.get(`/posts/${postId}`)
      setPost(data)
    } catch {
      toast.error('Не удалось загрузить публикацию')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    setApplying(true)
    try {
      await api.post(`/applications/${postId}`, { cover_letter: coverLetter || null })
      toast.success('Отклик отправлен! ✅')
      setShowApplyForm(false)
      setCoverLetter('')
      await fetchPost()
      onApply?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Ошибка при отправке отклика')
    } finally {
      setApplying(false)
    }
  }

  const isOwner = user && post && user.id === post.author_id
  const isActive = post?.status === 'active'
  const tags = parseTags(post?.skills_required)

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-large" role="dialog" aria-modal="true">
        {/* Header */}
        <div className="modal-header">
          <div className="post-modal-type-wrap">
            {post && (
              <span className={`badge ${post.type === 'startup' ? 'badge-startup' : 'badge-vacancy'}`}>
                {post.type === 'startup' ? <Rocket size={10} /> : <Briefcase size={10} />}
                {POST_TYPE_LABELS[post.type]}
              </span>
            )}
            {post?.stage && (
              <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
                {STAGE_LABELS[post.stage] ?? post.stage}
              </span>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Закрыть">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: 300 }}>
              <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : post ? (
            <>
              {/* Title */}
              <h2 className="post-modal-title">{post.title}</h2>

              {/* Author */}
              <div className="post-modal-author">
                <div className="avatar-placeholder" style={{ width: 40, height: 40, fontSize: '1rem' }}>
                  {getInitials(post.author?.full_name)}
                </div>
                <div>
                  <p className="post-modal-author-name">{post.author?.full_name}</p>
                  <p className="post-modal-author-meta">
                    <Clock size={12} /> {timeAgo(post.created_at)}
                    {' · '}
                    <Eye size={12} /> {post.views_count} просмотров
                    {' · '}
                    <Users size={12} /> {post.applications_count} откликов
                  </p>
                </div>
              </div>

              {/* Meta chips */}
              <div className="post-modal-chips">
                {post.industry && (
                  <span className="post-modal-chip post-modal-chip--industry">{post.industry}</span>
                )}
                {post.is_remote ? (
                  <span className="post-modal-chip"><Wifi size={12} /> Удалённо</span>
                ) : post.location ? (
                  <span className="post-modal-chip"><MapPin size={12} /> {post.location}</span>
                ) : null}
                {post.compensation && (
                  <span className="post-modal-chip post-modal-chip--comp">💰 {post.compensation}</span>
                )}
              </div>

              {/* Description */}
              <section className="post-modal-section">
                <h3 className="post-modal-section-title">О проекте / предложении</h3>
                <p className="post-modal-text">{post.description}</p>
              </section>

              {/* Looking for */}
              <section className="post-modal-section post-modal-section--highlight">
                <h3 className="post-modal-section-title">Кого ищем</h3>
                <p className="post-modal-text">{post.looking_for}</p>
              </section>

              {/* Skills */}
              {tags.length > 0 && (
                <section className="post-modal-section">
                  <h3 className="post-modal-section-title">Навыки</h3>
                  <div className="tags-list">
                    {tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
                  </div>
                </section>
              )}

              {/* Status banner */}
              {post.status !== 'active' && (
                <div className="post-modal-closed-banner">
                  🔒 Эта публикация закрыта и больше не принимает отклики
                </div>
              )}

              {/* Apply section */}
              {!isOwner && user && isActive && (
                <div className="post-modal-apply">
                  {post.user_has_applied ? (
                    <div className={`post-modal-applied-status post-modal-applied-status--${post.user_application_status}`}>
                      {post.user_application_status === 'pending' && <><Clock size={16} /> Ваш отклик на рассмотрении</>}
                      {post.user_application_status === 'accepted' && <><CheckCircle size={16} /> Ваш отклик принят! Свяжитесь с автором.</>}
                      {post.user_application_status === 'rejected' && <><XCircle size={16} /> Ваш отклик не прошёл на этот раз</>}
                    </div>
                  ) : showApplyForm ? (
                    <div className="post-modal-apply-form">
                      <div className="form-group">
                        <label className="form-label" htmlFor="cover-letter">
                          Сопроводительное письмо
                          <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}> (необязательно)</span>
                        </label>
                        <textarea
                          id="cover-letter"
                          className="form-textarea"
                          placeholder="Расскажите, почему вы подходите для этого проекта..."
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows={4}
                          maxLength={2000}
                        />
                        <p style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)', textAlign: 'right' }}>
                          {coverLetter.length}/2000
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => setShowApplyForm(false)}>
                          Отмена
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleApply}
                          disabled={applying}
                        >
                          {applying ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Send size={16} />}
                          {applying ? 'Отправляем...' : 'Отправить отклик'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-primary btn-lg" onClick={() => setShowApplyForm(true)}>
                      <Send size={18} />
                      Откликнуться
                    </button>
                  )}
                </div>
              )}

              {!user && isActive && (
                <div className="post-modal-apply">
                  <p style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>
                    <a href="/login" style={{ color: 'var(--color-primary-light)' }}>Войдите</a>, чтобы откликнуться
                  </p>
                </div>
              )}

              {isOwner && (
                <div className="post-modal-apply">
                  <p style={{ color: 'var(--color-text-faint)', fontSize: 'var(--font-size-sm)', textAlign: 'center' }}>
                    Это ваша публикация. Управляйте ею в разделе <a href="/my-posts" style={{ color: 'var(--color-primary-light)' }}>«Мои публикации»</a>
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
