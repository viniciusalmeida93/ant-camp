import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChampionshipContextType {
  selectedChampionship: any | null;
  setSelectedChampionship: (championship: any | null) => void;
  championships: any[];
  loadChampionships: () => Promise<void>;
  loading: boolean;
}

const ChampionshipContext = createContext<ChampionshipContextType | undefined>(undefined);

export function ChampionshipProvider({ children }: { children: ReactNode }) {
  const [selectedChampionship, setSelectedChampionshipState] = useState<any | null>(null);
  const [championships, setChampionships] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('selectedChampionship');
    if (stored) {
      try {
        setSelectedChampionshipState(JSON.parse(stored));
      } catch (e) {
        console.error('Error loading championship from localStorage', e);
      }
    }
    loadChampionships();
  }, []);

  const loadChampionships = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const { data: champs, error } = await supabase
        .from("championships")
        .select("*")
        .eq("organizer_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setChampionships(champs || []);

      // If no championship is selected but we have championships, select the first one
      const stored = localStorage.getItem('selectedChampionship');
      if (!stored && champs && champs.length > 0) {
        setSelectedChampionshipState(champs[0]);
        localStorage.setItem('selectedChampionship', JSON.stringify(champs[0]));
      }
    } catch (error: any) {
      console.error("Error loading championships:", error);
    } finally {
      setLoading(false);
    }
  };

  const setSelectedChampionship = (championship: any | null) => {
    setSelectedChampionshipState(championship);
    if (championship) {
      localStorage.setItem('selectedChampionship', JSON.stringify(championship));
    } else {
      localStorage.removeItem('selectedChampionship');
    }
  };

  return (
    <ChampionshipContext.Provider
      value={{
        selectedChampionship,
        setSelectedChampionship,
        championships,
        loadChampionships,
        loading,
      }}
    >
      {children}
    </ChampionshipContext.Provider>
  );
}

export function useChampionship() {
  const context = useContext(ChampionshipContext);
  if (context === undefined) {
    throw new Error('useChampionship must be used within a ChampionshipProvider');
  }
  return context;
}

