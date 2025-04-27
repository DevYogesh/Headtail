
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { InfoIcon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export const SupabaseMessage = () => {
  const { user } = useAuth();

  return (
    <Alert className="mt-4 border-casino-accent bg-casino p-4">
      <InfoIcon className="h-5 w-5 text-casino-accent" />
      <AlertTitle className="text-casino-accent">
        {user ? "Multiplayer Ready" : "Sign in to Play Multiplayer"}
      </AlertTitle>
      <AlertDescription className="mt-1 text-casino-text">
        {user ? (
          <p className="mb-2">
            You're signed in and ready to play against real opponents in FlipDuel! Join a game or
            wait for someone to challenge you.
          </p>
        ) : (
          <p className="mb-2">
            To enjoy the full multiplayer experience, please sign in or create an account. This will
            allow you to play against other users and track your wins.
          </p>
        )}
        <p className="text-sm text-casino-muted">
          Powered by Supabase real-time multiplayer technology.
        </p>
      </AlertDescription>
    </Alert>
  );
};
