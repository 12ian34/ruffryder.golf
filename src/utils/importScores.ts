import { collection, doc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const historicalScores = [
  { name: "Dupes", team: "EUROPE", scores: [{ year: 2023, score: 74 }, { year: 2022, score: 75 }, { year: 2021, score: 71 }] },
  { name: "Fathands", team: "EUROPE", scores: [{ year: 2023, score: 84 }] },
  { name: "Paul", team: "EUROPE", scores: [{ year: 2024, score: 89 }, { year: 2023, score: 108 }, { year: 2022, score: 101 }] },
  { name: "George", team: "EUROPE", scores: [{ year: 2024, score: 87 }, { year: 2023, score: 103 }, { year: 2022, score: 85 }, { year: 2021, score: 80 }] },
  { name: "Shivan", team: "EUROPE", scores: [{ year: 2024, score: 100 }, { year: 2023, score: 105 }, { year: 2022, score: 97 }] },
  { name: "Gilo", team: "EUROPE", scores: [{ year: 2024, score: 77 }, { year: 2023, score: 85 }, { year: 2022, score: 75 }, { year: 2021, score: 74 }] },
  { name: "Gooch", team: "EUROPE", scores: [{ year: 2024, score: 83 }, { year: 2023, score: 78 }, { year: 2022, score: 76 }, { year: 2021, score: 76 }] },
  { name: "Sam C", team: "EUROPE", scores: [{ year: 2024, score: 73 }, { year: 2023, score: 76 }] },
  { name: "Ben", team: "EUROPE", scores: [{ year: 2024, score: 85 }, { year: 2023, score: 104 }, { year: 2022, score: 89 }, { year: 2021, score: 82 }] },
  { name: "Clegg", team: "EUROPE", scores: [{ year: 2024, score: 78 }, { year: 2023, score: 70 }, { year: 2022, score: 77 }, { year: 2021, score: 73 }] },
  { name: "Hemmings", team: "EUROPE", scores: [{ year: 2023, score: 91 }, { year: 2022, score: 74 }] },
  { name: "Shabs", team: "EUROPE", scores: [{ year: 2024, score: 110 }, { year: 2023, score: 84 }] },
  { name: "Hologram", team: "EUROPE", scores: [{ year: 2024, score: 95 }, { year: 2022, score: 98 }] },
  { name: "Louis", team: "EUROPE", scores: [{ year: 2022, score: 67 }, { year: 2021, score: 68 }] },
  { name: "Bash", team: "EUROPE", scores: [{ year: 2022, score: 72 }, { year: 2021, score: 83 }] },
  { name: "Bayley", team: "EUROPE", scores: [{ year: 2024, score: 90 }] },
  { name: "Phil", team: "EUROPE", scores: [{ year: 2024, score: 139 }] },
  { name: "Henry W", team: "EUROPE", scores: [{ year: 2024, score: 90 }] },
  { name: "Sarcy", team: "EUROPE", scores: [{ year: 2024, score: 121 }] },
  { name: "Jon Vickers", team: "EUROPE", scores: [{ year: 2024, score: 90 }] },
  { name: "Mansir", team: "USA", scores: [{ year: 2024, score: 128 }, { year: 2023, score: 108 }, { year: 2022, score: 102 }, { year: 2021, score: 117 }] },
  { name: "Pastor", team: "USA", scores: [{ year: 2023, score: 96 }] },
  { name: "Ed M", team: "USA", scores: [{ year: 2024, score: 128 }, { year: 2023, score: 102 }] },
  { name: "Jordi", team: "USA", scores: [{ year: 2024, score: 69 }, { year: 2023, score: 67 }, { year: 2022, score: 68 }, { year: 2021, score: 68 }] },
  { name: "Tom H", team: "USA", scores: [{ year: 2024, score: 65 }, { year: 2023, score: 66 }, { year: 2022, score: 59 }, { year: 2021, score: 70 }] },
  { name: "Alderman VC", team: "USA", scores: [{ year: 2024, score: 84 }, { year: 2023, score: 82 }, { year: 2022, score: 73 }] },
  { name: "Kenny", team: "USA", scores: [{ year: 2024, score: 77 }, { year: 2023, score: 78 }, { year: 2022, score: 81 }, { year: 2021, score: 84 }] },
  { name: "Fat Ronaldo", team: "USA", scores: [{ year: 2024, score: 72 }, { year: 2023, score: 77 }, { year: 2022, score: 83 }, { year: 2021, score: 88 }] },
  { name: "King Rat", team: "USA", scores: [{ year: 2023, score: 115 }, { year: 2022, score: 103 }] },
  { name: "Nelly", team: "USA", scores: [{ year: 2024, score: 82 }, { year: 2023, score: 74 }, { year: 2022, score: 70 }, { year: 2021, score: 85 }] },
  { name: "Tilley", team: "USA", scores: [{ year: 2024, score: 90 }, { year: 2023, score: 86 }, { year: 2022, score: 72 }, { year: 2021, score: 77 }] },
  { name: "Polley", team: "USA", scores: [{ year: 2024, score: 62 }, { year: 2023, score: 78 }, { year: 2022, score: 67 }] },
  { name: "Red Poon", team: "USA", scores: [{ year: 2024, score: 105 }, { year: 2023, score: 105 }, { year: 2022, score: 115 }] },
  { name: "Hamez", team: "USA", scores: [{ year: 2023, score: 87 }, { year: 2022, score: 84 }, { year: 2021, score: 75 }] },
  { name: "Jackhammer", team: "USA", scores: [{ year: 2024, score: 78 }, { year: 2022, score: 86 }] },
  { name: "Reyno", team: "USA", scores: [{ year: 2022, score: 94 }] },
  { name: "Sean", team: "USA", scores: [{ year: 2024, score: 90 }] },
  { name: "Rob Payne", team: "USA", scores: [{ year: 2024, score: 90 }] },
  { name: "Pappy", team: "USA", scores: [{ year: 2024, score: 90 }] },
  { name: "James C", team: "USA", scores: [{ year: 2024, score: 90 }] }
];

export async function importHistoricalScores() {
  const playersRef = collection(db, 'players');
  
  for (const playerData of historicalScores) {
    try {
      const sortedScores = [...playerData.scores].sort((a, b) => b.year - a.year);
      const lastThreeScores = sortedScores.slice(0, 3);
      const averageScore = Math.round(
        lastThreeScores.reduce((sum, s) => sum + s.score, 0) / lastThreeScores.length
      );

      const playerDoc = {
        name: playerData.name,
        team: playerData.team,
        historicalScores: playerData.scores,
        averageScore
      };

      const docId = playerData.name.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(playersRef, docId), playerDoc);
      
      console.log(`Successfully imported data for ${playerData.name}`);
    } catch (error) {
      console.error(`Error importing data for ${playerData.name}:`, error);
    }
  }

  // Set default stroke indices
  try {
    await setDoc(doc(db, 'config', 'strokeIndices'), {
      indices: [3, 7, 13, 15, 11, 5, 17, 1, 9, 6, 2, 14, 18, 8, 10, 16, 4, 12]
    });
    console.log('Successfully set default stroke indices');
  } catch (error) {
    console.error('Error setting default stroke indices:', error);
  }

  // Initialize historicalScores config document
  try {
    await setDoc(doc(db, 'config', 'historicalScores'), {
      lastImportDate: new Date()
    });
    console.log('Successfully set last import date');
  } catch (error) {
    console.error('Error setting last import date:', error);
  }
}