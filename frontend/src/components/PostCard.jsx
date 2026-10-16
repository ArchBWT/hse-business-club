import { Link } from 'react-router-dom'
import { getInitials, parseTags, timeAgo, POST_TYPE_LABELS, STAGE_LABELS } from '../utils/helpers'
import { MapPin, Wifi, Users, Eye, Clock, Briefcase, Rocket } from 'lucide-react'
import './PostCard.css'

export default function PostCard({ post, onClick }) {
  const tags = parseTags(post.skills_required)
  const isStartup = post.type === 'startup'

  return (
    <article
      className={`card card-clickable post-card ${isStartup ? 'post-card--startup' : 'post-card--vacancy'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Header */}
      <div className="post-card-header">
        <div className="post-card-badges">
          <span className={`badge ${isStartup ? 'badge-startup' : 'badge-vacancy'}`}>
            {isStartup ? <Rocket size={10} /> : <Briefcase size={10} />}
            {POST_TYPE_LABELS[post.type]}
          </span>
          {post.stage && (
            <span className="badge badge-secondary" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)' }}>
              {STAGE_LABELS[post.stage] ?? post.stage}
            </span>
          )}
          {post.user_has_applied && (
            <span className={`badge badge-${post.user_application_status}`}>
              {post.user_application_status === 'pending' ? '⏳ Отправлено' :
               post.user_application_status === 'accepted' ? '✅ Принято' :
               post.user_application_status === 'rejected' ? '❌ Отклонено' : ''}
            </span>
          )}
        </div>

        {/* Author */}
        <div className="post-card-author">
          <div className="avatar-placeholder" style={{ width: 28, height: 28, fontSize: '0.7rem' }}>
            {getInitials(post.author?.full_name)}
          </div>
          <span>{post.author?.full_name}</span>
        </div>
      </div>

      {/* Content */}
      <h3 className="post-card-title">{post.title}</h3>
      <p className="post-card-desc line-clamp-3">{post.description}</p>

      {/* Looking for */}
      <div className="post-card-looking">
        <Users size={14} className="post-card-looking-icon" />
        <p className="line-clamp-2">{post.looking_for}</p>
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="tags-list post-card-tags">
          {tags.slice(0, 5).map((tag) => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {tags.length > 5 && <span className="tag">+{tags.length - 5}</span>}
        </div>
      )}

      {/* Footer */}
      <div className="post-card-footer">
        <div className="post-card-meta">
          {post.industry && <span className="post-card-industry">{post.industry}</span>}
          {post.is_remote ? (
            <span className="post-card-location"><Wifi size={12} /> Удалённо</span>
          ) : post.location ? (
            <span className="post-card-location"><MapPin size={12} /> {post.location}</span>
          ) : null}
          {post.compensation && (
            <span className="post-card-comp">💰 {post.compensation}</span>
          )}
        </div>
        <div className="post-card-stats">
          <span><Eye size={12} /> {post.views_count}</span>
          <span><Users size={12} /> {post.applications_count}</span>
          <span><Clock size={12} /> {timeAgo(post.created_at)}</span>
        </div>
      </div>
    </article>
  )
}
