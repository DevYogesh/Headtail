
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ArrowRight, Coins, Award, Users } from "lucide-react";
import { SupabaseMessage } from "@/components/ui/supabase-message";
import Navbar from "@/components/layout/Navbar";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-casino">
      <Navbar />
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <SupabaseMessage />
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-casino-accent sm:text-5xl md:text-6xl">
            FlipDuel Arena
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-xl text-casino-text">
            The ultimate head-to-tail betting platform. Challenge opponents and win big!
          </p>
          <div className="mt-8 flex justify-center">
            {user ? (
              <Link to="/game">
                <Button size="lg" className="bg-casino-accent text-casino hover:bg-casino-accent/90">
                  Play Now <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link to="/login">
                <Button size="lg" className="bg-casino-accent text-casino hover:bg-casino-accent/90">
                  Sign In to Play <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mt-16 sm:mt-24">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-casino-lighter bg-casino-lighter p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-casino-accent">
                <Coins className="h-6 w-6 text-casino" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-casino-text">Real-time Betting</h3>
              <p className="mt-2 text-casino-muted">
                Place your bets on heads or tails and compete against real players in real-time.
              </p>
            </div>

            <div className="rounded-xl border border-casino-lighter bg-casino-lighter p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-casino-accent">
                <Award className="h-6 w-6 text-casino" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-casino-text">Track Your Wins</h3>
              <p className="mt-2 text-casino-muted">
                Monitor your statistics, earnings, and progress in your personal dashboard.
              </p>
            </div>

            <div className="rounded-xl border border-casino-lighter bg-casino-lighter p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-casino-accent">
                <Users className="h-6 w-6 text-casino" />
              </div>
              <h3 className="mt-6 text-xl font-semibold text-casino-text">Challenge Players</h3>
              <p className="mt-2 text-casino-muted">
                Join the community, challenge friends, and climb the leaderboard rankings.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-2xl border border-casino-lighter bg-casino-lighter p-8 sm:p-10">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-casino-accent">How It Works</h2>
            <p className="mt-2 text-casino-text">Simple, fair, and exciting coin flipping action</p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-casino p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-casino-lighter text-casino-accent">
                1
              </div>
              <h3 className="mt-3 text-lg font-medium text-casino-text">Place Your Bet</h3>
              <p className="mt-1 text-sm text-casino-muted">
                Choose heads or tails and set your bet amount
              </p>
            </div>

            <div className="rounded-lg bg-casino p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-casino-lighter text-casino-accent">
                2
              </div>
              <h3 className="mt-3 text-lg font-medium text-casino-text">Match with an Opponent</h3>
              <p className="mt-1 text-sm text-casino-muted">
                Get paired with another player in real-time
              </p>
            </div>

            <div className="rounded-lg bg-casino p-6 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-casino-lighter text-casino-accent">
                3
              </div>
              <h3 className="mt-3 text-lg font-medium text-casino-text">Win or Lose</h3>
              <p className="mt-1 text-sm text-casino-muted">
                Watch the coin flip and collect your winnings
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
