import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { showSuccessToast, showErrorToast } from '../utils/toast';

interface StrokeIndices {
  indices: number[];
}

export default function StrokeIndexManagement() {
  const [indices, setIndices] = useState<number[]>(Array(18).fill(0));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrokeIndices = async () => {
      try {
        const docRef = doc(db, 'config', 'strokeIndices');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data() as StrokeIndices;
          setIndices(data.indices);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStrokeIndices();
  }, []);

  const handleIndexChange = (holeNumber: number, value: string) => {
    const newValue = parseInt(value) || 0;
    setIndices(prev => {
      const newIndices = [...prev];
      newIndices[holeNumber - 1] = newValue;
      return newIndices;
    });
  };

  const validateIndices = (): boolean => {
    // Check if all numbers 1-18 are used exactly once
    const sorted = [...indices].sort((a, b) => a - b);
    return sorted.every((value, index) => value === index + 1);
  };

  const handleSave = async () => {
    if (!validateIndices()) {
      setError('Each number from 1 to 18 must be used exactly once');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Save stroke indices to config
      await setDoc(doc(db, 'config', 'strokeIndices'), {
        indices
      });

      setSuccessMessage('Stroke indices updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      showSuccessToast('Stroke indices updated');
    } catch (err: any) {
      setError(err.message);
      showErrorToast('Failed to update stroke indices');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold dark:text-white">Stroke Index Configuration</h2>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Front Nine */}
        <div>
          <h3 className="text-lg font-medium mb-4 dark:text-white">Front Nine</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(hole => (
              <div key={hole} className="flex items-center space-x-4">
                <span className="w-16 text-gray-600 dark:text-gray-400">
                  Hole {hole}
                </span>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={indices[hole - 1] || ''}
                  onChange={(e) => handleIndexChange(hole, e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Back Nine */}
        <div>
          <h3 className="text-lg font-medium mb-4 dark:text-white">Back Nine</h3>
          <div className="space-y-4">
            {[10, 11, 12, 13, 14, 15, 16, 17, 18].map(hole => (
              <div key={hole} className="flex items-center space-x-4">
                <span className="w-16 text-gray-600 dark:text-gray-400">
                  Hole {hole}
                </span>
                <input
                  type="number"
                  min="1"
                  max="18"
                  value={indices[hole - 1] || ''}
                  onChange={(e) => handleIndexChange(hole, e.target.value)}
                  className="w-20 px-3 py-2 rounded-lg border dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        Note: Each number from 1 to 18 must be used exactly once. Lower numbers indicate higher difficulty holes.
      </div>
    </div>
  );
}