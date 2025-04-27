import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OnlinePlayer = {
  id: string;
  name: string;
  email?: string; // Keep this as optional in your type
  avatar_url?: string;
};

export function useOnlinePlayers() {
  const [players, setPlayers] = useState<OnlinePlayer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchOnlinePlayers = async () => {
      try {
        setIsLoading(true);
        
        // Remove email from the query since it doesn't exist in your table
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url');
          
        if (error) throw error;
        
        // Map without the email field
        const onlinePlayers = data.map(player => ({
          id: player.id,
          name: player.username || 'Anonymous Player',
          // email field is omitted since it doesn't exist
          avatar_url: player.avatar_url
        }));
        
        setPlayers(onlinePlayers);
      } catch (err) {
        console.error('Error fetching online players:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch online players'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnlinePlayers();
    
    // Set up a subscription for real-time updates
    const subscription = supabase
      .channel('public:profiles')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'profiles'
      }, fetchOnlinePlayers)
      .subscribe();
      
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { players, isLoading, error };
}