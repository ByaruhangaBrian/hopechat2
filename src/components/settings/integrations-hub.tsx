'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TableProperties, Calendar, ShoppingCart, ArrowRight } from 'lucide-react';
import { GoogleSheetsForm } from './google-sheets-form';

export function IntegrationsHub() {
  const [activeIntegration, setActiveIntegration] = useState<string | null>(null);

  if (activeIntegration === 'google_sheets') {
    return (
      <div className="space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => setActiveIntegration(null)}
          className="text-slate-400 hover:text-white"
        >
          ← Back to Integrations
        </Button>
        <GoogleSheetsForm />
      </div>
    );
  }

  const integrations = [
    {
      id: 'google_sheets',
      name: 'Google Sheets',
      description: 'Use spreadsheets as a database for inventory, pricing, and order status.',
      icon: TableProperties,
      iconColor: 'text-emerald-500',
      status: 'Available',
    },
    {
      id: 'calendly',
      name: 'Calendly',
      description: 'Allow customers to book appointments directly via WhatsApp.',
      icon: Calendar,
      iconColor: 'text-blue-500',
      status: 'Coming Soon',
    },
    {
      id: 'shopify',
      name: 'Shopify',
      description: 'Sync customers and orders to send automated tracking updates.',
      icon: ShoppingCart,
      iconColor: 'text-lime-500',
      status: 'Coming Soon',
    },
  ];

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {integrations.map((int) => {
        const Icon = int.icon;
        const isComingSoon = int.status === 'Coming Soon';

        return (
          <Card key={int.id} className="bg-slate-900 border-slate-800 flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg bg-slate-800 ${int.iconColor}`}>
                  <Icon className="size-6" />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  isComingSoon ? 'bg-slate-800 text-slate-500' : 'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {int.status}
                </span>
              </div>
              <CardTitle className="text-white text-lg">{int.name}</CardTitle>
              <CardDescription className="text-slate-400 text-sm leading-relaxed">
                {int.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto pt-0">
              <Button 
                className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                disabled={isComingSoon}
                onClick={() => setActiveIntegration(int.id)}
              >
                {isComingSoon ? 'Notify Me' : 'Configure'}
                {!isComingSoon && <ArrowRight className="ml-2 size-4" />}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
