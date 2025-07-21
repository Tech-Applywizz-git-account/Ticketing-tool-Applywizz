import React from 'react';
import { LogOut, Bell, Settings } from 'lucide-react';
import { User } from '../../types';
import { roleLabels } from '../../data/mockData';

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  // console.log("Navbar user:", user);
  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {/* <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">AW</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">ApplyWizz</h1> */}
            <img className="text-xl font-bold text-gray-900 h-8 w-36" src="https://storage.googleapis.com/solwizz/website_content/Black%20Version.png" alt="agg" />
          </div>
          <div className="hidden md:block h-6 w-px bg-gray-300">
          </div>
          <div className="hidden md:block">
            <span className="text-sm text-gray-500">Ticketing & Operations</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-gray-300">
          </div>
          <div className="text-sm  text-gray-500 bg-gray-100 border border-green-200">
            <div className='text-center'>🚀 ApplyWizz Ticketing Tool – Beta Version Launched!</div>
            <div className='px-4 text-center'>
              <p>
                You’re now using the beta version of our internal ticketing system. 🎉
              We’re testing and improving how tickets are created, tracked, and resolved across teams.
                </p>
                <p>
              💬 Found a bug or have feedback? Let us know  — your input helps us make it better!
              — ApplyWizz Ops & Tech Team
                </p>
            </div>
          </div>
          <div></div>
        </div>

        <div className="flex items-center space-x-4">
          {/* <button
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Notifications"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
          </button>

          <button
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </button> */}

          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{user.name}{user.role !== "client" && (`  ( ${roleLabels[user.role]} )`)}</div>
              <div className="text-sm font-medium text-gray-900">{user.email}</div>
              {/* <div className="text-xs text-gray-500">{}</div> */}
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <div className="flex flex-col items-center">
                <LogOut className="h-6 w-6" />
                <p className='text-xs'>Log Out</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
