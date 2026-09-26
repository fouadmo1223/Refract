import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { TOOLS } from '@/constants/tools'
import { AppShell } from '@/components/layout/AppShell'
import { TOOL_PAGES } from './toolRoutes'

const HomePage = lazy(() => import('@/pages/HomePage'))
const CategoryPage = lazy(() => import('@/pages/CategoryPage'))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="image-tools" element={<CategoryPage category="image" />} />
        <Route path="video-tools" element={<CategoryPage category="video" />} />
        <Route path="ai-tools" element={<CategoryPage category="ai" />} />
        <Route path="tools" element={<CategoryPage category="all" />} />
        {TOOLS.filter((tool) => TOOL_PAGES[tool.id]).map((tool) => {
          const Page = TOOL_PAGES[tool.id]
          return <Route key={tool.id} path={tool.path.slice(1)} element={<Page />} />
        })}
        {/* Aliases for common URL shapes */}
        <Route path="video-to-gif" element={<Navigate to="/video/to-gif" replace />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
