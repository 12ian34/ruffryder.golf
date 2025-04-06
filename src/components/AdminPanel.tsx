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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex space-x-1 rounded-xl bg-purple-900/20 p-1">
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-purple-700 text-white shadow dark:bg-purple-800 dark:text-white dark:ring-2 dark:ring-purple-400'
                  : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-100 dark:hover:bg-gray-800/[0.5] dark:hover:text-white'
              }`
            }
          >
            Tournament
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-purple-700 text-white shadow dark:bg-purple-800 dark:text-white dark:ring-2 dark:ring-purple-400'
                  : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-100 dark:hover:bg-gray-800/[0.5] dark:hover:text-white'
              }`
            }
          >
            Stroke Index
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-purple-700 text-white shadow dark:bg-purple-800 dark:text-white dark:ring-2 dark:ring-purple-400'
                  : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-100 dark:hover:bg-gray-800/[0.5] dark:hover:text-white'
              }`
            }
          >
            Players
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-purple-700 text-white shadow dark:bg-purple-800 dark:text-white dark:ring-2 dark:ring-purple-400'
                  : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-100 dark:hover:bg-gray-800/[0.5] dark:hover:text-white'
              }`
            }
          >
            Users
          </Tab>
          <Tab
            className={({ selected }) =>
              `w-full rounded-lg py-2.5 text-sm font-medium leading-5 ${
                selected
                  ? 'bg-purple-700 text-white shadow dark:bg-purple-800 dark:text-white dark:ring-2 dark:ring-purple-400'
                  : 'text-purple-700 hover:bg-purple-200 hover:text-purple-900 dark:text-purple-100 dark:hover:bg-gray-800/[0.5] dark:hover:text-white'
              }`
            }
          >
            Blog
          </Tab>
        </Tab.List>
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