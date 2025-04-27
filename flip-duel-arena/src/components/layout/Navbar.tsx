import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LogIn, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const Navbar = () => {
  const { user, signOut } = useAuth();
  const [balance, setBalance] = useState(1000);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('balance, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setBalance(data.balance ?? 1000);
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchProfile();

    const channel = supabase
      .channel(`profile:${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${user.id}`,
      }, (payload) => {
        const profile = payload.new as any;
        if (profile && profile.balance !== undefined) {
          setBalance(profile.balance);
        }
        if (profile && profile.avatar_url !== undefined) {
          setAvatarUrl(profile.avatar_url);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <nav className="border-b border-casino-lighter bg-casino px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <span className="text-2xl font-bold text-casino-accent">FlipDuel</span>
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-casino-text">
                Balance: <span className="font-bold text-casino-accent">${balance}</span>
              </span>
              <Link to="/game">
                <Button variant="default" size="sm">
                  Play Now
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="secondary" size="sm">
                  Dashboard
                </Button>
              </Link>
              <Link to="/profile">
                <Avatar className="w-8 h-8 cursor-pointer">
                  <AvatarImage src={avatarUrl || undefined} alt="Profile" />
                  <AvatarFallback>
                    <User />
                  </AvatarFallback>
                </Avatar>
              </Link>
              <Button variant="outline" size="sm" onClick={signOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Link to="/login">
              <Button variant="default" size="sm">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
