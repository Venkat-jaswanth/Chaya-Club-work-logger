import React from 'react'

export default function WorkLogs({ title, logs }) {
  if (!logs) {
    return <div className="mt-4 text-center text-gray-500">Loading logs...</div>
  }

  if (logs.length === 0) {
    return (
      <div className="mt-4 text-center text-gray-500">
        No work logged yet.
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-4">
      <h3 className="text-lg font-semibold">{title}</h3>
      <ul className="space-y-4">
        {logs.map((log) => (
          <li key={log.id} className="overflow-hidden rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-indigo-600">
                {log.profiles?.full_name
                  ? `${log.profiles.full_name} (Year ${log.profiles.study_year})`
                  : (log.me ? 'You' : 'Member')}
              </p>
              <p className="text-sm text-gray-500">
                {new Date(log.log_date).toLocaleDateString()}
              </p>
            </div>
            <p className="mt-2 text-gray-700 whitespace-pre-wrap">{log.description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
