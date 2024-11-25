export interface Tournament {
  id: string;
  name: string;
  year: number;
  isActive: boolean;
  totalScore: {
    USA: number;
    EUROPE: number;
  };
  projectedScore: {
    USA: number;
    EUROPE: number;
  };
}