
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

type GameState = "waiting" | "betting" | "flipping" | "complete";
type Bet = "heads" | "tails";

interface Player {
  id: string;
  name: string;
  bet?: Bet;
  amount?: number;
}

interface GameData {
  id: string;
  state: GameState;
  result?: Bet;
  timestamp: number;
}



export const useGameSocket = () => {
  const [connected, setConnected] = useState(false);
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameChannel, setGameChannel] = useState<RealtimeChannel | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const [isJoining, setIsJoining] = useState(false);
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);

  // Initialize realtime connection
  useEffect(() => {
    if (!user) return;

    setConnected(true);

    // Clean up function
    return () => {
      if (gameChannel) {
        supabase.removeChannel(gameChannel);
      }
    };
  }, [user]);

  // Subscribe to game updates when game ID changes
  useEffect(() => {
    if (!currentGameId || !connected) return;

    console.log("Subscribing to game:", currentGameId);
    
    // Unsubscribe from previous channel if exists
    if (gameChannel) {
      supabase.removeChannel(gameChannel);
    }

    // Subscribe to game updates
    const channel = supabase
      .channel(`game:${currentGameId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'games',
        filter: `id=eq.${currentGameId}`,
      }, (payload) => {
        console.log('Game updated:', payload);
        const game = payload.new as any;
        if (game) {
          setGameData({
            id: game.id,
            state: game.state as GameState,
            result: game.result as Bet | undefined,
            timestamp: new Date(game.timestamp).getTime(),
          });
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'game_players',
        filter: `game_id=eq.${currentGameId}`,
      }, async (payload) => {
        console.log('Players updated:', payload);
        
        // Fetch all players for this game
        const { data: gamePlayers } = await supabase
          .from('game_players')
          .select('*')
          .eq('game_id', currentGameId);
          
        if (gamePlayers) {
          const playersList = gamePlayers.map(p => ({
            id: p.user_id,
            name: p.name,
            bet: p.bet as Bet | undefined,
            amount: p.amount,
          }));
          setPlayers(playersList);
          
          // Force state update to betting if we have 2 players and state is still waiting
          if (playersList.length >= 2 && gameData?.state === "waiting") {
            await supabase
              .from('games')
              .update({ state: 'betting' })
              .eq('id', currentGameId);
          }
        }
      })
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
        // Fetch initial game data when subscription is ready
        if (status === 'SUBSCRIBED') {
          fetchInitialGameData(currentGameId);
        }
      });

    setGameChannel(channel);

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentGameId, connected]);
  
  // Fetch initial game and player data
  const fetchInitialGameData = async (gameId: string) => {
    try {
      // Fetch game data
      const { data: gameData, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();
      
      if (gameError) throw gameError;
      
      if (gameData) {
        setGameData({
          id: gameData.id,
          state: gameData.state as GameState,
          result: gameData.result as Bet | undefined,
          timestamp: new Date(gameData.timestamp).getTime(),
        });
      }
      
      // Fetch player data
      const { data: gamePlayers, error: playersError } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);
        
      if (playersError) throw playersError;
      
      if (gamePlayers) {
        const playersList = gamePlayers.map(p => ({
          id: p.user_id,
          name: p.name,
          bet: p.bet as Bet | undefined,
          amount: p.amount,
        }));
        setPlayers(playersList);
      }
    } catch (error) {
      console.error("Error fetching initial game data:", error);
    }
  };

  // Join a game or create a new one
  const joinGame = useCallback(async () => {
    if (!connected || !user) {
      toast({
        title: "Not connected",
        description: "Could not connect to game server",
        variant: "destructive",
      });
      return;
    }
    
    setIsJoining(true);
    
    try {
      // Check if user profile exists, create if it doesn't
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (!profileData) {
        // Profile doesn't exist, create one
        const { error: createProfileError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || 'Player',
            balance: 1000,
            wins: 0,
            losses: 0
          });
        
        if (createProfileError) {
          console.error('Error creating profile:', createProfileError);
          throw new Error('Could not create profile');
        }
      }
      
      // Try to find a game in "waiting" state
      const { data: existingGames } = await supabase
        .from('games')
        .select('id, state')
        .eq('state', 'waiting')
        .limit(1);
      
      let gameId;
      
      if (existingGames && existingGames.length > 0) {
        // Join existing game
        gameId = existingGames[0].id;
        console.log('Joining existing game:', gameId);
      } else {
        // Create a new game
        const { data: newGame, error } = await supabase
          .from('games')
          .insert({
            state: 'waiting',
          })
          .select()
          .single();
        
        if (error) {
          throw error;
        }
        
        gameId = newGame.id;
        console.log('Created new game:', gameId);
      }
      
      // Check if player is already in this game to prevent duplicate entries
      const { data: existingPlayer } = await supabase
        .from('game_players')
        .select('id')
        .match({ game_id: gameId, user_id: user.id })
        .maybeSingle();
        
      if (!existingPlayer) {
        // Add player to the game only if they're not already in it
        const { error: playerError } = await supabase
          .from('game_players')
          .insert({
            game_id: gameId,
            user_id: user.id,
            name: user.email?.split('@')[0] || 'Player',
          });
        
        if (playerError) {
          throw playerError;
        }
      }
      
      // Set current game ID to trigger subscription
      setCurrentGameId(gameId);
      
      // Check the number of players and update game state if needed
      const { data: players } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId);
      
      if (players && players.length >= 2) {
        // Update game state to "betting" if there are 2 or more players
        await supabase
          .from('games')
          .update({ state: 'betting' })
          .eq('id', gameId);
      }
      
      setIsJoining(false);
    } catch (error) {
      console.error('Error joining game:', error);
      toast({
        title: "Error",
        description: "Failed to join game",
        variant: "destructive",
      });
      setIsJoining(false);
    }
  }, [connected, user, toast]);

  // Place a bet
  const placeBet = useCallback(async (bet: Bet, amount: number) => {
    if (!connected || !user || !currentGameId) {
      toast({
        title: "Not connected",
        description: "Could not connect to game server",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Update player bet
      await supabase
        .from('game_players')
        .update({
          bet,
          amount,
        })
        .eq('game_id', currentGameId)
        .eq('user_id', user.id);
      
      console.log(`Bet placed: ${bet}, amount: ${amount}`);
      
      // Check if all players have placed their bets
      const { data: gamePlayers } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', currentGameId);
      
      if (gamePlayers && gamePlayers.every(p => p.bet)) {
        console.log("All players have placed bets, starting coin flip");
        // All players have bet, start the coin flip
        await supabase
          .from('games')
          .update({ state: 'flipping' })
          .eq('id', currentGameId);
        
        // After 3 seconds, determine the result and complete the game
        setTimeout(async () => {
          const result = Math.random() > 0.5 ? 'heads' : 'tails';
          console.log(`Game result: ${result}`);
          
          await supabase
            .from('games')
            .update({
              state: 'complete',
              result,
            })
            .eq('id', currentGameId);
          
          // Update player profiles (balance, wins, losses)
          for (const player of gamePlayers) {
            const won = player.bet === result;
            
            // Save game history record for each player
            await supabase.from('game_history').insert({
              user_id: player.user_id,
              game_type: 'coinflip',
              result: won ? 'win' : 'loss',
              amount: player.amount || 0
            });
            
            if (won) {
              // Update winner stats
              const { data: winsData } = await supabase.rpc('increment', { x: 1 });
              const { data: newBalance } = await supabase.rpc('increment', { x: player.amount * 2 });
              
              if (newBalance !== null) {
                // Now update the profile with the new balance
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    balance: newBalance,
                    wins: winsData
                  })
                  .eq('id', player.user_id);
                
                if (error) console.error('Error updating winner:', error);
              }
            } else {
              // Update loser stats
              const { data: lossesData } = await supabase.rpc('increment', { x: 1 });
              const { data: newBalance } = await supabase.rpc('decrement', { x: player.amount });
              
              if (newBalance !== null) {
                // Now update the profile with the new balance
                const { error } = await supabase
                  .from('profiles')
                  .update({
                    balance: newBalance,
                    losses: lossesData
                  })
                  .eq('id', player.user_id);
                
                if (error) console.error('Error updating loser:', error);
              }
            }
          }
        }, 3000);
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      toast({
        title: "Error",
        description: "Failed to place bet",
        variant: "destructive",
      });
    }
  }, [connected, user, currentGameId, toast]);

  // Leave the current game
  const leaveGame = useCallback(async () => {
    if (!connected || !user || !currentGameId) {
      console.log("Cannot leave game: not connected or no current game");
      return;
    }
    
    try {
      // Remove player from the game
      await supabase
        .from('game_players')
        .delete()
        .eq('game_id', currentGameId)
        .eq('user_id', user.id);
      
      console.log(`Player ${user.id} left game ${currentGameId}`);
      
      // Check if there are any players left
      const { data: remainingPlayers } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', currentGameId);
      
      // If no players left, clean up the game
      if (!remainingPlayers || remainingPlayers.length === 0) {
        await supabase
          .from('games')
          .delete()
          .eq('id', currentGameId);
        
        console.log(`Game ${currentGameId} deleted as no players remain`);
      } else if (gameData?.state === 'waiting' || gameData?.state === 'betting') {
        // If game is still in progress, update the other player
        const otherPlayer = remainingPlayers[0];
        
        // Save game history record for the remaining player (forfeit win)
        await supabase.from('game_history').insert({
          user_id: otherPlayer.user_id,
          game_type: 'coinflip',
          result: 'win',
          amount: otherPlayer.amount || 0,
          notes: 'Opponent left the game'
        });
        
        // Update the game state to complete
        await supabase
          .from('games')
          .update({
            state: 'complete',
            result: otherPlayer.bet || 'heads', // Give the win to the remaining player
            notes: 'Game ended due to player leaving'
          })
          .eq('id', currentGameId);
      }
      
      // Reset local state
      setCurrentGameId(null);
      setGameData(null);
      setPlayers([]);
      
      // Unsubscribe from the game channel
      if (gameChannel) {
        supabase.removeChannel(gameChannel);
        setGameChannel(null);
      }
      
    } catch (error) {
      console.error('Error leaving game:', error);
      throw error;
    }
  }, [connected, user, currentGameId, gameData, gameChannel]);

  return {
    connected,
    gameData,
    players,
    joinGame,
    placeBet,
    leaveGame,
    isJoining,
  };
};
