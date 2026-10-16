import { useState, useEffect } from 'react'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { X, Rocket, Briefcase } from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../utils/helpers'
import './PostFormModal.css'

const STAGE_OPTIONS = [
  { value: '', label: 'Не указано' },
  { value: 'idea', label: 'Идея' },
  { value: 'mvp', label: 'MVP' },
  { value: 'growth', label: 'Рост' },
]

export default function PostFormModal({ post, onClose, onSaved }) {
  const isEdit = Boolean(post)
  const [form, setForm] = useState({
    type: 'startup',
    title: '',
    description: '',
    looking_for: '',
    stage: '',
    industry: '',
    skills_required: '',
    location: '',
    is_remote: true,
    compensation: '',
    status: 'active',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (post) {
      setForm({
        type: post.type,
        title: post.title,
        description: post.description,
        looking_for: post.looking_for,
        stage: post.stage || '',
        industry: post.industry || '',
        skills_required: post.skills_required || '',
        location: post.location || '',
        is_remote: post.is_remote,
        compensation: post.compensation || '',
        status: post.status,
      })
    }
  }, [post])

  // Close on Escape
  useEffect(() => {
    const handle = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  const set = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [field]: val })
    if (errors[field]) setErrors({ ...errors, [field]: null })
  }

  const validate = () => {
    const errs = {}
    if (!form.title.trim() || form.title.length < 5) errs.title = 'Минимум 5 символов'
    if (!form.description.trim() || form.description.length < 20) errs.description = 'Минимум 20 символов'
    if (!form.looking_for.trim() || form.looking_for.length < 10) errs.looking_for = 'Минимум 10 символов'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload.stage) payload.stage = null
      if (!payload.industry) payload.industry = null
      if (!payload.skills_required) payload.skills_required = null
      if (!payload.location) payload.location = null
      if (!payload.compensation) payload.compensation = null

      if (isEdit) {
        await api.patch(`/posts/${post.id}`, payload)
        toast.success('Публикация обновлена!')
      } else {
        await api.post('/posts/', payload)
        toast.success('Публикация создана! 🎉')
      }
      onSaved()
    } catch (err) {
      const detail = err.response?.data?.detail
      toast.error(Array.isArray(detail) ? detail[0]?.msg : (detail || 'Ошибка сохранения'))
    } finally {
      setSaving(false)
    }
  }

  const isStartup = form.type === 'startup'

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-large" role="dialog">
        <div className="modal-header">
          <div>
            <h2 className="modal-title">{isEdit ? 'Редактировать публикацию' : 'Новая публикация'}</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body post-form">
            {/* Type selector */}
            {!isEdit && (
              <div className="post-form-type">
                <button
                  type="button"
                  className={`post-form-type-btn ${form.type === 'startup' ? 'post-form-type-btn--active' : ''}`}
                  onClick={() => setForm({ ...form, type: 'startup' })}
                >
                  <Rocket size={20} />
                  <span>Стартап</span>
                  <small>Ищу команду / co-founder</small>
                </button>
                <button
                  type="button"
                  className={`post-form-type-btn ${form.type === 'vacancy' ? 'post-form-type-btn--active post-form-type-btn--vacancy' : ''}`}
                  onClick={() => setForm({ ...form, type: 'vacancy' })}
                >
                  <Briefcase size={20} />
                  <span>Вакансия</span>
                  <small>Ищу специалиста в проект</small>
                </button>
              </div>
            )}

            {/* Title */}
            <div className="form-group">
              <label className="form-label required" htmlFor="post-title">Название</label>
              <input
                id="post-title"
                className={`form-input ${errors.title ? 'form-input--error' : ''}`}
                placeholder={isStartup ? 'EduPath — AI-платформа для обучения' : 'Frontend-разработчик (React)'}
                value={form.title}
                onChange={set('title')}
                maxLength={300}
              />
              {errors.title && <p className="form-error">{errors.title}</p>}
            </div>

            {/* Description */}
            <div className="form-group">
              <label className="form-label required" htmlFor="post-desc">Описание</label>
              <textarea
                id="post-desc"
                className={`form-textarea ${errors.description ? 'form-input--error' : ''}`}
                placeholder="Расскажите подробно о проекте, идее, задачах..."
                value={form.description}
                onChange={set('description')}
                rows={5}
                maxLength={5000}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)', textAlign: 'right' }}>
                {form.description.length}/5000
              </p>
              {errors.description && <p className="form-error">{errors.description}</p>}
            </div>

            {/* Looking for */}
            <div className="form-group">
              <label className="form-label required" htmlFor="post-looking">Кого ищем</label>
              <textarea
                id="post-looking"
                className={`form-textarea ${errors.looking_for ? 'form-input--error' : ''}`}
                placeholder="Конкретно опишите, кого вы ищете: роль, навыки, ожидания..."
                value={form.looking_for}
                onChange={set('looking_for')}
                rows={3}
                maxLength={1000}
              />
              {errors.looking_for && <p className="form-error">{errors.looking_for}</p>}
            </div>

            {/* Row: stage + industry */}
            <div className="post-form-row">
              {isStartup && (
                <div className="form-group">
                  <label className="form-label" htmlFor="post-stage">Стадия стартапа</label>
                  <select id="post-stage" className="form-select" value={form.stage} onChange={set('stage')}>
                    {STAGE_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="form-label" htmlFor="post-industry">Отрасль</label>
                <select id="post-industry" className="form-select" value={form.industry} onChange={set('industry')}>
                  <option value="">Не указано</option>
                  {INDUSTRY_OPTIONS.map((i) => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Skills */}
            <div className="form-group">
              <label className="form-label" htmlFor="post-skills">Навыки (через запятую)</label>
              <input
                id="post-skills"
                className="form-input"
                placeholder="python, react, ml, fastapi"
                value={form.skills_required}
                onChange={set('skills_required')}
                maxLength={500}
              />
            </div>

            {/* Remote + Location */}
            <div className="post-form-row">
              <div className="form-group post-form-checkbox">
                <label className="post-form-toggle">
                  <input
                    type="checkbox"
                    checked={form.is_remote}
                    onChange={set('is_remote')}
                  />
                  <span className="post-form-toggle-label">Удалённая работа</span>
                </label>
              </div>
              {!form.is_remote && (
                <div className="form-group">
                  <label className="form-label" htmlFor="post-location">Локация</label>
                  <input
                    id="post-location"
                    className="form-input"
                    placeholder="Москва, Санкт-Петербург..."
                    value={form.location}
                    onChange={set('location')}
                    maxLength={200}
                  />
                </div>
              )}
              {!isStartup && (
                <div className="form-group">
                  <label className="form-label" htmlFor="post-comp">Вознаграждение</label>
                  <input
                    id="post-comp"
                    className="form-input"
                    placeholder="50 000 ₽/мес или equity"
                    value={form.compensation}
                    onChange={set('compensation')}
                    maxLength={200}
                  />
                </div>
              )}
            </div>

            {/* Status (edit only) */}
            {isEdit && (
              <div className="form-group">
                <label className="form-label" htmlFor="post-status">Статус</label>
                <select id="post-status" className="form-select" value={form.status} onChange={set('status')}>
                  <option value="active">Активно</option>
                  <option value="closed">Закрыто</option>
                  <option value="draft">Черновик</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : null}
              {saving ? 'Сохраняем...' : (isEdit ? 'Сохранить изменения' : 'Опубликовать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
