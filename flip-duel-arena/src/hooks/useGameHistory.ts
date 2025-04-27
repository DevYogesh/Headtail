
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useGameHistory = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["game_history", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("game_history")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      console.log("Game history data:", data); // Add logging to help with debugging
      return data ?? [];
    },
    enabled: !!user,
  });

  return query;
};
