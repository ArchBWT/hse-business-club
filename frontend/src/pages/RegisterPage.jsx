import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import './Auth.css'

export default function RegisterPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '', username: '', full_name: '', password: '',
  })
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/auth/register', form)
      await login(form.email, form.password)
      toast.success('Аккаунт создан! Добро пожаловать 🎉')
      navigate('/feed')
    } catch (err) {
      const detail = err.response?.data?.detail
      if (Array.isArray(detail)) {
        toast.error(detail[0]?.msg || 'Ошибка валидации')
      } else {
        toast.error(detail || 'Ошибка регистрации')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">Б</div>
          <div>
            <h1 className="auth-logo-title">HSE Business Club</h1>
            <p className="auth-logo-sub">Стартапы и Вакансии</p>
          </div>
        </div>

        <h2 className="auth-title">Создать аккаунт</h2>
        <p className="auth-desc">Присоединяйтесь к сообществу</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label required" htmlFor="full_name">Полное имя</label>
            <input
              id="full_name"
              className="form-input"
              placeholder="Иван Иванов"
              value={form.full_name}
              onChange={set('full_name')}
              required
              minLength={2}
            />
          </div>
          <div className="form-group">
            <label className="form-label required" htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              type="email"
              className="form-input"
              placeholder="you@hse.ru"
              value={form.email}
              onChange={set('email')}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label required" htmlFor="username">Юзернейм</label>
            <input
              id="username"
              className="form-input"
              placeholder="ivan_ivanov"
              value={form.username}
              onChange={set('username')}
              required
              minLength={3}
              pattern="^[a-zA-Z0-9_.-]+$"
              title="Только латинские буквы, цифры, _ . -"
            />
          </div>
          <div className="form-group">
            <label className="form-label required" htmlFor="reg-password">
              Пароль <span style={{ color: 'var(--color-text-faint)', fontWeight: 400 }}>(мин. 8 символов, A-Z + 0-9)</span>
            </label>
            <input
              id="reg-password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={form.password}
              onChange={set('password')}
              required
              minLength={8}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-lg auth-submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
            {loading ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="auth-link-text">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="auth-link">Войти</Link>
        </p>
      </div>
    </div>
  )
}
