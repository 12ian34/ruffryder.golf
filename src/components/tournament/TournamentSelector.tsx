import { useState } from 'react';
import type { Tournament } from '../../types/tournament';

interface TournamentSelectorProps {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  onSelect: (tournament: Tournament | null) => void;
}

export default function TournamentSelector({ tournaments, selectedTournament, onSelect }: TournamentSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Select Existing Tournament
      </label>
      <select
        value={selectedTournament?.id || ''}
        onChange={(e) => {
          const tournament = tournaments.find(t => t.id === e.target.value);
          onSelect(tournament || null);
        }}
        className="w-full px-4 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      >
        <option value="">Select Tournament</option>
        {tournaments.map(tournament => (
          <option key={tournament.id} value={tournament.id}>
            {tournament.name} ({tournament.year}) {tournament.isActive ? '(Active)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}