import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import OnboardingModal from './OnboardingModal'
import WorkLogs from './WorkLogs'

export default function Dashboard({ session }) {
  const user = session.user
  const [profile, setProfile] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  // Form state
  const [logDate, setLogDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [description, setDescription] = useState('')
  const [submitMsg, setSubmitMsg] = useState({ text: '', error: false })
  const submitBtnRef = useRef(null)

  // Logs
  const [recentLogs, setRecentLogs] = useState(null)
  const [myLogs, setMyLogs] = useState(null)
  const channelRef = useRef(null)

  const welcomeName = useMemo(() => {
    if (profile?.full_name) return profile.full_name
    return user.user_metadata?.full_name || 'Welcome!'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user.id])

  const fetchProfile = async () => {
    setLoadingProfile(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    setLoadingProfile(false)
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching profile:', error.message)
      return
    }
    if (data) {
      setProfile(data)
    }
  }

const fetchRecentLogs = async () => {
  const { data, error } = await supabase
    .from('work_logs')
    .select(`
      id,
      user_id,
      log_date,
      description,
      created_at,
      profiles!work_logs_user_id_fkey (
        full_name,
        study_year
      )
    `)
    .order('log_date', { ascending: false })
    .limit(50)

  if (error) console.error("Recent Logs Error:", error)
  setRecentLogs(data || [])
}

const fetchMyLogs = async () => {
  const { data, error } = await supabase
    .from('work_logs')
    .select(`
      id,
      user_id,
      log_date,
      description,
      created_at,
      profiles!work_logs_user_id_fkey (
        full_name,
        study_year
      )
    `)
    .eq('user_id', user.id)
    .order('log_date', { ascending: false })

  if (error) console.error("My Logs Error:", error)
  setMyLogs((data || []).map((d) => ({ ...d, me: true })))
}

  const subscribeLogs = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }
    const ch = supabase
      .channel('public:work_logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'work_logs' }, () => {
        fetchRecentLogs()
        fetchMyLogs()
      })
      .subscribe()
    channelRef.current = ch
  }

  useEffect(() => {
    fetchProfile()
    fetchRecentLogs()
    fetchMyLogs()
    subscribeLogs()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const submitWork = async (e) => {
    e.preventDefault()
    setSubmitMsg({ text: '', error: false })
    const btn = submitBtnRef.current
    if (btn) btn.disabled = true

    const { error } = await supabase.from('work_logs').insert({
      user_id: user.id,
      log_date: logDate,
      description
    })

    if (btn) btn.disabled = false

    if (error) {
      setSubmitMsg({ text: `Error: ${error.message}`, error: true })
    } else {
      setSubmitMsg({ text: 'Work logged successfully!', error: false })
      setDescription('')
      // logs update via realtime subscription
    }
  }
  const exportCSV = (logs) => {
  if (!logs?.length) return alert("No logs to export")

  const headers = ["Name", "Study Year", "Date", "Description"]

  const rows = logs.map(l => [
    l.user_name || l.profiles?.full_name || "",
    l.profiles?.study_year || "",
    l.log_date || "",
    l.description || ""
  ])

  const csv = [
    headers.join(","),
    ...rows.map(r => r.map(v => `"${v}"`).join(","))
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "club_logs.csv"
  a.click()
  URL.revokeObjectURL(url)
}


  return (
    <div className="h-full">
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold leading-6 text-gray-900">
                Welcome{profile?.full_name ? `, ${profile.full_name}` : '!'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">{user.email}</p>
            </div>
            <button
              onClick={signOut}
              className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl py-8 sm:px-6 lg:px-8">
        {/* Work Log Form */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="text-xl font-semibold">Log Your Work</h2>
          {profile && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  disabled
                  value={profile.full_name}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Study Year</label>
                <input
                  type="text"
                  disabled
                  value={`Year ${profile.study_year}`}
                  className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm sm:text-sm"
                />
              </div>
            </div>
          )}

          <form onSubmit={submitWork} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Work</label>
              <input
                type="date"
                required
                value={logDate}
                onChange={(e) => setLogDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Work Done</label>
              <textarea
                rows="4"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            {submitMsg.text && (
              <div className={`text-sm ${submitMsg.error ? 'text-red-600' : 'text-green-600'}`}>
                {submitMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                ref={submitBtnRef}
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Submit Work
              </button>
            </div>
          </form>
        </div>

        {/* Your Work History */}
        <div className="mt-12">
          <WorkLogs title="Your Work History" logs={myLogs} />
        </div>

        {/* Recent Club Activity */}
        <div className="mt-12">
          <h2 className="text-xl font-semibold">Recent Club Activity</h2>
          <WorkLogs title="" logs={recentLogs} />
        </div>
        <div className="mt-6">
        <button
            onClick={() => exportCSV(recentLogs)}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700"
        >
            Download CSV
        </button>
        </div>

      </main>

      {/* Onboarding modal if no profile */}
      {!loadingProfile && !profile && (
        <OnboardingModal
          user={user}
          onDone={(p) => {
            setProfile(p)
          }}
        />
      )}
    </div>
  )
}
