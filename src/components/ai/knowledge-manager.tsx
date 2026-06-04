'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Calendar, 
  BookOpen,
  Power,
  PowerOff,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

export function KnowledgeManager() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<KnowledgeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');

  const supabase = createClient();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('business_knowledge')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Failed to load knowledge base');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleOpenModal = (item?: KnowledgeItem) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setContent(item.content);
      setIsActive(item.is_active);
      setExpiresAt(item.expires_at ? format(new Date(item.expires_at), "yyyy-MM-dd'T'HH:mm") : '');
    } else {
      setEditingItem(null);
      setTitle('');
      setContent('');
      setIsActive(true);
      setExpiresAt('');
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error('Title and content are required');
      return;
    }

    const payload = {
      title,
      content,
      is_active: isActive,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    let error;
    if (editingItem) {
      const { error: err } = await supabase
        .from('business_knowledge')
        .update(payload)
        .eq('id', editingItem.id);
      error = err;
    } else {
      const { data: profile } = await supabase.auth.getUser();
      const { data: profileData } = await supabase.from('profiles').select('business_id').eq('user_id', profile.user?.id).single();
      
      const { error: err } = await supabase
        .from('business_knowledge')
        .insert({ ...payload, business_id: profileData?.business_id });
      error = err;
    }

    if (error) {
      toast.error('Failed to save item');
    } else {
      toast.success(editingItem ? 'Item updated' : 'Item created');
      setIsModalOpen(false);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('business_knowledge')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Failed to delete item');
    } else {
      toast.success('Item deleted');
      fetchItems();
    }
    setIsDeleting(false);
    setIsDeleteModalOpen(false);
  };

  const toggleStatus = async (item: KnowledgeItem) => {
    const { error } = await supabase
      .from('business_knowledge')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (error) {
      toast.error('Failed to update status');
    } else {
      fetchItems();
    }
  };

  const filteredItems = items.filter(item => 
    item.title.toLowerCase().includes(search.toLowerCase()) || 
    item.content.toLowerCase().includes(search.toLowerCase())
  );

  const isExpired = (date: string | null) => {
    if (!date) return false;
    return new Date(date) < new Date();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input 
            placeholder="Search knowledge..." 
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => handleOpenModal()} className="sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Snippet
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-40 bg-muted" />
            </Card>
          ))
        ) : filteredItems.length === 0 ? (
          <Card className="col-span-full py-12 text-center">
            <CardContent className="space-y-3">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/20" />
              <div className="space-y-1">
                <p className="text-lg font-medium text-foreground">No knowledge snippets found</p>
                <p className="text-sm text-muted-foreground">Add information that you want the AI to know and use in its responses.</p>
              </div>
              <Button variant="outline" onClick={() => handleOpenModal()} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Create first snippet
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredItems.map((item) => {
            const expired = isExpired(item.expires_at);
            return (
              <Card key={item.id} className={cn(
                "group relative flex flex-col transition-all hover:border-primary/50",
                (!item.is_active || expired) && "opacity-60"
              )}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 text-base">{item.title}</CardTitle>
                    <Badge variant={item.is_active && !expired ? "default" : "secondary"}>
                      {expired ? "Expired" : item.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-3 h-12">
                    {item.content}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <div className="flex flex-col gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Created {format(new Date(item.created_at), 'MMM d, yyyy')}
                    </div>
                    {item.expires_at && (
                      <div className={cn("flex items-center gap-1.5", expired && "text-destructive font-medium")}>
                        <Calendar className="h-3 w-3" />
                        {expired ? 'Expired on' : 'Expires on'} {format(new Date(item.expires_at), 'MMM d, yyyy HH:mm')}
                      </div>
                    )}
                  </div>
                </CardContent>
                <div className="flex items-center justify-end gap-1 border-t border-border p-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => toggleStatus(item)}
                    title={item.is_active ? "Deactivate" : "Activate"}
                  >
                    {item.is_active ? <Power className="h-4 w-4 text-emerald-500" /> : <PowerOff className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => handleOpenModal(item)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setItemToDelete(item);
                      setIsDeleteModalOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Snippet' : 'Add Knowledge Snippet'}</DialogTitle>
            <DialogDescription>
              Information added here will be injected into the AI system prompt.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                placeholder="e.g. Summer Sale 2024" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Content</Label>
              <Textarea 
                id="content" 
                placeholder="Enter the information the AI should know..." 
                className="min-h-[120px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiry">Expiry Date (Optional)</Label>
              <Input 
                id="expiry" 
                type="datetime-local" 
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Item will be automatically ignored by AI after this date.
              </p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Status</Label>
                <p className="text-xs text-muted-foreground">Enable or disable this snippet manually.</p>
              </div>
              <Switch 
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingItem ? 'Update Snippet' : 'Create Snippet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        title="Delete Snippet"
        description={`Are you sure you want to delete "${itemToDelete?.title}"? This information will no longer be available to the AI assistant.`}
        confirmText="Delete"
        onConfirm={() => itemToDelete && handleDelete(itemToDelete.id)}
        variant="destructive"
        loading={isDeleting}
      />
    </div>
  );
}
