import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  Smartphone, 
  Mail, 
  Key, 
  Monitor, 
  Trash2, 
  Copy, 
  CheckCircle2, 
  AlertTriangle,
  Eye,
  EyeOff
} from 'lucide-react';

interface TwoFactorSettings {
  two_factor_enabled: boolean;
  two_factor_channel: 'email' | 'sms' | null;
  two_factor_backup_enabled: boolean;
  last_2fa_at: string | null;
  phone: string | null;
}

interface TrustedDevice {
  deviceId: string;
  deviceName: string;
  ipAddress: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

interface BackupCodeInfo {
  unusedCount: number;
  message: string;
}

const TwoFactorPage: React.FC = () => {
  // State management
  const [settings, setSettings] = useState<TwoFactorSettings | null>(null);
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [backupCodeInfo, setBackupCodeInfo] = useState<BackupCodeInfo | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [enabled, setEnabled] = useState(false);
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [phone, setPhone] = useState('');
  const [copiedCodes, setCopiedCodes] = useState<Set<number>>(new Set());

  // Load initial data
  useEffect(() => {
    Promise.all([
      fetchTwoFactorSettings(),
      fetchTrustedDevices(),
      fetchBackupCodeInfo()
    ]).finally(() => setLoading(false));
  }, []);

  const fetchTwoFactorSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/2fa', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        setEnabled(data.two_factor_enabled);
        setChannel(data.two_factor_channel || 'email');
        setPhone(data.phone || '');
      }
    } catch (error) {
      console.error('Error fetching 2FA settings:', error);
    }
  };

  const fetchTrustedDevices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/trusted-devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTrustedDevices(data.devices);
      }
    } catch (error) {
      console.error('Error fetching trusted devices:', error);
    }
  };

  const fetchBackupCodeInfo = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/2fa/backup-codes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBackupCodeInfo(data);
      }
    } catch (error) {
      console.error('Error fetching backup code info:', error);
    }
  };

  const handleSave2FASettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          enabled,
          channel: enabled ? channel : undefined,
          phone: channel === 'sms' ? phone : undefined
        })
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(data.message);
        await fetchTwoFactorSettings();
        
        // Generate backup codes if enabling 2FA for the first time
        if (enabled && !settings?.two_factor_enabled) {
          await generateBackupCodes();
        }
      } else {
        setError(data.message || 'Failed to update 2FA settings');
      }
    } catch (error) {
      setError('An error occurred while updating 2FA settings');
    } finally {
      setSaving(false);
    }
  };

  const generateBackupCodes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/me/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setBackupCodes(data.backupCodes);
        setShowBackupCodes(true);
        await fetchBackupCodeInfo();
      } else {
        setError(data.message || 'Failed to generate backup codes');
      }
    } catch (error) {
      setError('An error occurred while generating backup codes');
    }
  };

  const copyToClipboard = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedCodes(prev => new Set(prev.add(index)));
        setTimeout(() => {
          setCopiedCodes(prev => {
            const newSet = new Set(prev);
            newSet.delete(index);
            return newSet;
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  const revokeTrustedDevice = async (deviceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/users/me/trusted-devices/${deviceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        await fetchTrustedDevices();
        setSuccess('Trusted device revoked successfully');
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to revoke trusted device');
      }
    } catch (error) {
      setError('An error occurred while revoking trusted device');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Two-Factor Authentication</h1>
          <p className="text-gray-600">Enhance your account security with 2FA</p>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* 2FA Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            2FA Configuration
          </CardTitle>
          <CardDescription>
            Configure two-factor authentication to secure your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable 2FA */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-base font-medium">Enable Two-Factor Authentication</Label>
              <p className="text-sm text-gray-600">
                Add an extra layer of security to your account
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              disabled={saving}
            />
          </div>

          {enabled && (
            <>
              <Separator />
              
              {/* Channel Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Authentication Method</Label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      channel === 'email' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setChannel('email')}
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Email</div>
                        <div className="text-sm text-gray-600">Receive codes via email</div>
                      </div>
                    </div>
                  </div>

                  <div 
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      channel === 'sms' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setChannel('sms')}
                  >
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="font-medium">SMS</div>
                        <div className="text-sm text-gray-600">Receive codes via text message</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Phone Number Input for SMS */}
                {channel === 'sms' && (
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={saving}
                    />
                    <p className="text-sm text-gray-600">
                      Enter your phone number in international format
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Save Button */}
          <Button 
            onClick={handleSave2FASettings}
            disabled={saving || (channel === 'sms' && enabled && !phone)}
            className="w-full md:w-auto"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Backup Codes */}
      {settings?.two_factor_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Backup Codes
            </CardTitle>
            <CardDescription>
              Use backup codes to access your account if you lose your 2FA device
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {backupCodeInfo && (
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium">Unused Backup Codes</div>
                  <div className="text-sm text-gray-600">{backupCodeInfo.message}</div>
                </div>
                <Badge variant={backupCodeInfo.unusedCount > 0 ? "default" : "destructive"}>
                  {backupCodeInfo.unusedCount} remaining
                </Badge>
              </div>
            )}

            <Button 
              onClick={generateBackupCodes}
              variant="outline"
              className="w-full md:w-auto"
            >
              Generate New Backup Codes
            </Button>

            {/* Display Backup Codes */}
            {showBackupCodes && backupCodes.length > 0 && (
              <div className="space-y-4">
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    Save these backup codes in a secure location. They will not be shown again.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border font-mono text-sm"
                    >
                      <span className="select-all">{code}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard(code, index)}
                        className="h-6 w-6 p-0"
                      >
                        {copiedCodes.has(index) ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => copyToClipboard(backupCodes.join('\n'))}
                    variant="outline"
                    size="sm"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy All
                  </Button>
                  <Button
                    onClick={() => setShowBackupCodes(false)}
                    variant="outline"
                    size="sm"
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide Codes
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Trusted Devices */}
      {settings?.two_factor_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Trusted Devices
            </CardTitle>
            <CardDescription>
              Devices you've marked as trusted will skip 2FA for 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {trustedDevices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Monitor className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No trusted devices found</p>
                <p className="text-sm">Devices you trust will appear here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trustedDevices.map((device) => (
                  <div key={device.deviceId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Monitor className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{device.deviceName}</div>
                        <div className="text-sm text-gray-600">
                          IP: {device.ipAddress} • Last used: {formatDate(device.lastUsedAt)}
                        </div>
                        <div className="text-xs text-gray-500">
                          Added: {formatDate(device.createdAt)} • Expires: {formatDate(device.expiresAt)}
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => revokeTrustedDevice(device.deviceId)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Security Status */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle>Security Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${settings.two_factor_enabled ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-gray-600">
                    {settings.two_factor_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              
              {settings.last_2fa_at && (
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div>
                    <div className="font-medium">Last 2FA Login</div>
                    <div className="text-sm text-gray-600">
                      {formatDate(settings.last_2fa_at)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TwoFactorPage;
