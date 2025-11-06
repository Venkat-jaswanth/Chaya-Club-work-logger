import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../../chaya_logo.png";
import OnboardingModal from "./OnboardingModal";
import WorkLogs from "./WorkLogs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function Dashboard({ session }) {
  const user = session.user;
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState("mine");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // --- CHANGE (Suggestion 2) ---
  // Removed the auto-dismissing useEffect for `confirmDelete`
  // ---

  // Form state
  const [logDate, setLogDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [description, setDescription] = useState("");
  const [submitMsg, setSubmitMsg] = useState({ text: "", error: false });
  const submitBtnRef = useRef(null);

  // Logs
  const [recentLogs, setRecentLogs] = useState(null);
  const [myLogs, setMyLogs] = useState(null);
  const channelRef = useRef(null);

  const welcomeName = useMemo(() => {
    if (profile?.full_name) return profile.full_name;
    return user.user_metadata?.full_name || "Welcome!";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user.id]);

  const fetchProfile = async () => {
    setLoadingProfile(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    setLoadingProfile(false);
    if (error && error.code !== "PGRST116") {
      console.error("Error fetching profile:", error.message);
      return;
    }
    if (data) {
      setProfile(data);
    }
  };

  const fetchRecentLogs = async () => {
    const { data, error } = await supabase
      .from("work_logs")
      .select(
        `
      id,
      user_id,
      log_date,
      description,
      created_at,
      profiles!work_logs_user_id_fkey (
        full_name,
        study_year
      )
    `
      )
      .order("log_date", { ascending: false })
      .limit(50);

    if (error) console.error("Recent Logs Error:", error);
    setRecentLogs(data || []);
  };

  const fetchMyLogs = async () => {
    const { data, error } = await supabase
      .from("work_logs")
      .select(
        `
      id,
      user_id,
      log_date,
      description,
      created_at,
      profiles!work_logs_user_id_fkey (
        full_name,
        study_year
      )
    `
      )
      .eq("user_id", user.id)
      .order("log_date", { ascending: false });

    if (error) console.error("My Logs Error:", error);
    setMyLogs((data || []).map((d) => ({ ...d, me: true })));
  };

  // --- CHANGE (Suggestion 1) ---
  // Updated subscription to be more performant
  const subscribeLogs = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    const ch = supabase
      .channel("public:work_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "work_logs" },
        (payload) => {
          const newLog = payload.new;

          // 1. Optimistically update "My Logs" if it's the current user
          if (newLog.user_id === user.id && profile) {
            setMyLogs((prevLogs) => [
              { ...newLog, me: true, profiles: profile }, // Add profile data from state
              ...(prevLogs || []),
            ]);
          }

          // 2. Refetch "Club Activity" since we don't have the profile
          // for other users, and we want to ensure correct order.
          fetchRecentLogs();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "work_logs" },
        (payload) => {
          // payload.old contains the deleted record (or at least its ID)
          const deletedLogId = payload.old.id;

          // Optimistically remove from both lists
          if (deletedLogId) {
            setMyLogs((prev) =>
              prev ? prev.filter((l) => l.id !== deletedLogId) : []
            );
            setRecentLogs((prev) =>
              prev ? prev.filter((l) => l.id !== deletedLogId) : []
            );
          }
        }
      )
      .subscribe();
    channelRef.current = ch;
  };
  // --- End of Change ---

  useEffect(() => {
    fetchProfile();
    fetchRecentLogs();
    fetchMyLogs();
    subscribeLogs();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // Added profile to dependency array for the subscription

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const submitWork = async (e) => {
    e.preventDefault();
    setSubmitMsg({ text: "", error: false });
    const btn = submitBtnRef.current;
    if (btn) btn.disabled = true;

    const { error } = await supabase.from("work_logs").insert({
      user_id: user.id,
      log_date: logDate,
      description,
    });

    if (btn) btn.disabled = false;

    if (error) {
      setSubmitMsg({ text: `Error: ${error.message}`, error: true });
    } else {
      setSubmitMsg({ text: "Work logged successfully!", error: false });
      setDescription("");
      // logs update via realtime subscription, no refetch needed here
    }
  };
  const exportCSV = (logs) => {
    if (!logs?.length) return alert("No logs to export");

    const headers = ["Name", "Study Year", "Date", "Work Done"];

    const rows = logs.map((l) => [
      l.user_name || l.profiles?.full_name || "",
      l.profiles?.study_year || "",
      l.log_date || "",
      l.description || "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "chaya_logs.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteLog = async (log) => {
    // Optimistically remove from local lists and delete immediately (no undo)
    // This is good, but the realtime subscription will also catch it.
    // To prevent a flicker, we'll leave this local removal.
    setMyLogs((prev) => prev.filter((l) => l.id !== log.id));
    setRecentLogs((prev) => prev.filter((l) => l.id !== log.id));
    await supabase.from("work_logs").delete().eq("id", log.id);
  };

  return (
    <div className="h-full">
      <header className="bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg">
        {/* --- CHANGE (Layout) --- */}
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Logo row (centered on mobile) */}
            <div className="flex justify-center sm:justify-start">
              <img
                src={logo}
                alt="Chaya Logo"
                className="h-14 sm:h-16 rounded-md p-2"
              />
            </div>

            {/* Name + Logout on same row */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold leading-6">
                  Welcome{profile?.full_name ? `, ${profile.full_name}` : "!"}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-white/80">
                  {user.email}
                </p>
              </div>
              <button
                onClick={signOut}
                className="rounded-md bg-white/15 px-3 py-2 text-sm font-medium text-white shadow-md ring-1 ring-white/20 transition hover:bg-white/25"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- CHANGE (Layout) --- */}
      <main className="mx-auto max-w-6xl px-2 py-8 sm:px-6 lg:px-8">
        {/* Work Log Form */}
        <div
          className="rounded-2xl bg-[#0D1321]/90 backdrop-blur-xl p-4 sm:p-6 
    shadow-[0_0_20px_#ff1a1a33] border border-red-500/20 text-white"
        >
          <h2
            className="text-xl font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
          >
            Log Your Work
          </h2>
          <div className="w-20 h-[3px] bg-red-500 rounded-full mt-1 mb-4 shadow-[0_0_8px_#ff1a1a]"></div>
          {profile && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  className="block text-sm font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  disabled
                  value={profile.full_name}
                  className="mt-1 block w-full rounded-md bg-[#1A2333] border border-[#2B3A55]
text-white placeholder-gray-400 px-3 py-2 shadow-sm 
focus:border-red-500 focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
                >
                  Study Year
                </label>
                <input
                  type="text"
                  disabled
                  value={`Year ${profile.study_year}`}
                  className="mt-1 block w-full rounded-md bg-[#1A2333] border border-[#2B3A55]
text-white placeholder-gray-400 px-3 py-2 shadow-sm 
focus:border-red-500 focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
          )}
          <form onSubmit={submitWork} className="mt-6 space-y-4">
            <div>
              <label
                className="block text-sm font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
              >
                Date of Work
              </label>
              <div className="relative">
                <DatePicker
                  selected={new Date(logDate)}
                  onChange={(date) =>
                    setLogDate(date.toISOString().slice(0, 10))
                  }
                  dateFormat="yyyy-MM-dd"
                  maxDate={new Date()}
                  showPopperArrow={false}
                  wrapperClassName="cyber-calendar"
                  popperClassName="cyber-popper"
                  className="mt-1 block w-full rounded-md bg-[#1A2333] border border-[#2B3A55]
                    text-white placeholder-gray-400 px-3 py-2 shadow-sm 
                    focus:border-red-500 focus:ring-2 focus:ring-red-500"
                  calendarClassName="cyber-calendar"
                />
              </div>
            </div>

            <div>
              <label
                className="block text-sm font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
              >
                Work Done
              </label>
              <textarea
                rows="4"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What did you work on?"
                className="mt-1 block w-full rounded-md bg-[#1A2333] border border-[#2B3A55]
text-white placeholder-gray-400 px-3 py-2 shadow-sm 
focus:border-red-500 focus:ring-2 focus:ring-red-500"
              />
            </div>

            {submitMsg.text && (
              <div
                className={`text-sm ${
                  submitMsg.error ? "text-red-600" : "text-green-600"
                }`}
              >
                {submitMsg.text}
              </div>
            )}

            <div className="flex justify-end">
              <button
                ref={submitBtnRef}
                type="submit"
                className="relative inline-flex items-center justify-center rounded-lg w-full sm:w-auto
                bg-gradient-to-r from-red-600 to-red-400 px-6 py-2 text-sm font-bold text-white 
                shadow-[0_0_10px_#ff1a1a55] transition-all duration-300
                hover:shadow-[0_0_15px_#ff1a1acc] hover:-translate-y-[2px]
                active:translate-y-[1px] active:shadow-[0_0_6px_#ff1a1a99]
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 btn-pulse"
              >
                Submit Work
              </button>
            </div>
          </form>
        </div>

        {/* Logs Section with Tabs */}
        <div className="mt-12">
          {/* --- CHANGE (Suggestion 3) --- */}
          <div className="flex gap-3 border-b border-red-500/30 pb-2 mb-4">
            <button
              onClick={() => setActiveTab("mine")}
              role="tab"
              aria-selected={activeTab === "mine"}
              className={`px-4 py-2 font-semibold transition 
      ${
        activeTab === "mine"
          ? "text-white border-b-2 border-red-500 drop-shadow-[0_0_6px_#ff1a1a55]"
          : "text-gray-400 hover:text-gray-200"
      }`}
            >
              Your Work
            </button>

            <button
              onClick={() => setActiveTab("recent")}
              role="tab"
              aria-selected={activeTab === "recent"}
              className={`px-4 py-2 font-semibold transition
      ${
        activeTab === "recent"
          ? "text-white border-b-2 border-red-500 drop-shadow-[0_0_6px_#ff1a1a55]"
          : "text-gray-400 hover:text-gray-200"
      }`}
            >
              Club Activity
            </button>
          </div>
          {/* --- End of Change --- */}

          <div className="relative overflow-hidden">
            <div
              className="flex transition-transform duration-500"
              style={{
                width: "200%",
                transform:
                  activeTab === "mine" ? "translateX(0)" : "translateX(-50%)",
              }}
            >
              {/* My Logs */}
              <div className="w-full">
                <WorkLogs
                  title=""
                  logs={myLogs}
                  isMine
                  setConfirmDelete={setConfirmDelete}
                />
              </div>

              {/* Recent Logs */}
              <div className="w-full">
                <WorkLogs
                  title=""
                  logs={recentLogs}
                  setConfirmDelete={setConfirmDelete}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => exportCSV(recentLogs)}
            className="rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
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
            setProfile(p);
          }}
        />
      )}
      {confirmDelete && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
          <div
            className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
      w-[90%] max-w-sm bg-[#0D1321] border border-red-500/40 
      rounded-2xl p-6 shadow-[0_0_20px_#ff1a1a55] space-y-4 text-white"
          >
            <h2 className="text-lg font-bold drop-shadow-[0_0_6px_#ff1a1a88]">
              Delete Work Log?
            </h2>
            <p className="text-sm text-gray-300">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3">
              <button
                className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600 text-sm"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>

              <button
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-sm font-bold"
                onClick={() => {
                  deleteLog(confirmDelete);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
