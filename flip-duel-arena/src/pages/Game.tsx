import Navbar from "@/components/layout/Navbar";
import CoinFlip from "@/components/game/CoinFlip";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useGameHistory } from "@/hooks/useGameHistory";
import { useOnlinePlayers } from "@/hooks/useOnlinePlayers";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const Game = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: gameHistory, isLoading: loadingHistory, error: historyError } = useGameHistory();
  const { players: onlinePlayers, isLoading: loadingPlayers, error: playersError } = useOnlinePlayers();
  const [messages, setMessages] = useState<Array<{id: string, sender: string, text: string, timestamp: Date}>>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarTop, setSidebarTop] = useState(0);
  const [challenges, setChallenges] = useState<Array<{id: string, from: string, fromName: string}>>([]);
  const [showNotification, setShowNotification] = useState(false);
  const [currentChallenge, setCurrentChallenge] = useState<{id: string, from: string, fromName: string} | null>(null);

  // Filter out the current user from the online players list
  const otherOnlinePlayers = onlinePlayers.filter(player => player.id !== user?.id);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Set up sticky sidebar
  useEffect(() => {
    const handleScroll = () => {
      const navbarHeight = 64; // Approximate height of your navbar
      const scrollY = window.scrollY;
      
      // Set top position based on scroll, but don't go above navbar
      if (scrollY > navbarHeight) {
        setSidebarTop(16); // Add some padding from top
      } else {
        setSidebarTop(navbarHeight - scrollY + 16);
      }
    };

    // Calculate initial position
    handleScroll();
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Clean up
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Add a new state to track outgoing challenges
  const [outgoingChallenges, setOutgoingChallenges] = useState<Array<string>>([]);

  const handleCompete = (playerId: string, playerName: string) => {
    // In a real app, you would send this to your backend
    const challengeId = Date.now().toString();
    
    // Check if we already have an outgoing challenge to this player
    if (outgoingChallenges.includes(playerId)) {
      toast({
        title: "Challenge already sent",
        description: `You've already challenged ${playerName}. Wait for a response.`,
        variant: "destructive",
      });
      return;
    }
    
    // Add to outgoing challenges
    setOutgoingChallenges(prev => [...prev, playerId]);
    
    // Simulate sending a challenge notification
    toast({
      title: "Challenge sent",
      description: `You've challenged ${playerName} to a game!`,
    });
    
    
  };

  // This function would be triggered when receiving a challenge from another player
  // For demo purposes, we'll simulate receiving a challenge when clicking a test button
  const simulateReceiveChallenge = (fromId: string, fromName: string) => {
    const incomingChallenge = {
      id: Date.now().toString(),
      from: fromId,
      fromName: fromName
    };
    
    setChallenges(prev => [...prev, incomingChallenge]);
    setCurrentChallenge(incomingChallenge);
    setShowNotification(true);
  };

  const acceptChallenge = (challengeId: string) => {
    // Find the challenge
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    
    // In a real app, you would notify the backend that the challenge was accepted
    
    toast({
      title: "Challenge accepted",
      description: `You've accepted ${challenge.fromName}'s challenge!`,
    });
    
    // Close the notification
    setShowNotification(false);
    
    // Remove the challenge from the list
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
    
    // Navigate to the game page (in this case, we're already there, but you might redirect to a specific game room)
    // For demo purposes, we'll just scroll to the game section
    document.querySelector('[value="coinflip"]')?.scrollIntoView({ behavior: 'smooth' });
    
    // Select the coinflip tab if not already selected
    const coinflipTab = document.querySelector('[value="coinflip"]') as HTMLElement;
    if (coinflipTab) {
      coinflipTab.click();
    }
  };

  const declineChallenge = (challengeId: string) => {
    // Find the challenge
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge) return;
    
    // In a real app, you would notify the backend that the challenge was declined
    
    toast({
      title: "Challenge declined",
      description: `You've declined ${challenge.fromName}'s challenge.`,
    });
    
    // Close the notification
    setShowNotification(false);
    
    // Remove the challenge from the list
    setChallenges(prev => prev.filter(c => c.id !== challengeId));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedChat) return;
    
    // Add message to state (in a real app, you'd send this to your backend)
    const message = {
      id: Date.now().toString(),
      sender: user?.id || '',
      text: newMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage("");
  };

  const selectChat = (playerId: string) => {
    setSelectedChat(playerId);
    // For demo purposes, we'll clear messages when switching chats
    setMessages([]);
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-casino">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Challenge Notification */}
        {showNotification && currentChallenge && (
          <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 transform rounded-lg border border-casino-accent bg-casino-lighter p-4 shadow-lg">
            <div className="mb-2 text-center text-lg font-bold text-casino-accent">
              Game Challenge
            </div>
            <p className="mb-4 text-center text-casino-text">
              {currentChallenge.fromName} has challenged you to a game!
            </p>
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={() => declineChallenge(currentChallenge.id)}
                variant="outline"
                className="border-casino-red text-casino-red hover:bg-casino-red/10"
              >
                Decline
              </Button>
              <Button 
                onClick={() => acceptChallenge(currentChallenge.id)}
                className="bg-casino-accent text-casino-DEFAULT hover:bg-casino-accent/80"
              >
                Play Now
              </Button>
            </div>
          </div>
        )}

        {/* For testing only - add a button to simulate receiving a challenge */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 text-center">
            <Button
              onClick={() => simulateReceiveChallenge('test-id', 'Test Player')}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              Simulate Receiving Challenge (Dev Only)
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Tabs defaultValue="coinflip">
              <TabsList className="w-full">
                <TabsTrigger value="coinflip" className="flex-1">
                  Coin Flip
                </TabsTrigger>
                <TabsTrigger value="leaderboard" className="flex-1">
                  Leaderboard
                </TabsTrigger>
              </TabsList>
              <TabsContent value="coinflip" className="mt-4">
                <Card className="border-casino-lighter bg-casino-lighter">
                  <CardContent className="p-6">
                    <CoinFlip />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="leaderboard" className="mt-4">
                {/* Leaderboard content remains the same */}
              </TabsContent>
            </Tabs>
          </div>

          <div className="relative lg:block">
            {/* This div will be absolutely positioned and will stick to the viewport */}
            <div 
              ref={sidebarRef}
              className="lg:fixed lg:w-[calc(100%/3-2rem)]" 
              style={{ top: `${sidebarTop}px` }}
            >
              <Card className="border-casino-lighter bg-casino-lighter">
                <CardContent className="p-6">
                  {/* Sidebar content wrapped in a scrollable container with hidden scrollbar */}
                  <style>{`
                    .hide-scrollbar::-webkit-scrollbar {
                      display: none;
                    }
                    .hide-scrollbar {
                      -ms-overflow-style: none;  /* IE and Edge */
                      scrollbar-width: none;  /* Firefox */
                    }
                  `}</style>
                  <div className="hide-scrollbar max-h-[calc(100vh-120px)] overflow-y-auto pr-2">
                    <h3 className="mb-4 text-xl font-bold text-casino-accent">Live Players</h3>
                    <div className="rounded-lg bg-casino p-4">
                      {loadingPlayers ? (
                        <div className="flex justify-center py-6 text-casino-muted">Loading players...</div>
                      ) : playersError ? (
                        <div className="flex justify-center py-6 text-casino-red">Could not load players</div>
                      ) : otherOnlinePlayers.length > 0 ? (
                        <div className="space-y-3">
                          {otherOnlinePlayers.map((player) => (
                            <div
                              key={player.id}
                              className="flex items-center justify-between rounded border border-casino-lighter p-3 text-sm"
                            >
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={player.avatar_url || ''} alt={player.name} />
                                  <AvatarFallback className="bg-casino-accent text-casino-DEFAULT">
                                    {player.name.substring(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium text-casino-text">{player.name}</div>
                                  <div className="mt-1 text-xs text-casino-muted">
                                    Online Player
                                  </div>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  className="rounded bg-casino-green px-3 py-1 text-xs font-medium text-casino-DEFAULT hover:bg-casino-green/80"
                                  onClick={() => {
                                    // Select the coinflip tab
                                    const coinflipTab = document.querySelector('[value="coinflip"]') as HTMLElement;
                                    if (coinflipTab) {
                                      coinflipTab.click();
                                    }
                                    // Scroll to the game section
                                    document.querySelector('[value="coinflip"]')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                >
                                  Play
                                </button>
                                <button
                                  className={`rounded px-3 py-1 text-xs font-medium text-casino-DEFAULT ${
                                    outgoingChallenges.includes(player.id)
                                      ? "bg-casino-muted cursor-not-allowed"
                                      : "bg-casino-accent hover:bg-casino-accent/80"
                                  }`}
                                  onClick={() => handleCompete(player.id, player.name)}
                                  disabled={outgoingChallenges.includes(player.id)}
                                >
                                  {outgoingChallenges.includes(player.id) ? "Challenged" : "Compete"}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center py-6 text-casino-muted">
                          No other players online right now.
                        </div>
                      )}
                    </div>

                    {/* Live Message Box */}
                    <h3 className="mb-4 mt-6 text-xl font-bold text-casino-accent">Live Chat</h3>
                    <div className="rounded-lg bg-casino p-4">
                      <div className="mb-4 flex flex-col space-y-2">
                        {otherOnlinePlayers.length > 0 ? (
                          <>
                            <div className="mb-2 text-sm text-casino-muted">Select a player to chat with:</div>
                            <div className="flex flex-wrap gap-2">
                              {otherOnlinePlayers.map((player) => (
                                <div
                                  key={player.id}
                                  onClick={() => selectChat(player.id)}
                                  className={`flex cursor-pointer items-center space-x-2 rounded-full border px-3 py-1 text-xs ${
                                    selectedChat === player.id
                                      ? "border-casino-accent bg-casino-accent/20 text-casino-accent"
                                      : "border-casino-lighter text-casino-muted hover:border-casino-accent/50"
                                  }`}
                                >
                                  <Avatar className="h-5 w-5">
                                    <AvatarImage src={player.avatar_url || ''} alt={player.name} />
                                    <AvatarFallback className="text-[10px]">
                                      {player.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span>{player.name}</span>
                                  <CheckCircle className="h-3 w-3 text-casino-green" />
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="text-center text-sm text-casino-muted">
                            No players available to chat with
                          </div>
                        )}
                      </div>

                      {selectedChat && (
                        <>
                          <div className="hide-scrollbar mb-3 h-48 overflow-y-auto rounded border border-casino-lighter bg-casino-darker p-3">
                            {messages.length === 0 ? (
                              <div className="flex h-full items-center justify-center text-sm text-casino-muted">
                                No messages yet. Start the conversation!
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex ${
                                      message.sender === user?.id ? "justify-end" : "justify-start"
                                    }`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                        message.sender === user?.id
                                          ? "bg-casino-accent text-casino-DEFAULT"
                                          : "bg-casino-lighter text-casino-text"
                                      }`}
                                    >
                                      <div>{message.text}</div>
                                      <div className="mt-1 text-right text-xs opacity-70">
                                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </div>

                          <div className="flex space-x-2">
                            <Input
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              placeholder="Type a message..."
                              className="bg-casino-lighter"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSendMessage();
                              }}
                            />
                            <Button 
                              onClick={handleSendMessage}
                              className="bg-casino-accent text-casino-DEFAULT hover:bg-casino-accent/80"
                              size="sm"
                            >
                              Send
                            </Button>
                          </div>
                        </>
                      )}
                    </div>

                    <h3 className="mb-4 mt-6 text-xl font-bold text-casino-accent">Game History</h3>
                    <div className="rounded-lg bg-casino p-4">
                      {loadingHistory ? (
                        <div className="flex justify-center py-6 text-casino-muted">Loading...</div>
                      ) : historyError ? (
                        <div className="flex justify-center py-6 text-casino-red">Could not load history</div>
                      ) : gameHistory && gameHistory.length > 0 ? (
                        <div className="space-y-3">
                          {gameHistory.map((game) => (
                            <div
                              key={game.id}
                              className="rounded border border-casino-lighter p-3 text-sm"
                            >
                              <div className="flex justify-between">
                                <span
                                  className={
                                    game.result === "win"
                                      ? "font-medium text-casino-green"
                                      : "font-medium text-casino-red"
                                  }
                                >
                                  {game.result === "win" ? "You Won" : "You Lost"}
                                </span>
                                <span className="text-casino-muted">{game.game_type}</span>
                              </div>
                              <div className="mt-1 flex justify-between text-xs">
                                <span className="text-casino-text">
                                  {game.result === "win"
                                    ? `+ $${game.amount}`
                                    : `- $${game.amount}`}
                                </span>
                                <span className="text-casino-muted">
                                  {new Date(game.created_at).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex justify-center py-6 text-casino-muted">
                          No game history found.
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Game;

