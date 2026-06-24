'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, Loader2, UserPlus, Users, Key, AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface ProfileRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  role: string | null;
  created_at: string;
}

export function UserManagement() {
  const supabase = createClient();
  const { user, profile } = useAuth();

  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [maxSeats, setMaxSeats] = useState(1);
  const [planName, setPlanName] = useState('Bronze Plan');
  
  // Dialog/Modal states
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  
  // Form states
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // New User fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'agent'>('agent');

  // Edit User fields
  const [editingUser, setEditingUser] = useState<ProfileRow | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'agent'>('agent');

  // Delete target
  const [userToDelete, setUserToDelete] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (profile?.business_id) {
      fetchUsersAndLimits();
    }
  }, [profile?.business_id]);

  async function fetchUsersAndLimits() {
    try {
      setLoading(true);

      // 1. Fetch current users list via the API endpoint
      const res = await fetch('/api/tenant/users');
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch team members');
      }
      const data = await res.json();
      setUsers(data || []);

      // 2. Fetch business plan tier and seats details from DB directly (RLS allows SELECT)
      const { data: business, error: bizError } = await supabase
        .from('businesses')
        .select(`
          tier_id,
          subscription_tiers (
            name,
            max_team_seats
          )
        `)
        .single();

      if (bizError) throw bizError;

      if (business) {
        const tierInfo = business.subscription_tiers as any;
        setPlanName(tierInfo?.name || 'Bronze Plan');
        setMaxSeats(tierInfo?.max_team_seats ?? 1);
      }
    } catch (err: any) {
      console.error('Error fetching tenant users details:', err);
      toast.error(err.message || 'Failed to load user management details');
    } finally {
      setLoading(false);
    }
  }

  // Handle addition
  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password || !role) {
      toast.error('All fields are required');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/tenant/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          full_name: fullName.trim(),
          password,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      toast.success('Team member added successfully!');
      setAddOpen(false);
      
      // Reset form
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('agent');
      
      // Refresh list
      await fetchUsersAndLimits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add user');
    } finally {
      setSaving(false);
    }
  }

  // Handle edit
  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    if (!editFullName.trim() || !editRole) {
      toast.error('Name and role are required');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/tenant/users/${editingUser.user_id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editFullName.trim(),
          role: editRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user');
      }

      toast.success('User updated successfully');
      setEditOpen(false);
      setEditingUser(null);
      await fetchUsersAndLimits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setSaving(false);
    }
  }

  // Handle delete
  async function handleDeleteUser() {
    if (!userToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/tenant/users/${userToDelete.user_id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove team member');
      }

      toast.success('Team member removed successfully');
      setDeleteOpen(false);
      setUserToDelete(null);
      await fetchUsersAndLimits();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
        Loading team directories...
      </div>
    );
  }

  // Check if current user is allowed to manage users
  const isAuthorized = profile?.role === 'owner' || profile?.role === 'admin' || profile?.is_superadmin;
  if (!isAuthorized) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="h-10 w-10 text-destructive mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Access Denied</h3>
          <p className="text-muted-foreground text-sm mt-1 max-w-md">
            You do not have permission to manage team users. Only business owners and administrators can access user management.
          </p>
        </CardContent>
      </Card>
    );
  }

  const isLimitReached = users.length >= maxSeats;
  const utilizationPercentage = Math.min(100, Math.round((users.length / maxSeats) * 100));

  return (
    <div className="space-y-6 mt-4">
      {/* Visual seat limit tracker */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Seat Allocation
              </h3>
              <p className="text-xs text-muted-foreground">
                Your <span className="font-semibold text-foreground capitalize">{planName}</span> supports up to <span className="font-semibold text-foreground">{maxSeats}</span> user seats.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {users.length} <span className="text-sm font-normal text-muted-foreground">/ {maxSeats} Seats</span>
              </span>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="h-2.5 w-full bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${
                  utilizationPercentage >= 100 
                    ? 'bg-amber-500' 
                    : utilizationPercentage >= 70 
                      ? 'bg-amber-400' 
                      : 'bg-primary'
                }`}
                style={{ width: `${utilizationPercentage}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{utilizationPercentage}% capacity used</span>
              {isLimitReached && (
                <span className="text-amber-500 font-semibold flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Upgrade plan to add more team members
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main team members card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <CardTitle className="text-foreground">Team Members</CardTitle>
            <CardDescription className="text-muted-foreground/60">
              Manage accounts, roles, and authorization keys for your agents.
            </CardDescription>
          </div>
          <Button 
            onClick={() => setAddOpen(true)}
            disabled={isLimitReached}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 self-start sm:self-center"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Role</TableHead>
                  <TableHead className="text-muted-foreground">Joined</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((row) => {
                  const isSelf = row.user_id === user?.id;
                  const isOwner = row.role === 'owner';
                  
                  return (
                    <TableRow key={row.id} className="border-border hover:bg-muted/50">
                      <TableCell className="text-foreground font-medium flex items-center gap-2 py-3.5">
                        <span>{row.full_name || 'No Name Provided'}</span>
                        {isSelf && (
                          <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] uppercase font-semibold border ${
                            row.role === 'owner' 
                              ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' 
                              : row.role === 'admin'
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          }`}
                        >
                          {row.role || 'agent'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground/60 text-xs">
                        {row.created_at ? new Date(row.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={isOwner || isSelf} // Owner cannot be changed, user cannot change own role here
                            onClick={() => {
                              setEditingUser(row);
                              setEditFullName(row.full_name || '');
                              setEditRole((row.role as 'admin' | 'agent') || 'agent');
                              setEditOpen(true);
                            }}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            disabled={isSelf || isOwner} // Prevents self-deletion & primary owner deletion
                            onClick={() => {
                              setUserToDelete(row);
                              setDeleteOpen(true);
                            }}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No team members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog: Add User */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <form onSubmit={handleAddUser}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-foreground flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-primary" />
                Add Team Member
              </DialogTitle>
              <DialogDescription className="text-muted-foreground/70">
                Create a new login for your team. The user will be confirmed and activated immediately.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="add-name" className="text-foreground">Full Name</Label>
                <Input 
                  id="add-name" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-email" className="text-foreground">Email Address</Label>
                <Input 
                  id="add-email" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. john@company.com"
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-pass" className="text-foreground flex items-center gap-1.5">
                  <Key className="h-3.5 w-3.5 text-muted-foreground/60" />
                  Temporary Password
                </Label>
                <Input 
                  id="add-pass" 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="add-role" className="text-foreground">Access Role</Label>
                <select
                  id="add-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'admin' | 'agent')}
                  className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="agent">Agent (View, chat, and work on conversations)</option>
                  <option value="admin">Administrator (Full dashboard & settings access)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="bg-card border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding User...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Edit User */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <form onSubmit={handleEditUser}>
            <DialogHeader className="pb-4">
              <DialogTitle className="text-foreground">Edit User Profile</DialogTitle>
              <DialogDescription className="text-muted-foreground/70">
                Update access configuration and display credentials for {editingUser?.email}.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-name" className="text-foreground">Full Name</Label>
                <Input 
                  id="edit-name" 
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="bg-muted border-border text-foreground"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role" className="text-foreground">Access Role</Label>
                <select
                  id="edit-role"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'agent')}
                  className="h-9 w-full rounded-lg border border-border bg-muted px-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="agent">Agent (View, chat, and work on conversations)</option>
                  <option value="admin">Administrator (Full dashboard & settings access)</option>
                </select>
              </div>
            </div>

            <DialogFooter className="bg-card border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditOpen(false);
                  setEditingUser(null);
                }}
                className="border-border text-muted-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove Team Member
            </DialogTitle>
            <DialogDescription className="text-muted-foreground/75">
              Are you sure you want to delete <span className="font-semibold text-foreground">{userToDelete?.full_name || userToDelete?.email}</span>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <p className="text-sm text-muted-foreground leading-relaxed bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              This action is <strong className="text-destructive font-semibold">permanent</strong> and will delete their login credentials, account workspace permissions, and profile configurations. The user will be logged out and disabled immediately.
            </p>
          </div>

          <DialogFooter className="bg-card border-border pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteOpen(false);
                setUserToDelete(null);
              }}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={handleDeleteUser}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold"
            >
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                'Confirm Deletion'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
