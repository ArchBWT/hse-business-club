import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Rocket } from 'lucide-react'
import './Auth.css'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.email, form.password)
      navigate('/feed')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (email, password) => {
    setForm({ email, password })
  }

  return (
    <div className="auth-page">
      <div className="auth-bg" />
      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="auth-logo-icon">Б</div>
          <div>
            <h1 className="auth-logo-title">HSE Business Club</h1>
            <p className="auth-logo-sub">Стартапы и Вакансии</p>
          </div>
        </div>

        <h2 className="auth-title">Добро пожаловать!</h2>
        <p className="auth-desc">Войдите в личный кабинет участника</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="you@hse.ru"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">Пароль</label>
            <div className="auth-password-wrap">
              <input
                id="password"
                type={showPass ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPass(!showPass)}
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg auth-submit"
            disabled={loading}
          >
            {loading ? <span className="spinner" style={{ width: 18, height: 18 }} /> : null}
            {loading ? 'Входим...' : 'Войти'}
          </button>
        </form>

        {/* Demo accounts */}
        <div className="auth-demo">
          <p className="auth-demo-title">Тестовые аккаунты</p>
          <div className="auth-demo-grid">
            {[
              { label: '👑 Администратор', email: 'admin@hse.ru', pass: 'Admin1234' },
              { label: '🚀 Алиса (фаундер)', email: 'alice@hse.ru', pass: 'Alice1234' },
              { label: '💻 Боб (разработчик)', email: 'bob@hse.ru', pass: 'Bob12345' },
              { label: '📊 Кэрол (PM)', email: 'carol@hse.ru', pass: 'Carol1234' },
            ].map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="auth-demo-btn"
                onClick={() => fillDemo(acc.email, acc.pass)}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>

        <p className="auth-link-text">
          Нет аккаунта?{' '}
          <Link to="/register" className="auth-link">Зарегистрироваться</Link>
        </p>
      </div>
    </div>
  )
}
