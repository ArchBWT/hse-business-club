import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import PostCard from '../components/PostCard'
import PostDetailModal from '../components/PostDetailModal'
import toast from 'react-hot-toast'
import { Search, SlidersHorizontal, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { INDUSTRY_OPTIONS } from '../utils/helpers'
import './FeedPage.css'

export default function FeedPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)

  const [filters, setFilters] = useState({
    type: '',
    industry: '',
    is_remote: '',
    search: '',
  })
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(filters.search), 400)
    return () => clearTimeout(t)
  }, [filters.search])

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, per_page: 12 }
      if (filters.type) params.type = filters.type
      if (filters.industry) params.industry = filters.industry
      if (filters.is_remote !== '') params.is_remote = filters.is_remote === 'true'
      if (debouncedSearch) params.search = debouncedSearch

      const { data } = await api.get('/posts/', { params })
      setPosts(data.items)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      toast.error('Не удалось загрузить публикации')
    } finally {
      setLoading(false)
    }
  }, [page, filters.type, filters.industry, filters.is_remote, debouncedSearch])

  useEffect(() => {
    setPage(1)
  }, [filters.type, filters.industry, filters.is_remote, debouncedSearch])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const setFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }))
  const clearFilters = () => setFilters({ type: '', industry: '', is_remote: '', search: '' })
  const hasActiveFilters = filters.type || filters.industry || filters.is_remote || filters.search

  const handleApply = () => {
    fetchPosts()
    setSelectedPost(null)
  }

  return (
    <div className="feed-page">
      {/* Header */}
      <div className="feed-header">
        <div>
          <h1 className="feed-title">Лента предложений</h1>
          <p className="feed-subtitle">
            {loading ? 'Загружаем...' : `${total} публикаций`}
          </p>
        </div>

        {/* Search */}
        <div className="feed-search-wrap">
          <div className="feed-search">
            <Search size={16} className="feed-search-icon" />
            <input
              type="search"
              className="feed-search-input"
              placeholder="Поиск по названию, описанию, навыкам..."
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
            />
            {filters.search && (
              <button className="feed-search-clear" onClick={() => setFilter('search', '')}>
                <X size={14} />
              </button>
            )}
          </div>
          <button
            className={`btn btn-secondary ${showFilters ? 'btn-active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={16} />
            Фильтры
            {hasActiveFilters && <span className="filter-dot" />}
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="feed-filters">
          <div className="feed-filter-row">
            <div className="form-group">
              <label className="form-label">Тип</label>
              <select
                className="form-select"
                value={filters.type}
                onChange={(e) => setFilter('type', e.target.value)}
              >
                <option value="">Все</option>
                <option value="startup">Стартапы</option>
                <option value="vacancy">Вакансии</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Отрасль</label>
              <select
                className="form-select"
                value={filters.industry}
                onChange={(e) => setFilter('industry', e.target.value)}
              >
                <option value="">Все</option>
                {INDUSTRY_OPTIONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Формат</label>
              <select
                className="form-select"
                value={filters.is_remote}
                onChange={(e) => setFilter('is_remote', e.target.value)}
              >
                <option value="">Любой</option>
                <option value="true">Удалённо</option>
                <option value="false">Офис</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button className="btn btn-ghost btn-sm" onClick={clearFilters}>
                <X size={14} /> Сбросить
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quick type tabs */}
      <div className="feed-tabs">
        {[
          { value: '', label: 'Все' },
          { value: 'startup', label: '🚀 Стартапы' },
          { value: 'vacancy', label: '💼 Вакансии' },
        ].map((tab) => (
          <button
            key={tab.value}
            className={`feed-tab ${filters.type === tab.value ? 'feed-tab--active' : ''}`}
            onClick={() => setFilter('type', tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="feed-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="post-card-skeleton card">
              <div className="skeleton" style={{ height: 20, width: '60%', marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 24, width: '85%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 16, width: '40%' }} />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔍</div>
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить фильтры или поисковый запрос</p>
          {hasActiveFilters && (
            <button className="btn btn-secondary" onClick={clearFilters}>
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="feed-grid">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onClick={() => setSelectedPost(post)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="feed-pagination">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft size={16} /> Назад
          </button>
          <span className="feed-page-info">Страница {page} из {pages}</span>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setPage((p) => Math.min(pages, p + 1))}
            disabled={page === pages}
          >
            Вперёд <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPost && (
        <PostDetailModal
          postId={selectedPost.id}
          onClose={() => setSelectedPost(null)}
          onApply={handleApply}
        />
      )}
    </div>
  )
}
