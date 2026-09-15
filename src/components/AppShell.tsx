import Sidebar from './Sidebar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-900 to-slate-800">
      <Sidebar />
      <main className="flex-1 p-8 min-w-0">{children}</main>
    </div>
  )
}
