import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../../chaya_logo.png"; // ✅ Nice branding

export default function OnboardingModal({ user, onDone }) {
  const [studyYear, setStudyYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const saveProfile = async (e) => {
    e.preventDefault();
    setErr("");
    setSaving(true);

    const fullName = user.user_metadata?.full_name;
    const email = user.email;

    const { data, error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        full_name: fullName,
        email,
        study_year: parseInt(studyYear, 10),
      })
      .select()
      .single();

    setSaving(false);

    if (error) return setErr(error.message);
    onDone(data);
  };

  return (
    <>
      {/* ✅ Dark blur background */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />

      {/* ✅ Cyber Modal */}
      <div className="fixed z-50 top-1/2 left-1/2 
        -translate-x-1/2 -translate-y-1/2 
        w-full max-w-md rounded-2xl 
        bg-[#0D1321]/95 border border-red-500/30 
        shadow-[0_0_25px_#ff1a1a55] p-6">

        {/* ✅ Logo */}
        <div className="flex justify-center mb-4">
          <img src={logo} alt="Chaya" className="h-14 drop-shadow-[0_0_6px_#ff1a1a88]" />
        </div>

        {/* ✅ Title */}
        <h3 className="text-2xl font-extrabold text-white text-center 
          drop-shadow-[0_0_8px_#ff1a1a88] tracking-wide">
          Welcome, {user.user_metadata?.full_name?.split(" ")[0] || "Friend"}!
        </h3>

        {/* ✅ Subtitle */}
        <p className="mt-2 text-sm text-gray-300 text-center">
          Choose your study year to continue<br/>
          <span className="opacity-70 text-xs">You’ll do this only once ✅</span>
        </p>

        {/* ✅ Form */}
        <form className="mt-6 space-y-4" onSubmit={saveProfile}>
          <div>
            <label className="block text-sm font-semibold text-gray-200 
              mb-1 tracking-wide">
              Study Year
            </label>

            <select
              required
              value={studyYear}
              onChange={(e) => setStudyYear(e.target.value)}
              className="block w-full rounded-lg bg-[#1A2333] border border-[#2B3A55]
              text-white px-3 py-2 shadow-sm 
              focus:border-red-500 focus:ring-2 focus:ring-red-500"
            >
              <option value="" disabled>Select your year</option>
              <option value="1">1</option><option value="2">2</option>
              <option value="3">3</option><option value="4">4</option>
              <option value="5">5 (M.Tech / Other)</option>
            </select>
          </div>

          {/* ✅ Error Message */}
          {err && (
            <div className="text-sm text-red-500 
              bg-red-500/10 border border-red-500/50 rounded-md p-2 text-center">
              {err}
            </div>
          )}

          {/* ✅ Save Button */}
          <div className="mt-6 flex justify-center">
            <button
              type="submit"
              disabled={saving}
              className="relative inline-flex items-center justify-center rounded-lg 
              bg-gradient-to-r from-red-600 to-red-400 px-6 py-2 text-sm font-bold text-white 
              shadow-[0_0_10px_#ff1a1a55] transition-all duration-300
              hover:shadow-[0_0_15px_#ff1a1acc] hover:-translate-y-[2px]
              active:translate-y-[1px] active:shadow-[0_0_6px_#ff1a1a99]
              disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {saving ? "Saving..." : "Save & Continue"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
