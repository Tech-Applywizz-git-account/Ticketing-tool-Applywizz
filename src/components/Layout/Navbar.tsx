// import React from 'react';
// import { LogOut, Bell, Settings } from 'lucide-react';
// import { User } from '../../types';
// import { roleLabels } from '../../data/mockData';

// interface NavbarProps {
//   user: User;
//   onLogout: () => void;
// }

// export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
//   // console.log("Navbar user:", user);
//   return (
//     <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
//       <div className="flex items-center justify-between">
//         <div className="flex items-center space-x-4">
//           <div className="flex items-center space-x-2">
//             {/* <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
//               <span className="text-white font-bold text-sm">AW</span>
//             </div>
//             <h1 className="text-xl font-bold text-gray-900">ApplyWizz</h1> */}
//             <img className="text-xl font-bold text-gray-900 h-8 w-36" src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" alt="agg" />
//           </div>
//           <div className="hidden md:block h-6 w-px bg-gray-300">
//           </div>
//           <div className="hidden md:block">
//             <span className="text-sm text-gray-500">Ticketing & Operations</span>
//           </div>
//           <div className="hidden md:block h-6 w-px bg-gray-300">
//           </div>
//           <div className="text-sm  text-gray-500 bg-gray-100 border border-green-200">
//             <div className='text-center'>🚀 ApplyWizz Ticketing Tool – Beta Version Launched!</div>
//             <div className='px-4 text-center'>
//               <p>
//                 You’re now using the beta version of our internal ticketing system. 🎉
//               We’re testing and improving how tickets are created, tracked, and resolved across teams.
//                 </p>
//                 <p>
//               💬 Found a bug or have feedback? Let us know  — your input helps us make it better!
//               — ApplyWizz Ops & Tech Team
//                 </p>
//             </div>
//           </div>
//           <div></div>
//         </div>

//         <div className="flex items-center space-x-4">
//           {/* <button
//             className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
//             title="Notifications"
//             aria-label="Notifications"
//           >
//             <Bell className="h-5 w-5" />
//           </button>

//           <button
//             className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
//             title="Settings"
//             aria-label="Settings"
//           >
//             <Settings className="h-5 w-5" />
//           </button> */}

//           <div className="flex items-center space-x-3">
//             <div className="text-right">
//               <div className="text-sm font-medium text-gray-900">{user.name}{user.role !== "client" && (`  ( ${roleLabels[user.role]} )`)}</div>
//               <div className="text-sm font-medium text-gray-900">{user.email}</div>
//               {/* <div className="text-xs text-gray-500">{}</div> */}
//             </div>
//             <button
//               onClick={onLogout}
//               className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
//               title="Log out"
//               aria-label="Log out"
//             >
//               <div className="flex flex-col items-center">
//                 <LogOut className="h-6 w-6" />
//                 <p className='text-xs'>Log Out</p>
//               </div>
//             </button>
//           </div>
//         </div>
//       </div>
//     </nav>
//   );
// };

import React, { useEffect, useState } from 'react';
import { LogOut, X } from 'lucide-react';
import { User } from '../../types';
import { roleLabels } from '../../data/mockData';
import { ProfileMenu } from "./ProfileMenu";


interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const [isBetaOpen, setIsBetaOpen] = useState(false);
  
  useEffect(() => {
    if (!isBetaOpen) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setIsBetaOpen(false);
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isBetaOpen]);
  return (
    // <nav className="bg-gradient-to-br from-blue-400 to-lime-500 border-b border-gray-200 sticky top-0 z-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
        {/* width constraint + responsive paddings */}
      <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 py-3 md:py-4">
        <div className="flex items-center justify-between gap-3 md:gap-4">
          {/* LEFT: brand + section + beta */}
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0">
              <img
                className="h-7 w-28 sm:h-8 sm:w-32 md:w-36 object-contain"
                src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png"
                alt="ApplyWizz"
              />
            </div>

            {/* Section label (md+) */}
            {/* <div className="hidden md:block">
              <span className="text-sm text-gray-900">Ticketing &amp; Operations</span>
            </div> */}

            {/* Small/Medium: open modal instead of details */}
            <button
              type="button"
              onClick={() => setIsBetaOpen(true)}
              className="lg:hidden text-xs sm:text-sm text-gray-600 bg-transparent border border-green-200 rounded px-2 py-1 hover:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-300"
              aria-haspopup="dialog"
              aria-expanded={isBetaOpen}
              aria-controls="beta-modal"
              title="ApplyWizz Ticketing Tool - Beta Version"
            >
              <span className="font-medium text-gray-900">🚀 ApplyWizz Ticketing Tool<br/> - Beta Version</span><br/>
              <span className="ml-1 text-gray-900">(tap for details)</span>
            </button>
            {isBetaOpen && (
              <div id="beta-modal" role="dialog" aria-modal="true" className="fixed inset-0 z-[70]">
                {/* overlay */}
                <div className="absolute inset-0 bg-black/40" onClick={() => setIsBetaOpen(false)} aria-hidden="true" />
                {/* centered panel */}
                <div className="absolute inset-0 grid place-items-center px-4">
                  <div className="w-full max-w-md rounded-xl bg-white shadow-2xl border border-gray-200 overflow-hidden">
                    <div className="flex items-center justify-center  py-3 bg-gray-100 ">
                      <h2 className="text-base text-center bg-gradient-to-r from-blue-900 via-blue-600 via-blue-600 to-lime-600 inline-block text-transparent bg-clip-text px-8 font-semibold">
                        ApplyWizz Ticketing Tool<br/> - Beta Version</h2>
                      <button
                        onClick={() => setIsBetaOpen(false)}
                        className="p-1 rounded hover:bg-black/20 pl-8 text-black focus:outline-none focus:ring-2 focus:ring-black/60"
                        aria-label="Close"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="p-4 text-sm text-gray-700 space-y-3">
                      <p>
                        You’re now using the beta version of our internal ticketing system. 🎉 We’re testing and
                        improving how tickets are created, tracked, and resolved across teams.
                      </p>
                      <p>
                        💬 Found a bug or have feedback? Let us know - your input helps us make it better!<br/>
                        - ApplyWizz Ops &amp; Tech Team
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {/* Full text only on large+ (unchanged look) */}
            <div className="hidden lg:block text-sm text-gray-600 bg-transparent border border-green-200 rounded px-3 py-2 text-gray-900">
              <div className="text-center">🚀 ApplyWizz Ticketing Tool – Beta Version Launched!</div>
              <div className="px-4 text-center ">
                <p>
                  You’re now using the beta version of our internal ticketing system. 🎉 We’re testing and improving how tickets are created, tracked, and resolved across teams.
                </p>
                <p>
                  💬 Found a bug or have feedback? Let us know - your input helps us make it better!
                  - ApplyWizz Ops &amp; Tech Team
                </p>
              </div>
            </div>
          </div>

          <ProfileMenu user={user} onLogout={onLogout} />
        </div>
      </div>
    </nav>
  );
};
