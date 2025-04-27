import React from "react";
import Navbar from "@/components/layout/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, TrendingUp, TrendingDown, Repeat, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const COLORS = ["#ffc857", "#2a9d8f", "#e63946"];

const Dashboard = () => {
  const { user } = useAuth();

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Fetch profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance, wins, losses')
        .eq('id', user.id)
        .single();

      if (!profile) return null;

      // Fetch total games count from game_history
      const { count: totalGames } = await supabase
        .from('game_history')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Calculate win rate from game_history
      const { data: gameResults } = await supabase
        .from('game_history')
        .select('result')
        .eq('user_id', user.id);

      const wins = gameResults?.filter(game => game.result === 'win').length || 0;
      const total = gameResults?.length || 0;
      const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

      // Calculate total earnings from game_history
      const { data: earnings } = await supabase
        .from('game_history')
        .select('amount')
        .eq('user_id', user.id)
        .eq('result', 'win');

      const totalEarnings = earnings?.reduce((sum, game) => sum + Number(game.amount), 0) || 0;

      return {
        balance: profile.balance,
        totalGames: totalGames || 0,
        winRate,
        totalEarnings,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch game history data for bar chart
  const { data: gameHistoryData } = useQuery({
    queryKey: ['game-history', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data } = await supabase
        .from('game_history')
        .select('game_type, result')
        .eq('user_id', user.id);

      if (!data) return [];

      // Transform data for chart
      const gameTypes = [...new Set(data.map(game => game.game_type))];
      return gameTypes.map(type => {
        const gamesOfType = data.filter(game => game.game_type === type);
        return {
          name: type,
          wins: gamesOfType.filter(game => game.result === 'win').length,
          losses: gamesOfType.filter(game => game.result === 'loss').length,
        };
      });
    },
    enabled: !!user?.id,
  });

  // Fetch bet categories data for pie chart
  const { data: betCategoriesData } = useQuery({
    queryKey: ['bet-categories', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data } = await supabase
        .from('bet_categories')
        .select('category, amount')
        .eq('user_id', user.id);

      if (!data) return [];

      // Transform data for chart
      const categories = ['small', 'medium', 'large'];
      return categories.map(category => ({
        name: `${category.charAt(0).toUpperCase()}${category.slice(1)} Bets`,
        value: data.filter(bet => bet.category === category).length,
      }));
    },
    enabled: !!user?.id,
  });

  // Fetch recent transactions
  const { data: recentTransactionsData } = useQuery({
    queryKey: ['recent-transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      return data || [];
    },
    enabled: !!user?.id,
  });

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="min-h-screen bg-casino">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col justify-between space-y-4 md:flex-row md:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-casino-accent">Dashboard</h1>
            <p className="text-casino-text">
              Welcome back, {user.email?.split("@")[0]}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <a href="/deposit">
              <Button className="bg-casino-accent text-casino hover:bg-casino-accent/90">
                Deposit Funds
              </Button>
            </a>
            <a href="/withdraw">
              <Button variant="outline" className="border-casino-accent text-casino-accent">
                Withdraw
              </Button>
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="border-casino-lighter bg-casino-lighter">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-casino-muted">Total Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-casino-text">
                  ${stats?.balance?.toFixed(2) || '0.00'}
                </span>
                <span className="flex items-center text-sm text-casino-green">
                  <TrendingUp className="mr-1 h-4 w-4" /> Active
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-casino-lighter bg-casino-lighter">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-casino-muted">Total Games</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-casino-text">{stats?.totalGames || 0}</span>
                <span className="flex items-center text-sm text-casino-accent">
                  <Repeat className="mr-1 h-4 w-4" /> Lifetime
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-casino-lighter bg-casino-lighter">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-casino-muted">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-casino-text">{stats?.winRate || 0}%</span>
                <span className="flex items-center text-sm text-casino-green">
                  <TrendingUp className="mr-1 h-4 w-4" /> All Time
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-casino-lighter bg-casino-lighter">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-casino-muted">
                Total Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-bold text-casino-text">
                  ${stats?.totalEarnings?.toFixed(2) || '0.00'}
                </span>
                <span className="flex items-center text-sm text-casino-green">
                  <DollarSign className="mr-1 h-4 w-4" /> Lifetime
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="col-span-2 border-casino-lighter bg-casino-lighter">
            <CardHeader>
              <CardTitle className="text-lg text-casino-accent">Game Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={gameHistoryData || []}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1b263b" />
                    <XAxis dataKey="name" stroke="#778da9" />
                    <YAxis stroke="#778da9" />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "#1b263b" }}
                    />
                    <Bar dataKey="wins" stackId="a" fill="#2a9d8f" />
                    <Bar dataKey="losses" stackId="a" fill="#e63946" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-casino-lighter bg-casino-lighter">
            <CardHeader>
              <CardTitle className="text-lg text-casino-accent">Bet Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-80 w-full items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={betCategoriesData || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name}: ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {(betCategoriesData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0d1b2a", borderColor: "#1b263b" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="transactions">
            <TabsList className="w-full">
              <TabsTrigger value="transactions" className="flex-1">
                Recent Transactions
              </TabsTrigger>
              <TabsTrigger value="games" className="flex-1">
                Game History
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1">
                Payment Methods
              </TabsTrigger>
            </TabsList>
            <TabsContent value="transactions" className="mt-4">
              <Card className="border-casino-lighter bg-casino-lighter">
                <CardContent className="p-6">
                  <div className="rounded-lg bg-casino p-4">
                    <div className="mb-2 grid grid-cols-4 text-sm font-medium text-casino-text">
                      <div>Type</div>
                      <div>Amount</div>
                      <div>Date</div>
                      <div>Status</div>
                    </div>
                    <div className="space-y-2">
                      {recentTransactionsData?.map((tx) => (
                        <div
                          key={tx.id}
                          className="grid grid-cols-4 rounded border border-casino-lighter p-2 text-sm"
                        >
                          <div className="text-casino-text">{tx.type}</div>
                          <div
                            className={
                              Number(tx.amount) > 0 ? "text-casino-green" : "text-casino-red"
                            }
                          >
                            {Number(tx.amount) > 0 ? "+" : ""}{Number(tx.amount).toFixed(2)}
                          </div>
                          <div className="text-casino-muted">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-casino-accent">{tx.status}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="games" className="mt-4">
              <Card className="border-casino-lighter bg-casino-lighter">
                <CardContent className="p-6">
                  <div className="rounded-lg bg-casino p-4">
                    <div className="mb-2 grid grid-cols-5 text-sm font-medium text-casino-text">
                      <div>Game ID</div>
                      <div>Date</div>
                      <div>Bet</div>
                      <div>Result</div>
                      <div>Outcome</div>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          id: "G-1234",
                          date: "2023-04-15",
                          bet: "Heads",
                          amount: 50,
                          result: "Heads",
                          win: true,
                        },
                        {
                          id: "G-1235",
                          date: "2023-04-15",
                          bet: "Tails",
                          amount: 25,
                          result: "Heads",
                          win: false,
                        },
                        {
                          id: "G-1236",
                          date: "2023-04-14",
                          bet: "Tails",
                          amount: 75,
                          result: "Tails",
                          win: true,
                        },
                        {
                          id: "G-1237",
                          date: "2023-04-14",
                          bet: "Heads",
                          amount: 100,
                          result: "Tails",
                          win: false,
                        },
                        {
                          id: "G-1238",
                          date: "2023-04-13",
                          bet: "Heads",
                          amount: 50,
                          result: "Heads",
                          win: true,
                        },
                      ].map((game) => (
                        <div
                          key={game.id}
                          className="grid grid-cols-5 rounded border border-casino-lighter p-2 text-sm"
                        >
                          <div className="text-casino-text">{game.id}</div>
                          <div className="text-casino-muted">{game.date}</div>
                          <div className="text-casino-text">
                            {game.bet} (${game.amount})
                          </div>
                          <div className="text-casino-text">{game.result}</div>
                          <div
                            className={
                              game.win ? "text-casino-green" : "text-casino-red"
                            }
                          >
                            {game.win
                              ? `Won $${game.amount}`
                              : `Lost $${game.amount}`}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="payments" className="mt-4">
              <Card className="border-casino-lighter bg-casino-lighter">
                <CardContent className="p-6">
                  <div className="mb-4 flex justify-end">
                    <Button size="sm" className="bg-casino-accent text-casino">
                      Add Payment Method
                    </Button>
                  </div>
                  <div className="rounded-lg bg-casino p-4">
                    <div className="space-y-3">
                      {[
                        {
                          type: "Credit Card",
                          last4: "4242",
                          expiry: "04/25",
                          default: true,
                        },
                        {
                          type: "PayPal",
                          email: "user@example.com",
                          default: false,
                        },
                      ].map((method, index) => (
                        <div
                          key={index}
                          className="rounded border border-casino-lighter p-3 text-sm"
                        >
                          <div className="flex justify-between">
                            <div>
                              <span className="font-medium text-casino-text">
                                {method.type}
                              </span>
                              {method.default && (
                                <span className="ml-2 rounded bg-casino-accent px-2 py-0.5 text-xs text-casino">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-casino-muted hover:text-casino-text"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-casino-red hover:text-casino-red/80"
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                          <div className="mt-1 text-casino-muted">
                            {method.last4 && (
                              <span>•••• •••• •••• {method.last4}</span>
                            )}
                            {method.email && <span>{method.email}</span>}
                            {method.expiry && (
                              <span className="ml-2">Exp: {method.expiry}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
