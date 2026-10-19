'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Settings, MessageSquare, Tag, User, Cpu, Blocks, Coins, Users, ClipboardList } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { WhatsAppConfig } from '@/components/settings/whatsapp-config';
import { TemplateManager } from '@/components/settings/template-manager';
import { TagManager } from '@/components/settings/tag-manager';
import { ProfileForm } from '@/components/settings/profile-form';
import { PasswordForm } from '@/components/settings/password-form';
import { SessionsCard } from '@/components/settings/sessions-card';
import { IntegrationsHub } from '@/components/settings/integrations-hub';
import { BillingPlan } from '@/components/settings/billing-plan';
import { UserManagement } from '@/components/settings/user-management';
import { TestSettings } from '@/components/settings/test-settings';
import { useAuth } from '@/hooks/use-auth';
import { canAccess } from '@/lib/permissions';

const TAB_VALUES = ['profile', 'whatsapp', 'templates', 'tags', 'integrations', 'billing', 'users', 'tests'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile } = useAuth();

  const showUserManagement = profile?.role === 'owner' || profile?.role === 'admin' || profile?.is_superadmin;
  const settingsEnabled = canAccess(profile?.permissions, 'settings', profile?.role);

  // The URL is the single source of truth for the active tab — no
  // local state, no sync effect. A previous revision duplicated this
  // into `useState` + a sync effect, which tripped React 19's
  // set-state-in-effect rule and was also redundant.
  const queryTab = searchParams.get('tab');
  const requestedTab = isTabValue(queryTab) ? queryTab : 'profile';
  // Agents without the Settings permission can only reach their own
  // profile tab; clamp the URL so business-config tabs are unreachable.
  const tab: TabValue =
    !settingsEnabled && requestedTab !== 'profile' ? 'profile' : requestedTab;

  const onChange = (next: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/settings?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your profile, WhatsApp® integration, message templates, and
          tags.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => onChange(v as TabValue)}>
        <TabsList className="bg-muted/40 border border-border/60 p-1.5 rounded-xl gap-1 overflow-x-auto scrollbar-hide max-w-full">
          <TabsTrigger
            value="profile"
            className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
          >
            <User className="size-4 text-sky-500 transition-transform duration-200 group-hover:scale-110" />
            Profile
          </TabsTrigger>
          {settingsEnabled && (
            <>
              <TabsTrigger
                value="whatsapp"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <Settings className="size-4 text-emerald-500 transition-transform duration-200 group-hover:scale-110" />
                WhatsApp Config
              </TabsTrigger>
              <TabsTrigger
                value="templates"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <MessageSquare className="size-4 text-indigo-500 transition-transform duration-200 group-hover:scale-110" />
                Templates
              </TabsTrigger>
              <TabsTrigger
                value="tags"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <Tag className="size-4 text-amber-500 transition-transform duration-200 group-hover:scale-110" />
                Tags
              </TabsTrigger>
              <TabsTrigger
                value="integrations"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <Blocks className="size-4 text-purple-500 transition-transform duration-200 group-hover:scale-110" />
                Integrations
              </TabsTrigger>
              <TabsTrigger
                value="billing"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <Coins className="size-4 text-amber-500 transition-transform duration-200 group-hover:scale-110" />
                Plan & Billing
              </TabsTrigger>
              <TabsTrigger
                value="tests"
                className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
              >
                <ClipboardList className="size-4 text-orange-500 transition-transform duration-200 group-hover:scale-110" />
                Tests
              </TabsTrigger>
            </>
          )}
          {showUserManagement && (
            <TabsTrigger
              value="users"
              className="group data-active:bg-card data-active:text-foreground data-active:shadow-sm data-active:border-border/60 text-muted-foreground hover:text-foreground hover:bg-card/50 transition-all rounded-lg px-3 py-1.5"
            >
              <Users className="size-4 text-blue-500 transition-transform duration-200 group-hover:scale-110" />
              Users
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileForm />
          <PasswordForm />
          <SessionsCard />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppConfig />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateManager />
        </TabsContent>

        <TabsContent value="tags">
          <TagManager />
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationsHub />
        </TabsContent>

        <TabsContent value="billing">
          <BillingPlan />
        </TabsContent>

        <TabsContent value="tests">
          <TestSettings />
        </TabsContent>

        {showUserManagement && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

