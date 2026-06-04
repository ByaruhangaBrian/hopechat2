'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Cpu, BookOpen } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AiConfig } from '@/components/ai/ai-config';
import { KnowledgeManager } from '@/components/ai/knowledge-manager';

const TAB_VALUES = ['config', 'knowledge'] as const;
type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(v: string | null): v is TabValue {
  return !!v && (TAB_VALUES as readonly string[]).includes(v);
}

export default function AiHubPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryTab = searchParams.get('tab');
  const tab: TabValue = isTabValue(queryTab) ? queryTab : 'config';

  const onChange = (next: TabValue) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/ai?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Hub</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure your AI assistant and manage dynamic knowledge snippets.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => onChange(v as TabValue)}>
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="config"
            className="data-active:bg-muted data-active:text-primary text-muted-foreground"
          >
            <Cpu className="size-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger
            value="knowledge"
            className="data-active:bg-muted data-active:text-primary text-muted-foreground"
          >
            <BookOpen className="size-4" />
            Knowledge Base
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-6">
          <AiConfig />
        </TabsContent>

        <TabsContent value="knowledge" className="mt-6">
          <KnowledgeManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}
