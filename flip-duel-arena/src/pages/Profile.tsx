
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { User, Camera } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import { useToast } from '@/components/ui/use-toast';

const Profile = () => {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();

      if (data) {
        setUsername(data.username || '');
        setAvatarUrl(data.avatar_url);
      }
    };

    fetchProfile();
  }, [user, navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        toast({
          title: 'Upload Error',
          description: 'Could not upload avatar',
          variant: 'destructive'
        });
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: data.publicUrl })
        .eq('id', user?.id);

      if (error) {
        toast({
          title: 'Profile Update Error',
          description: 'Could not update profile',
          variant: 'destructive'
        });
        return;
      }

      setAvatarUrl(data.publicUrl);
      toast({
        title: 'Avatar Updated',
        description: 'Your profile picture was successfully updated'
      });
    }
  };

  const handleProfileUpdate = async () => {
    const { error } = await supabase
      .from('profiles')
      .update({ username })
      .eq('id', user?.id);

    if (error) {
      toast({
        title: 'Profile Update Error',
        description: 'Could not update profile',
        variant: 'destructive'
      });
      return;
    }

    toast({
      title: 'Profile Updated',
      description: 'Your profile was successfully updated'
    });
  };

  return (
    <div className="min-h-screen bg-casino">
      <Navbar />
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="bg-casino-lighter rounded-lg p-6 shadow-md">
          <div className="relative mx-auto mb-6 w-32 h-32">
            <Avatar className="w-full h-full">
              <AvatarImage 
                src={avatarUrl || undefined} 
                alt="Profile Avatar" 
              />
              <AvatarFallback>
                <User className="w-16 h-16" />
              </AvatarFallback>
            </Avatar>
            <label 
              htmlFor="avatar-upload" 
              className="absolute bottom-0 right-0 bg-casino-accent text-white rounded-full p-2 cursor-pointer hover:bg-casino-accent/90"
            >
              <Camera className="w-5 h-5" />
              <input 
                type="file" 
                id="avatar-upload" 
                accept="image/*" 
                className="hidden" 
                onChange={handleAvatarUpload}
              />
            </label>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-casino-text mb-2">
                Email
              </label>
              <Input 
                type="text" 
                value={user?.email || ''} 
                disabled 
                className="bg-casino-lighter border-casino-lighter text-casino-text" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-casino-text mb-2">
                Username
              </label>
              <Input 
                type="text" 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Choose a username" 
                className="border-casino focus:border-casino-accent" 
              />
            </div>

            <Button 
              onClick={handleProfileUpdate} 
              className="w-full bg-casino-accent text-casino hover:bg-casino-accent/90"
            >
              Update Profile
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
