
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/layout/Navbar";

const Deposit = () => {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  useEffect(() => {
    // Only redirect if user is definitely not authenticated AND auth loading is complete
    if (user === null && !authLoading) {
      navigate("/login");
    }
  }, [user, authLoading, navigate]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate("/login");
      return;
    }

    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid amount greater than 0",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          amount: depositAmount,
          type: "deposit",
          status: "completed",
        });

      if (error) throw error;

      toast({
        title: "Deposit successful",
        description: `$${depositAmount} has been added to your account`,
      });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not process deposit",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Don't render if we're still loading auth state or if user is definitely not authenticated
  if (authLoading || user === null) {
    return null;
  }

  return (
    <div className="min-h-screen bg-casino">
      <Navbar />
      <div className="container mx-auto max-w-md px-4 py-8">
        <Card className="border-casino-lighter bg-casino-lighter">
          <CardHeader>
            <CardTitle className="text-2xl text-casino-accent">Deposit Funds</CardTitle>
            <CardDescription className="text-casino-text">
              Add money to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleDeposit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-casino-text mb-2">
                  Amount ($)
                </label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="border-casino focus:border-casino-accent"
                  placeholder="Enter amount"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-casino-accent text-casino hover:bg-casino-accent/90"
                disabled={loading}
              >
                {loading ? "Processing..." : "Deposit"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Deposit;
