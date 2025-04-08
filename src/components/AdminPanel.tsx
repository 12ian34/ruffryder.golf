import { useState } from 'react';
import { Tab } from '@headlessui/react';
import TournamentManagement from './TournamentManagement';
import StrokeIndexManagement from './StrokeIndexManagement';
import UserManagement from './UserManagement';
import PlayerManagement from './PlayerManagement';
import BlogManagement from './blog/BlogManagement';

export default function AdminPanel() {
  const [selectedTab, setSelectedTab] = useState(0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1">
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <div className="border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
          <Tab.List className="flex space-x-1 sm:space-x-4 whitespace-nowrap">
            <Tab
              className={({ selected }) =>
                `px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              Tournament
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              Stroke Index
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              Players
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              Users
            </Tab>
            <Tab
              className={({ selected }) =>
                `px-2 py-1 text-sm font-medium transition-colors whitespace-nowrap ${
                  selected
                    ? 'text-purple-500 border-b-2 border-purple-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`
              }
            >
              Blog
            </Tab>
          </Tab.List>
        </div>
        <Tab.Panels className="mt-6">
          <Tab.Panel>
            <TournamentManagement />
          </Tab.Panel>
          <Tab.Panel>
            <StrokeIndexManagement />
          </Tab.Panel>
          <Tab.Panel>
            <PlayerManagement />
          </Tab.Panel>
          <Tab.Panel>
            <UserManagement />
          </Tab.Panel>
          <Tab.Panel>
            <BlogManagement />
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
    </div>
  );
}