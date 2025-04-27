
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signIn(email, password);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in.",
      });
      navigate("/game");
    } catch (error) {
      toast({
        title: "Error signing in",
        description: "Please check your credentials and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await signUp(email, password);
      toast({
        title: "Account created!",
        description: "You have successfully created an account.",
      });
      navigate("/game");
    } catch (error) {
      toast({
        title: "Error creating account",
        description: "Please try again with a different email.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-casino p-4">
      <Card className="mx-auto w-full max-w-md border-casino-lighter bg-casino-lighter">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold text-casino-accent">FlipDuel</CardTitle>
          <CardDescription className="text-casino-text">
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-casino-text">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-casino focus:border-casino-accent"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-casino-text">
                      Password
                    </Label>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-xs text-casino-text hover:text-casino-accent"
                    >
                      Forgot password?
                    </Button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-casino focus:border-casino-accent"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-casino-accent text-casino hover:bg-casino-accent/90"
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-signup" className="text-casino-text">
                    Email
                  </Label>
                  <Input
                    id="email-signup"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border-casino focus:border-casino-accent"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password-signup" className="text-casino-text">
                    Password
                  </Label>
                  <Input
                    id="password-signup"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="border-casino focus:border-casino-accent"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-casino-accent text-casino hover:bg-casino-accent/90"
                  disabled={loading}
                >
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="justify-center text-sm text-casino-muted">
          By continuing, you agree to our
          <Button variant="link" className="pl-1 pr-1 text-casino-text hover:text-casino-accent">
            Terms of Service
          </Button>
          and
          <Button variant="link" className="pl-1 text-casino-text hover:text-casino-accent">
            Privacy Policy
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
