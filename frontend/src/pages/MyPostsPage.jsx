import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../utils/api'
import toast from 'react-hot-toast'
import PostCard from '../components/PostCard'
import PostDetailModal from '../components/PostDetailModal'
import PostFormModal from '../components/PostFormModal'
import { Plus, Edit3, Trash2, Archive } from 'lucide-react'
import './MyPostsPage.css'

export default function MyPostsPage() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPost, setSelectedPost] = useState(null)
  const [editingPost, setEditingPost] = useState(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/posts/my')
      setPosts(data)
    } catch {
      toast.error('Не удалось загрузить публикации')
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (post) => {
    const newStatus = post.status === 'active' ? 'closed' : 'active'
    try {
      await api.patch(`/posts/${post.id}`, { status: newStatus })
      toast.success(newStatus === 'active' ? 'Публикация активирована' : 'Публикация закрыта')
      loadPosts()
    } catch {
      toast.error('Ошибка обновления')
    }
  }

  const deletePost = async (post) => {
    if (!confirm(`Удалить публикацию "${post.title}"? Все отклики будут удалены.`)) return
    try {
      await api.delete(`/posts/${post.id}`)
      toast.success('Публикация удалена')
      loadPosts()
    } catch {
      toast.error('Ошибка удаления')
    }
  }

  return (
    <div className="my-posts-page">
      <div className="my-posts-header">
        <div>
          <h1 className="feed-title">Мои публикации</h1>
          <p className="feed-subtitle">{posts.length} публикаций</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          <Plus size={16} />
          Разместить
        </button>
      </div>

      {loading ? (
        <div className="loading-screen"><div className="spinner" /></div>
      ) : posts.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🚀</div>
          <h3>Нет публикаций</h3>
          <p>Разместите свой стартап или вакансию, чтобы найти нужных людей</p>
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus size={16} /> Создать публикацию
          </button>
        </div>
      ) : (
        <div className="my-posts-grid">
          {posts.map((post) => (
            <div key={post.id} className="my-post-wrapper">
              <PostCard
                post={post}
                onClick={() => setSelectedPost(post)}
              />
              {/* Owner actions overlay */}
              <div className="my-post-actions">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={(e) => { e.stopPropagation(); setEditingPost(post) }}
                  title="Редактировать"
                >
                  <Edit3 size={14} /> Изменить
                </button>
                <button
                  className={`btn btn-sm ${post.status === 'active' ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={(e) => { e.stopPropagation(); toggleStatus(post) }}
                  title={post.status === 'active' ? 'Закрыть' : 'Открыть'}
                >
                  <Archive size={14} />
                  {post.status === 'active' ? 'Закрыть' : 'Открыть'}
                </button>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={(e) => { e.stopPropagation(); deletePost(post) }}
                  title="Удалить"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPost && (
        <PostDetailModal
          postId={selectedPost.id}
          onClose={() => setSelectedPost(null)}
          onApply={loadPosts}
        />
      )}

      {(showCreateForm || editingPost) && (
        <PostFormModal
          post={editingPost}
          onClose={() => { setShowCreateForm(false); setEditingPost(null) }}
          onSaved={() => { setShowCreateForm(false); setEditingPost(null); loadPosts() }}
        />
      )}
    </div>
  )
}
