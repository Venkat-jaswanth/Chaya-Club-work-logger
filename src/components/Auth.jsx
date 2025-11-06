import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../../chaya_logo.png";

export default function Auth() {
  const [err, setErr] = useState("");

  const signInWithGoogle = async () => {
    setErr("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) setErr(error.message);
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-6 py-12 overflow-hidden">
      {/* Animated background blobs */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-brand-400 to-accent-500 blur-3xl opacity-30 animate-float"></div>
        <div
          className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-accent-500 to-brand-600 blur-3xl opacity-25 animate-float"
          style={{ animationDelay: "1.5s" }}
        ></div>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/85 dark:bg-white/5 backdrop-blur-xl shadow-glow rounded-2xl p-8 md:p-10 
    ring-1 ring-black/5 dark:ring-white/10 animate-fadeIn
    flex flex-col items-center text-center">
        <img
          src={logo}
          alt="Chaya Logo"
          className="mx-auto mb-6 h-50 w-50 object-contain"
        />
<h1 className="text-3xl md:text-4xl font-extrabold leading-snug pb-1
  bg-clip-text text-transparent bg-gradient-to-br from-red-500 to-white
  drop-shadow-[0_0_12px_#ff1a1a99] glow-title">
  Chaya Work Logger
</h1>

        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          Sign in with your
          <span className="mx-1 font-semibold text-brand-700">
            @iiitkottayam.ac.in
          </span>
          Google account
        </p>

        <button
          onClick={signInWithGoogle}
          className="group relative mt-8 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium text-gray-800 shadow-md ring-1 ring-black/5 transition-all hover:shadow-lg dark:bg-white/90"
        >
          <span className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-brand-500/0 via-brand-500/0 to-accent-500/0 opacity-0 blur transition-all duration-300 group-hover:opacity-40"></span>
          <svg viewBox="0 0 48 48" className="h-5 w-5">
            <path
              fill="#FFC107"
              d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12   s5.373-12,12-12c3.059,0,5.842,1.152,7.961,3.039l5.657-5.657C33.74,6.053,29.13,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20   s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
            />
            <path
              fill="#FF3D00"
              d="M6.305,14.691l6.571,4.819C14.39,16.108,18.824,12,24,12c3.059,0,5.842,1.152,7.961,3.039l5.657-5.657  C33.74,6.053,29.13,4,24,4C16.318,4,9.656,8.337,6.305,14.691z"
            />
            <path
              fill="#4CAF50"
              d="M24,44c5.166,0,9.8-1.977,13.285-5.197l-6.132-5.178C29.058,35.091,26.671,36,24,36  c-5.202,0-9.619-3.317-11.283-7.953l-6.49,5.006C9.551,39.556,16.227,44,24,44z"
            />
            <path
              fill="#1976D2"
              d="M43.611,20.083H42V20H24v8h11.303c-0.793,2.237-2.231,4.166-4.15,5.625  c0.001-0.001,0.002-0.001,0.003-0.002l6.132,5.178C36.961,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
            />
          </svg>
          Continue with Google
        </button>

        {err && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 ring-1 ring-red-100">
            {err}
          </div>
        )}

        <div className="mt-8 text-xs text-gray-500">
          By continuing you agree to our
          <a
            className="mx-1 underline decoration-dotted underline-offset-4 hover:text-brand-700"
            href="#"
          >
            Terms
          </a>
          and
          <a
            className="ml-1 underline decoration-dotted underline-offset-4 hover:text-brand-700"
            href="#"
          >
            Privacy Policy
          </a>
          .
        </div>
      </div>
    </div>
  );
}
