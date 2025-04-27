import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { SupabaseMessage } from "@/components/ui/supabase-message";
import { useGameSocket } from "@/hooks/useGameSocket";
import { useAuth } from "@/hooks/useAuth";
import { Clock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useNavigate, useBeforeUnload } from "react-router-dom";

type GameState = "waiting" | "betting" | "flipping" | "complete";
type Bet = "heads" | "tails";

const CoinFlip = () => {
  const [gameState, setGameState] = useState<GameState>("waiting");
  const [bet, setBet] = useState<Bet | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [result, setResult] = useState<Bet | null>(null);
  const [opponent, setOpponent] = useState<string | null>(null);
  const [opponentBet, setOpponentBet] = useState<Bet | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const { connected, gameData, players, placeBet, joinGame, isJoining, leaveGame } = useGameSocket();
  const [isResetting, setIsResetting] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(60); // 60 seconds countdown
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if game is active
  const isGameActive = hasJoined && gameState !== "complete";

  // Handle navigation attempts
  useEffect(() => {
    // Setup navigation confirmation
    const handleBeforeNavigate = (event: PopStateEvent) => {
      if (isGameActive) {
        // Prevent the navigation
        event.preventDefault();
        // Store the URL we were trying to navigate to
        const path = window.location.pathname;
        setPendingNavigation(path);
        // Show the confirmation dialog
        setShowExitDialog(true);
        // Push the current URL back to the history to prevent navigation
        window.history.pushState(null, '', window.location.pathname);
        return;
      }
    };

    // Listen for navigation attempts
    window.addEventListener('popstate', handleBeforeNavigate);

    return () => {
      window.removeEventListener('popstate', handleBeforeNavigate);
    };
  }, [isGameActive]);

  // Handle beforeunload event (browser refresh/close)
  useBeforeUnload(
    useCallback(
      (event) => {
        if (isGameActive) {
          event.preventDefault();
          // Chrome requires returnValue to be set
          event.returnValue = '';
          return '';
        }
      },
      [isGameActive]
    )
  );

  // Handle game state changes from socket
  useEffect(() => {
    if (!gameData) return;
    
    setGameState(gameData.state);
    
    if (gameData.state === "flipping") {
      setIsFlipping(true);
      setTimeout(() => {
        setIsFlipping(false);
      }, 3000);
    }
    
    if (gameData.state === "complete" && result !== gameData.result) {
      setResult(gameData.result || null);
      if (bet) { // Only show toast if we had a bet placed
        const userWon = bet === gameData.result;
        toast({
          title: userWon ? "You won!" : "You lost!",
          description: userWon ? `You earned $${betAmount * 2}` : `You lost $${betAmount}`,
          variant: userWon ? "default" : "destructive",
        });
      }
    }
  }, [gameData, bet, betAmount, toast, result]);

  // Handle opponent updates
  useEffect(() => {
    if (players && players.length > 1) {
      const opponentPlayer = players.find(p => p.id !== user?.id);
      if (opponentPlayer) {
        setOpponent(opponentPlayer.name);
        setOpponentBet(opponentPlayer.bet as Bet);
        
        // If both players have joined and we're in waiting state, transition to betting
        if (hasJoined && gameState === "waiting") {
          setGameState("betting");
          // Stop the timer when opponent joins
          setTimerActive(false);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
          toast({
            title: "Game is starting",
            description: "Your opponent has joined. Place your bet!",
          });
        }
      }
    } else {
      setOpponent(null);
      setOpponentBet(null);
    }
  }, [players, user, hasJoined, gameState, toast]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - reset the game
            setTimerActive(false);
            handleGameTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timeRemaining <= 0 && timerActive) {
      setTimerActive(false);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timerActive, timeRemaining]);

  const handleGameTimeout = async () => {
    // Stop the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    toast({
      title: "Game timed out",
      description: "No opponent joined within the time limit.",
      variant: "destructive",
    });
    
    // Reset the game
    await handleNewGame();
  };

  const handleJoinGame = () => {
    joinGame();
    setHasJoined(true);
    
    // Start the timer
    setTimeRemaining(60);
    setTimerActive(true);
    
    toast({
      title: "Joined game",
      description: "Waiting for an opponent to join...",
    });
  };

  const handlePlaceBet = (selectedBet: Bet) => {
    setBet(selectedBet);
    placeBet(selectedBet, betAmount);
    toast({
      title: "Bet placed",
      description: `You bet $${betAmount} on ${selectedBet}. Waiting for opponent...`,
    });
  };

  const handleNewGame = async () => {
    setIsResetting(true);
    
    try {
      // First leave the current game
      if (leaveGame && typeof leaveGame === 'function') {
        try {
          await leaveGame();
        } catch (leaveError) {
          console.error("Error leaving game:", leaveError);
          // Continue with reset even if leaving fails
        }
      }
      
      // Reset local state
      setBet(null);
      setResult(null);
      setOpponent(null);
      setOpponentBet(null);
      setGameState("waiting");
      setHasJoined(false);
      setTimerActive(false);
      setTimeRemaining(60);
      
      // Clear any active timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      toast({
        title: "Game reset",
        description: "You can join a new game now!",
      });
      
    } catch (error) {
      console.error("Error resetting game:", error);
      toast({
        title: "Error",
        description: "Failed to reset the game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  // Handle exit confirmation
  const handleExitConfirm = async () => {
    // Leave the game
    if (leaveGame && typeof leaveGame === 'function') {
      try {
        await leaveGame();
      } catch (error) {
        console.error("Error leaving game:", error);
        // Continue with navigation even if leaving fails
      }
    }
    
    // Close the dialog
    setShowExitDialog(false);
    
    // Navigate to the pending path if there is one
    if (pendingNavigation) {
      navigate(pendingNavigation);
      setPendingNavigation(null);
    }
  };

  // Handle exit cancellation
  const handleExitCancel = () => {
    setShowExitDialog(false);
    setPendingNavigation(null);
  };

  // Format the remaining time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Determine what message to show when waiting
  const getWaitingMessage = () => {
    if (!hasJoined) {
      return "Join a game to start playing";
    } else if (!opponent) {
      return "Waiting for an opponent to join...";
    } else if (bet && !opponentBet) {
      return "Waiting for opponent to place their bet...";
    } else if (!bet && opponentBet) {
      return "Your opponent placed their bet. Your turn!";
    }
    return "Waiting...";
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <SupabaseMessage />
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-bold text-casino-accent">Coin Flip Duel</h2>
        <p className="text-casino-text">Bet on heads or tails and win against your opponent!</p>
      </div>

      {/* Game Status */}
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-casino-lighter bg-casino-lighter p-4 text-center">
          <p className="text-sm text-casino-text">
            Status: <span className="font-semibold text-casino-accent">
              {gameState === "waiting" ? getWaitingMessage() : gameState}
            </span>
          </p>
          {opponent && (
            <p className="mt-2 text-sm text-casino-text">
              Opponent: <span className="font-semibold text-casino-text">{opponent}</span>
              {opponentBet && (
                <span className="ml-2 text-casino-accent">(Bet: {opponentBet})</span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Coin Animation */}
      <div className="relative h-40 w-40">
        <AnimatePresence>
          {isFlipping ? (
            <motion.div
              className="absolute h-full w-full"
              animate={{ rotateX: [0, 1800] }}
              transition={{ duration: 3, ease: "easeInOut" }}
            >
              <div className="h-full w-full rounded-full border-4 border-casino-accent bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-lg">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform font-mono text-3xl font-bold text-casino-DEFAULT">
                  {result === "heads" ? "H" : "T"}
                </div>
              </div>
            </motion.div>
          ) : result ? (
            <div className="h-full w-full rounded-full border-4 border-casino-accent bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-lg">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform font-mono text-3xl font-bold text-casino-DEFAULT">
                {result === "heads" ? "H" : "T"}
              </div>
            </div>
          ) : (
            <div className="h-full w-full rounded-full border-4 border-casino-accent bg-gradient-to-r from-yellow-300 to-yellow-500 shadow-lg" />
          )}
        </AnimatePresence>
      </div>

      {/* Game Controls */}
      <div className="w-full max-w-md">
        <Card className="border-casino-lighter bg-casino-lighter">
          <div className="p-4">
            {/* Not joined yet - show join button */}
            {!hasJoined && gameState === "waiting" && (
              <div className="flex flex-col space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-casino-text">Bet Amount:</span>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(Math.max(5, betAmount - 5))}
                      disabled={betAmount <= 5 || isJoining}
                    >
                      -
                    </Button>
                    <span className="w-16 text-center text-casino-accent">${betAmount}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBetAmount(betAmount + 5)}
                      disabled={isJoining}
                    >
                      +
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleJoinGame}
                  disabled={!connected || isJoining}
                  className="w-full bg-casino-accent text-casino-DEFAULT hover:bg-casino-accent/80"
                >
                  {isJoining ? "Joining..." : "Join Now"}
                </Button>
              </div>
            )}

            {/* Joined but waiting for opponent */}
            {hasJoined && gameState === "waiting" && !opponent && (
              <div className="text-center p-4">
                <p className="text-casino-text">Waiting for an opponent to join...</p>
                
                {/* Timer display */}
                <div className="mt-4 flex items-center justify-center">
                  <div className={`flex items-center gap-2 rounded-full border px-4 py-2 ${
                    timeRemaining <= 10 ? "border-casino-red text-casino-red animate-pulse" : "border-casino-accent text-casino-accent"
                  }`}>
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {formatTime(timeRemaining)}
                    </span>
                  </div>
                </div>
                
                <div className="mt-3 flex justify-center">
                  <div className="animate-pulse flex space-x-2">
                    <div className="h-2 w-2 bg-casino-accent rounded-full"></div>
                    <div className="h-2 w-2 bg-casino-accent rounded-full"></div>
                    <div className="h-2 w-2 bg-casino-accent rounded-full"></div>
                  </div>
                </div>
                
                <p className="mt-4 text-xs text-casino-muted">
                  If no opponent joins within the time limit, the game will reset.
                </p>
              </div>
            )}

            {/* Joined, opponent joined, and now we can bet */}
            {gameState === "betting" && (
              <div className="flex flex-col space-y-4">
                <p className="text-center text-sm text-casino-text">
                  Choose your bet:
                </p>
                <div className="flex justify-between">
                  <Button
                    variant={bet === "heads" ? "default" : "outline"}
                    size="lg"
                    onClick={() => handlePlaceBet("heads")}
                    disabled={bet !== null}
                    className={`w-[48%] ${
                      bet === "heads" ? "bg-casino-accent text-casino-DEFAULT" : ""
                    }`}
                  >
                    Heads
                  </Button>
                  <Button
                    variant={bet === "tails" ? "default" : "outline"}
                    size="lg"
                    onClick={() => handlePlaceBet("tails")}
                    disabled={bet !== null}
                    className={`w-[48%] ${
                      bet === "tails" ? "bg-casino-accent text-casino-DEFAULT" : ""
                    }`}
                  >
                    Tails
                  </Button>
                </div>
                {bet ? (
                  <p className="text-center text-xs text-casino-muted">
                    You bet ${betAmount} on {bet}. Waiting for your opponent...
                  </p>
                ) : opponentBet ? (
                  <p className="text-center text-xs text-casino-muted">
                    Your opponent has placed their bet. Your turn!
                  </p>
                ) : (
                  <p className="text-center text-xs text-casino-muted">
                    Make your selection to place your bet
                  </p>
                )}
              </div>
            )}

            {/* Coin is flipping */}
            {gameState === "flipping" && (
              <div className="text-center">
                <p className="text-casino-text">Flipping the coin...</p>
                <p className="mt-2 text-sm text-casino-muted">
                  You bet on: <span className="font-semibold text-casino-accent">{bet}</span>
                </p>
              </div>
            )}

            {/* Game completed - show result */}
            {gameState === "complete" && (
              <div className="flex flex-col space-y-4">
                <div className="rounded-lg border border-casino-lighter bg-casino p-3 text-center">
                  <p className="text-sm text-casino-text">
                    Result: <span className="font-bold text-casino-accent">{result}</span>
                  </p>
                  <p className="mt-1 text-lg font-bold">
                    {bet === result ? (
                      <span className="text-casino-green">You Won ${betAmount * 2}!</span>
                    ) : (
                      <span className="text-casino-red">You Lost ${betAmount}</span>
                    )}
                  </p>
                </div>
                <Button
                  onClick={handleNewGame}
                  disabled={isResetting}
                  className="w-full bg-casino-accent text-casino-DEFAULT hover:bg-casino-accent/80"
                >
                  {isResetting ? "Resetting..." : "New Game"}
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Exit Game Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent className="bg-casino-lighter border-casino-lighter">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-casino-accent">Exit Current Game?</AlertDialogTitle>
            <AlertDialogDescription className="text-casino-text">
              You are currently in an active game. If you leave now, you will forfeit the game and any bets placed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleExitCancel}
              className="border-casino-lighter text-casino-text hover:bg-casino hover:text-casino-text"
            >
              Stay in Game
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExitConfirm}
              className="bg-casino-red text-white hover:bg-casino-red/80"
            >
              Exit Game
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CoinFlip;