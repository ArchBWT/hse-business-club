import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getInitials } from '../utils/helpers'
import {
  LayoutGrid, Rocket, UserCircle, LogOut, Shield,
  Menu, X, Bell, Plus
} from 'lucide-react'
import { useState } from 'react'
import './Sidebar.css'

const navItems = [
  { path: '/feed', icon: LayoutGrid, label: 'Лента' },
  { path: '/dashboard', icon: UserCircle, label: 'Личный кабинет' },
  { path: '/my-posts', icon: Rocket, label: 'Мои публикации' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">Б</div>
          <div className="sidebar-logo-text">
            <span className="sidebar-logo-title">HSE Club</span>
            <span className="sidebar-logo-sub">Бизнес-клуб ВШЭ</span>
          </div>
        </div>

        {/* Create post button */}
        <Link
          to="/posts/new"
          className="btn btn-primary sidebar-create-btn"
          onClick={() => setMobileOpen(false)}
        >
          <Plus size={16} />
          Разместить
        </Link>

        {/* Nav */}
        <nav className="sidebar-nav">
          {navItems.map(({ path, icon: Icon, label }) => (
            <Link
              key={path}
              to={path}
              className={`sidebar-nav-item ${isActive(path) ? 'sidebar-nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
          {user?.is_admin && (
            <Link
              to="/admin"
              className={`sidebar-nav-item sidebar-nav-item--admin ${isActive('/admin') ? 'sidebar-nav-item--active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Shield size={18} />
              Администрирование
            </Link>
          )}
        </nav>

        {/* User section */}
        <div className="sidebar-user">
          <div
            className="sidebar-user-info"
            onClick={() => { navigate('/dashboard'); setMobileOpen(false) }}
            role="button"
            tabIndex={0}
          >
            <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: '0.875rem' }}>
              {getInitials(user?.full_name)}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user?.full_name}</span>
              <span className="sidebar-user-role">
                {user?.is_admin ? '👑 Администратор' : '@' + user?.username}
              </span>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm sidebar-logout" onClick={handleLogout} title="Выйти">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
    </>
  )
}
