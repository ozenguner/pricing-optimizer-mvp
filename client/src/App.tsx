import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { Layout } from './components/layout/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import EmailVerificationPending from './pages/EmailVerificationPending'
import EmailVerificationComplete from './pages/EmailVerificationComplete'
import Dashboard from './pages/Dashboard'
import RateCards from './pages/RateCards'
import RateCardEditor from './pages/RateCardEditor'
import RateCardWizard from './pages/RateCardWizard'
import Calculator from './pages/Calculator'
import ImportExport from './pages/ImportExport'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<EmailVerificationPending />} />
          <Route path="/verify-email/complete" element={<EmailVerificationComplete />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="rate-cards" element={<RateCards />} />
            <Route path="rate-cards/create" element={<RateCardWizard />} />
            <Route path="rate-cards/:id" element={<RateCards />} />
            <Route path="rate-cards/:id/edit" element={<RateCardEditor />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="import-export" element={<ImportExport />} />
          </Route>
        </Routes>
      </div>
    </Router>
  )
}

export default App