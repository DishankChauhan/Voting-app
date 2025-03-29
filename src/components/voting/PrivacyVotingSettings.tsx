import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Eye, EyeOff, Settings, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { isPrivateVotingEnabled, togglePrivateVoting, PrivacyLevel } from '@/services/zkService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface PrivacyVotingSettingsProps {
  proposalId?: number;
  onPrivacyLevelChange?: (level: PrivacyLevel) => void;
  onSecretChange?: (secret: string) => void;
}

export default function PrivacyVotingSettings({ 
  proposalId, 
  onPrivacyLevelChange,
  onSecretChange 
}: PrivacyVotingSettingsProps) {
  const { user } = useAuth();
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.PUBLIC);
  const [voteSecret, setVoteSecret] = useState<string>('');
  const [secretStrength, setSecretStrength] = useState<'weak' | 'medium' | 'strong'>('weak');

  // Check if the user is an admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) return;
      
      // This is a simple check - in a real app, you would check admin roles
      // For demo purposes, we're considering the first account as admin
      setIsAdmin(user.isAdmin || false);
    };
    
    checkAdminStatus();
  }, [user]);

  // Check if private voting is enabled
  useEffect(() => {
    const checkPrivacyStatus = async () => {
      try {
        setIsLoading(true);
        const enabled = await isPrivateVotingEnabled();
        setIsPrivacyEnabled(enabled);
      } catch (error) {
        console.error('Error checking privacy status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPrivacyStatus();
  }, []);

  // Handle toggling privacy mode (admin only)
  const handleTogglePrivacy = async () => {
    if (!isAdmin) {
      toast.error('Only administrators can change privacy settings');
      return;
    }
    
    try {
      setIsLoading(true);
      await togglePrivateVoting(!isPrivacyEnabled);
      setIsPrivacyEnabled(!isPrivacyEnabled);
      toast.success(`Privacy mode ${!isPrivacyEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling privacy mode:', error);
      toast.error('Failed to change privacy settings');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle privacy level change for voting
  const handlePrivacyLevelChange = (level: PrivacyLevel) => {
    setPrivacyLevel(level);
    if (onPrivacyLevelChange) {
      onPrivacyLevelChange(level);
    }
  };

  // Handle secret change
  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const secret = e.target.value;
    setVoteSecret(secret);
    
    // Evaluate secret strength
    if (secret.length < 8) {
      setSecretStrength('weak');
    } else if (secret.length < 12 || !/[A-Z]/.test(secret) || !/[0-9]/.test(secret)) {
      setSecretStrength('medium');
    } else {
      setSecretStrength('strong');
    }
    
    if (onSecretChange) {
      onSecretChange(secret);
    }
  };

  // Get strength color
  const getStrengthColor = () => {
    switch (secretStrength) {
      case 'weak': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'strong': return 'text-green-500';
      default: return '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <span>Privacy Settings</span>
        </CardTitle>
        <CardDescription>
          Control the privacy level of your votes using zero-knowledge proofs
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <>
            {isAdmin && (
              <div className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <Label htmlFor="privacy-toggle">Global Privacy Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    {isPrivacyEnabled ? 
                      'Private voting is currently enabled' : 
                      'Private voting is currently disabled'}
                  </p>
                </div>
                <Switch
                  id="privacy-toggle"
                  checked={isPrivacyEnabled}
                  onCheckedChange={handleTogglePrivacy}
                  disabled={isLoading}
                />
              </div>
            )}
            
            {!isPrivacyEnabled && (
              <Alert variant="destructive" className="my-4">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Privacy Mode Disabled</AlertTitle>
                <AlertDescription>
                  Private voting is currently disabled. All votes will be publicly visible on the blockchain.
                </AlertDescription>
              </Alert>
            )}
            
            {isPrivacyEnabled && proposalId && (
              <>
                <div className="my-6">
                  <Label>Privacy Level for Current Vote</Label>
                  <Tabs 
                    defaultValue={PrivacyLevel.PUBLIC} 
                    className="mt-2"
                    onValueChange={(value) => handlePrivacyLevelChange(value as PrivacyLevel)}
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value={PrivacyLevel.PUBLIC} className="flex gap-1 items-center">
                        <Eye className="h-4 w-4" />
                        <span>Public</span>
                      </TabsTrigger>
                      <TabsTrigger value={PrivacyLevel.PRIVATE} className="flex gap-1 items-center">
                        <EyeOff className="h-4 w-4" />
                        <span>Private</span>
                      </TabsTrigger>
                      <TabsTrigger value={PrivacyLevel.HYBRID} className="flex gap-1 items-center">
                        <Settings className="h-4 w-4" />
                        <span>Hybrid</span>
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value={PrivacyLevel.PUBLIC} className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Your vote will be fully public on the blockchain. Everyone will be able to see how you voted.
                      </p>
                    </TabsContent>
                    <TabsContent value={PrivacyLevel.PRIVATE} className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Your vote will be private using zero-knowledge proofs. No one will know how you voted, but the vote will still be counted properly.
                      </p>
                      <div className="mt-4">
                        <Label htmlFor="vote-secret">Vote Secret</Label>
                        <div className="flex items-center mt-1 gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="vote-secret"
                              type="password"
                              value={voteSecret}
                              onChange={handleSecretChange}
                              placeholder="Enter a secret for your private vote"
                              className="pr-10"
                            />
                            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <p className={`text-xs mt-1 ${getStrengthColor()}`}>
                          Secret strength: {secretStrength}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          This secret is used to generate your zero-knowledge proof. Keep it secure and do not share it with anyone.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value={PrivacyLevel.HYBRID} className="mt-4">
                      <p className="text-sm text-muted-foreground">
                        Hybrid mode records your vote both publicly and privately. This provides maximum compatibility with on-chain verification while still protecting your privacy.
                      </p>
                      <div className="mt-4">
                        <Label htmlFor="vote-secret-hybrid">Vote Secret</Label>
                        <div className="flex items-center mt-1 gap-2">
                          <div className="relative flex-1">
                            <Input
                              id="vote-secret-hybrid"
                              type="password"
                              value={voteSecret}
                              onChange={handleSecretChange}
                              placeholder="Enter a secret for your private vote"
                              className="pr-10"
                            />
                            <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                        <p className={`text-xs mt-1 ${getStrengthColor()}`}>
                          Secret strength: {secretStrength}
                        </p>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Privacy is powered by zero-knowledge proofs.
        </p>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            onClick={() => window.open('https://docs.example.com/privacy', '_blank')}
          >
            Learn More
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 