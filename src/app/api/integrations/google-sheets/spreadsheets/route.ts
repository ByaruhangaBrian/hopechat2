import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('business_spreadsheets')
      .select('*')
      .eq('business_id', profile.business_id)
      .order('name');

    if (error) throw error;

    return NextResponse.json({ spreadsheets: data || [] });
  } catch (err) {
    console.error('[spreadsheets] GET failed:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await req.json();
    const { name, description, spreadsheet_id, sheet_name, reference_column, return_columns } = body;

    if (!name || !name.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    if (!spreadsheet_id || !spreadsheet_id.trim()) return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    if (!reference_column || !reference_column.trim()) return NextResponse.json({ error: 'Reference column is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('business_spreadsheets')
      .insert({
        business_id: profile.business_id,
        name: name.trim(),
        description: description?.trim() || null,
        spreadsheet_id: spreadsheet_id.trim(),
        sheet_name: sheet_name?.trim() || 'Sheet1',
        reference_column: reference_column.trim(),
        return_columns: return_columns?.trim() || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ spreadsheet: data });
  } catch (err: any) {
    console.error('[spreadsheets] POST failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const body = await req.json();
    const { id, name, description, spreadsheet_id, sheet_name, reference_column, return_columns, is_enabled } = body;

    if (!id) return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });

    const updateData: Record<string, any> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (spreadsheet_id !== undefined) updateData.spreadsheet_id = spreadsheet_id.trim();
    if (sheet_name !== undefined) updateData.sheet_name = sheet_name.trim();
    if (reference_column !== undefined) updateData.reference_column = reference_column.trim();
    if (return_columns !== undefined) updateData.return_columns = return_columns?.trim() || null;
    if (is_enabled !== undefined) updateData.is_enabled = is_enabled;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('business_spreadsheets')
      .update(updateData)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ spreadsheet: data });
  } catch (err: any) {
    console.error('[spreadsheets] PUT failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) return NextResponse.json({ error: 'Business not found' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });

    const { error } = await supabase
      .from('business_spreadsheets')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[spreadsheets] DELETE failed:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
