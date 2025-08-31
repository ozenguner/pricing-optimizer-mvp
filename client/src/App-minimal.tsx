import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

// Simple component imports (not lazy loaded)
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={
            <div className="p-8">
              <h1 className="text-2xl font-bold text-gray-900">Welcome to RateCardLab</h1>
              <p className="mt-4 text-gray-600">
                Please <a href="/login" className="text-blue-600 hover:underline">login</a> or{' '}
                <a href="/register" className="text-blue-600 hover:underline">register</a> to get started.
              </p>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  )
}

export default App