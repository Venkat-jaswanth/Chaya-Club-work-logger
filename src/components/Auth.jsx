import React, { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function Auth() {
  const [err, setErr] = useState('')

  const signInWithGoogle = async () => {
    setErr('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google'
    })
    if (error) setErr(error.message)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-indigo-200 flex items-center justify-center px-4">
      <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-2xl p-10 w-full max-w-md text-center animate-fadeIn">
        
        {/* Title */}
        <h1 className="text-4xl font-extrabold text-gray-900 drop-shadow-sm">
          Chaya Work Logger
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Sign in using your <br/>
          <span className="font-semibold text-indigo-700">@iiitkottayam.ac.in</span> Google Account
        </p>

        {/* Google Sign-in Button */}
        <button
          onClick={signInWithGoogle}
          className="w-full mt-8 bg-white border border-gray-300 rounded-lg py-3 shadow-sm 
                     flex items-center justify-center gap-3 hover:bg-gray-100 hover:shadow-md 
                     transition-all duration-200 font-medium text-gray-700"
        >
          <svg viewBox="0 0 48 48" className="w-5 h-5">
            <path fill="#4285F4" d="M43.611 20.083H42V20H24v8h11.303c..."></path>
            <path fill="#FBBC05" d="M6.306 14.691L24..."></path>
            <path fill="#34A853" d="M24 44c..."></path>
            <path fill="#EA4335" d="M43.611 20.083H42..."></path>
          </svg>
          Continue with Google
        </button>

        {/* Error message */}
        {err && (
          <div className="mt-4 text-sm text-red-500 bg-red-50 px-3 py-2 rounded-md">
            {err}
          </div>
        )}
      </div>
    </div>
  )
}
