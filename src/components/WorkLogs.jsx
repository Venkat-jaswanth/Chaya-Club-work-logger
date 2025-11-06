import React from "react";
import { HiOutlineTrash } from "react-icons/hi";

// --- MODIFIED (Suggestion) ---
// Accept subclubMap as a prop
export default function WorkLogs({
  title,
  logs,
  isMine,
  setConfirmDelete,
  subclubMap = {}, // Default to empty object
}) {
  // --- End of Modify ---

  if (!logs)
    return (
      <p className="text-center text-gray-400 mt-6 animate-pulse">
        Loading logs...
      </p>
    );
  if (logs.length === 0)
    return (
      <p className="text-center text-gray-400 mt-6">No work logged yet.</p>
    );

  return (
    <div
      className="mt-6 overflow-x-auto rounded-2xl bg-[#0D1321]/80 backdrop-blur-xl
      shadow-[0_0_10px_#ff1a1a33] border border-red-500/20 animate-[fadeIn_0.4s_ease-out]"
    >
      {title && (
        <h3 className="px-5 pt-5 text-xl font-bold text-white tracking-wide drop-shadow-[0_0_6px_#ff1a1a55]">
          {title}
        </h3>
      )}
      <div className="w-20 h-[3px] bg-red-500 rounded-full mx-5 mt-1 mb-4 shadow-[0_0_6px_#ff1a1a]"></div>

      {/* Mobile cards */}
      <div className="sm:hidden px-4 pb-4 space-y-3">
        {logs.map((log) => (
          <div
            key={log.id}
            className="rounded-xl border border-red-500/20 bg-[#0D1321]/60 p-4 shadow-[0_0_8px_#ff1a1a22]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">
                  {log.me ? (
                    <span className="text-red-400 font-bold drop-shadow-[0_0_6px_#ff1a1a99]">
                      You
                    </span>
                  ) : (
                    log.user_name || log.profiles?.full_name || "Member"
                  )}
                </div>
                <div className="mt-2 h-px w-16 bg-red-500/60 shadow-[0_0_6px_#ff1a1a55]"></div>
                
                {/* --- NEW (Suggestion) --- */}
                {/* Added Subclub display for mobile */}
                <div className="mt-1.5 text-xs font-medium text-red-300/90">
                  {subclubMap[log.subclub] || log.subclub || "N/A"}
                </div>
                {/* --- End of New --- */}

                <div className="mt-0.5 text-xs text-gray-300">
                  Year {log.profiles?.study_year || "-"}
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(log.log_date).toLocaleDateString()}
                </div>
                <div className="mt-2 h-px w-24 bg-red-500/40 shadow-[0_0_4px_#ff1a1a33]"></div>
              </div>
              {log.me && setConfirmDelete && (
                <button
                  onClick={() => setConfirmDelete(log)}
                  className="shrink-0 rounded-md px-2 py-1 text-xs text-red-300 hover:text-white hover:bg-red-500/20 active:scale-95"
                  title="Delete this entry"
                  aria-label="Delete log"
                >
                  <HiOutlineTrash size={16} />
                </button>
              )}
            </div>
            <div className="mt-3 text-sm text-gray-200 whitespace-pre-wrap break-words">
              {log.description}
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <table className="hidden sm:table min-w-full text-left table-fixed">
        <thead className="bg-[#1A2333]/90 uppercase text-[11px] text-gray-300 tracking-wider">
          {/* --- MODIFIED (Suggestion) --- */}
          {/* Added Subclub <th> and adjusted widths */}
          <tr>
            <th className="px-4 py-3 w-[25%]">Name</th>
            <th className="px-4 py-3 w-[10%] text-center">Year</th>
            <th className="px-4 py-3 w-[20%]">Subclub</th>
            <th className="px-4 py-3 w-[15%] whitespace-nowrap">Date</th>
            <th className="px-4 py-3 w-[30%]">Work Done</th>
          </tr>
          {/* --- End of Modify --- */}
        </thead>

        <tbody className="text-sm text-gray-200 align-top">
          {logs.map((log) => (
            <tr
              key={log.id}
              className="border-b border-[#2B3A55] hover:bg-[#1A2333]/60 transition group"
            >
              {/* Name */}
              <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-100">
                {log.me ? (
                  <span className="text-red-400 font-bold drop-shadow-[0_0_6px_#ff1a1a99]">
                    You
                  </span>
                ) : (
                  log.user_name || log.profiles?.full_name || "Member"
                )}
              </td>

              {/* Year */}
              <td className="px-4 py-3 text-center text-gray-300">
                {log.profiles?.study_year || "-"}
              </td>

              {/* --- NEW (Suggestion) --- */}
              {/* Added Subclub <td> */}
              <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                {subclubMap[log.subclub] || log.subclub || "N/A"}
              </td>
              {/* --- End of New --- */}

              {/* Date */}
              <td className="px-4 py-3 whitespace-nowrap text-gray-300">
                {new Date(log.log_date).toLocaleDateString()}
              </td>

              {/* Description + inline delete (right) */}
              <td className="px-4 py-3 text-gray-200 relative align-top w-auto">
                <span className="block pr-8 whitespace-pre-wrap break-all">
                  {log.description}
                </span>
                {log.me && setConfirmDelete && (
                  <button
                    onClick={() => setConfirmDelete(log)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-40 
                group-hover:opacity-100 transition-opacity
                text-red-400 hover:text-red-300 active:scale-90"
                    aria-label="Delete log"
                    title="Delete this entry"
                  >
                    <HiOutlineTrash size={18} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}