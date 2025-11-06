import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function OnboardingModal({ user, onDone }) {
  const [studyYear, setStudyYear] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    setErr('')
    setSaving(true)
    const fullName = user.user_metadata?.full_name
    const email = user.email
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        full_name: fullName,
        email,
        study_year: parseInt(studyYear, 10)
      })
      .select()
      .single()

    setSaving(false)
    if (error) {
      setErr(error.message)
      return
    }
    onDone(data)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
      <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-xl font-semibold text-gray-900">
          Welcome, {user.user_metadata?.full_name || 'Friend'}!
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          Please add your study year to continue. You’ll only do this once.
        </p>
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Study Year</label>
            <select
              required
              value={studyYear}
              onChange={(e) => setStudyYear(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="" disabled>Select your year</option>
              <option value="1">1</option><option value="2">2</option>
              <option value="3">3</option><option value="4">4</option>
              <option value="5">5 (M.Tech / Other)</option>
            </select>
          </div>
          {err && <div className="text-sm text-red-600">{err}</div>}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
