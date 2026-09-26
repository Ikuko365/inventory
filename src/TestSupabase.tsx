import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

export default function TestSupabase() {
  const [todos, setTodos] = useState<any[]>([])
  const [inputText, setInputText] = useState('')

  // Supabaseからデータを取得する関数
  const fetchTodos = async () => {
    const { data, error } = await supabase.from('todos').select('*')
    if (error) {
      console.error('取得エラー:', error)
    } else if (data) {
      setTodos(data)
    }
  }

  // 初回読み込み時にデータを取得
  useEffect(() => {
    fetchTodos()
  }, [])

  // Supabaseに新しくデータをつ追加する関数
  const handleAdd = async () => {
    if (!inputText) return

    const { error } = await supabase
      .from('todos')
      .insert([{ title: inputText }])

    if (error) {
      console.error('追加エラー:', error)
      alert('追加に失敗しました。RLSの設定やキーを確認してください。')
    } else {
      setInputText('')
      fetchTodos()
    }
  }

  return (
    <div style={{ padding: '20px', border: '2px solid #3ecf8e', borderRadius: '8px', margin: '20px' }}>
      <h2>Supabase 接続テスト画面</h2>

      {/* 入力フォーム */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="新しいタスクを入力"
          style={{ padding: '8px', marginRight: '8px' }}
        />
        <button onClick={handleAdd} style={{ padding: '8px 16px', cursor: 'pointer' }}>
          追加
        </button>
      </div>

      {/* タスク一覧表示 */}
      <h3>取得できたデータ一覧:</h3>
      <ul>
        {todos.map((todo) => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  )
}