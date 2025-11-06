import React, { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import logo from "../../chaya_logo.png";
import OnboardingModal from "./OnboardingModal";
import WorkLogs from "./WorkLogs";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// --- NEW (Suggestion) ---
// Define our subclub options in one place
const subclubOptions = [
  { key: "photo", label: "Photography" },
  { key: "video", label: "Videography" },
  { key: "smd", label: "social media and design" },
  { key: "edit", label: "Editing" },
  { key: "hr", label: "Humans" },
];
// --- End of New ---

export default function Dashboard({ session }) {
  const user = session.user;
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState("mine");
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Form state
  const [logDate, setLogDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  // --- NEW (Suggestion) ---
  const [subclub, setSubclub] = useState(""); // State for the subclub dropdown
  // --- End of New ---
  const [description, setDescription] = useState("");
  const [submitMsg, setSubmitMsg] = useState({ text: "", error: false });
  const submitBtnRef = useRef(null);

  // Logs
  const [recentLogs, setRecentLogs] = useState(null);
  const [myLogs, setMyLogs] = useState(null);
  const channelRef = useRef(null);

  // --- NEW (Suggestion) ---
  // Create a memoized map for easy lookups (key -> label)
  // This will be passed to WorkLogs to display labels
  const subclubMap = useMemo(() => {
    return subclubOptions.reduce((acc, club) => {
      acc[club.key] = club.label;
      return acc;
    }, {});
  }, []);
  // --- End of New ---

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
      subclub, 
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
      subclub, 
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
          if (newLog.user_id === user.id && profile) {
            setMyLogs((prevLogs) => [
              { ...newLog, me: true, profiles: profile },
              ...(prevLogs || []),
            ]);
          }
          fetchRecentLogs();
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "work_logs" },
        (payload) => {
          const deletedLogId = payload.old.id;
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

  useEffect(() => {
    fetchProfile();
    fetchRecentLogs();
    fetchMyLogs();
    subscribeLogs();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
  };

  const submitWork = async (e) => {
    e.preventDefault();
    setSubmitMsg({ text: "", error: false });
    const btn = submitBtnRef.current;
    if (btn) btn.disabled = true;

    // --- MODIFIED (Suggestion) ---
    const { error } = await supabase.from("work_logs").insert({
      user_id: user.id,
      log_date: logDate,
      subclub: subclub, // Add the new subclub key
      description,
    });
    // --- End of Modify ---

    if (btn) btn.disabled = false;

    if (error) {
      setSubmitMsg({ text: `Error: ${error.message}`, error: true });
    } else {
      setSubmitMsg({ text: "Work logged successfully!", error: false });
      setDescription("");
      setSubclub(""); // Reset subclub dropdown on success
    }
  };

  // --- MODIFIED (Suggestion) ---
  // Updated exportCSV to handle filtering
  const exportCSV = (filter = null) => {
    if (!recentLogs?.length) return alert("No logs to export");

    let logsToExport = recentLogs;
    let filename = "whole_club_logs.csv";

    // If a filter is passed, filter the logs
    if (filter) {
      logsToExport = recentLogs.filter((l) => l.subclub === filter.key);
      // Create a safe filename, e.g., "social_media_and_design_logs.csv"
      filename = `${filter.label
        .toLowerCase()
        .replace(/ /g, "_")}_logs.csv`;
    }

    if (!logsToExport.length)
      return alert(`No logs found for "${filter.label}"`);

    // Add "Subclub" to headers
    const headers = ["Name", "Study Year", "Date", "Subclub", "Description"];

    const rows = logsToExport.map((l) => [
      l.user_name || l.profiles?.full_name || "",
      l.profiles?.study_year || "",
      l.log_date || "",
      subclubMap[l.subclub] || l.subclub || "", // Map key back to label
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
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  // --- End of Modify ---

  const deleteLog = async (log) => {
    setMyLogs((prev) => prev.filter((l) => l.id !== log.id));
    setRecentLogs((prev) => prev.filter((l) => l.id !== log.id));
    await supabase.from("work_logs").delete().eq("id", log.id);
  };

  return (
    <div className="h-full">
      <header className="bg-gradient-to-r from-brand-600 to-accent-600 text-white shadow-lg">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex justify-center sm:justify-start">
              <img
                src={logo}
                alt="Chaya Logo"
                className="h-14 sm:h-16 rounded-md p-2"
              />
            </div>
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
            {/* --- MODIFIED (Suggestion) --- */}
            {/* Using grid for better layout of date and subclub */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              {/* --- NEW (Suggestion) --- */}
              <div>
                <label
                  htmlFor="subclub"
                  className="block text-sm font-semibold text-white font-extrabold tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]
"
                >
                  Subclub
                </label>
                <select
                  id="subclub"
                  name="subclub"
                  required
                  value={subclub}
                  onChange={(e) => setSubclub(e.target.value)}
                  className="mt-1 block w-full rounded-md bg-[#1A2333] border border-[#2B3A55]
text-white placeholder-gray-400 px-3 py-2 shadow-sm 
focus:border-red-500 focus:ring-2 focus:ring-red-500"
                >
                  <option value="" disabled>
                    Select a subclub...
                  </option>
                  {subclubOptions.map((club) => (
                    <option key={club.key} value={club.key}>
                      {club.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* --- End of New --- */}
            </div>
            {/* --- End of Modify --- */}

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
                {/* --- MODIFIED (Suggestion) --- */}
                <WorkLogs
                  title=""
                  logs={myLogs}
                  isMine
                  setConfirmDelete={setConfirmDelete}
                  subclubMap={subclubMap} // Pass the map
                />
                {/* --- End of Modify --- */}
              </div>

              {/* Recent Logs */}
              <div className="w-full">
                {/* --- MODIFIED (Suggestion) --- */}
                <WorkLogs
                  title=""
                  logs={recentLogs}
                  setConfirmDelete={setConfirmDelete}
                  subclubMap={subclubMap} // Pass the map
                />
                {/* --- End of Modify --- */}
              </div>
            </div>
          </div>
        </div>

        {/* --- MODIFIED (Suggestion) --- */}
        {/* New CSV Download Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white drop-shadow-[0_0_6px_#ff1a1a55]">
            Download CSV
          </h3>
          <div className="w-16 h-[2px] bg-red-500 rounded-full mt-1 mb-4 shadow-[0_0_6px_#ff1a1a]"></div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => exportCSV(null)} // Pass null for "Whole Club"
              className="rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm text-white shadow-md hover:from-emerald-500 hover:to-teal-500"
            >
              Whole Club
            </button>
            {/* Create a button for each subclub */}
            {subclubOptions.map((club) => (
              <button
                key={club.key}
                onClick={() => exportCSV(club)} // Pass the club object
                className="rounded-md bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-2 text-sm text-white shadow-md hover:from-gray-500 hover:to-gray-600"
              >
                {club.label}
              </button>
            ))}
          </div>
        </div>
        {/* --- End of Modify --- */}
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