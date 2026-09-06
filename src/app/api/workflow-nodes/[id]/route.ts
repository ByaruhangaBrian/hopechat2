import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/automations/admin-client';
import { WorkflowNodeType } from '@/types';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    let { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) {
      const { data: adminProfile } = await admin
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = adminProfile;
    }

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 400 });
    }

    const { data: node, error } = await supabase
      .from('workflow_nodes')
      .select(`
        *,
        options:node_options!node_options_node_id_fkey(*)
      `)
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .single();

    if (error || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const formatted = {
      ...node,
      options: (node.options || []).sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
    };

    return NextResponse.json({ node: formatted });
  } catch (err: any) {
    console.error('[workflow-nodes/[id]] GET error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    let { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) {
      const { data: adminProfile } = await admin
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = adminProfile;
    }

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    // Verify ownership
    const { data: existing, error: findError } = await admin
      .from('workflow_nodes')
      .select('id, business_id')
      .eq('id', id)
      .eq('business_id', profile.business_id)
      .maybeSingle();

    if (findError || !existing) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const updateFields: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if ('title' in body) updateFields.title = String(body.title).trim();
    if ('node_key' in body) updateFields.node_key = String(body.node_key).trim();
    if ('node_type' in body) {
      const validTypes: WorkflowNodeType[] = ['menu', 'question', 'form', 'action'];
      if (!validTypes.includes(body.node_type)) {
        return NextResponse.json({ error: 'Invalid node_type' }, { status: 400 });
      }
      updateFields.node_type = body.node_type;
    }
    if ('parent_node_id' in body) updateFields.parent_node_id = body.parent_node_id || null;
    if ('header_text' in body) updateFields.header_text = body.header_text ? String(body.header_text).trim() : null;
    if ('body_text' in body) updateFields.body_text = String(body.body_text).trim();
    if ('footer_text' in body) updateFields.footer_text = body.footer_text ? String(body.footer_text).trim() : null;
    if ('metadata' in body) updateFields.metadata = body.metadata;
    if ('level' in body && typeof body.level === 'number') updateFields.level = body.level;

    // Validate options if provided
    if (Array.isArray(body.options)) {
      if (body.options.length > 10) {
        return NextResponse.json({ error: 'Maximum 10 options allowed per node' }, { status: 400 });
      }
      const isButtons = body.options.length <= 3;
      const maxLabelLength = isButtons ? 20 : 24;

      for (let i = 0; i < body.options.length; i++) {
        const opt = body.options[i];
        if (!opt.label || typeof opt.label !== 'string') {
          return NextResponse.json({ error: `Option at position ${i + 1} requires a label` }, { status: 400 });
        }
        if (opt.label.length > maxLabelLength) {
          return NextResponse.json({
            error: `Option "${opt.label}" exceeds Meta limit of ${maxLabelLength} chars`
          }, { status: 400 });
        }
      }
    }

    const { data: updatedNode, error: updateError } = await admin
      .from('workflow_nodes')
      .update(updateFields)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedNode) {
      console.error('[workflow-nodes/[id]] Update error:', updateError);
      return NextResponse.json({ error: updateError?.message || 'Update failed' }, { status: 500 });
    }

    // Replace options if options array was included
    let updatedOptions: any[] = [];
    if (Array.isArray(body.options)) {
      // Delete old options
      await admin.from('node_options').delete().eq('node_id', id);

      if (body.options.length > 0) {
        const optionsRows = body.options.map((opt: any, index: number) => ({
          node_id: id,
          option_id: opt.option_id ? String(opt.option_id).trim() : `opt_${index + 1}`,
          label: String(opt.label).trim(),
          description: opt.description ? String(opt.description).trim() : null,
          next_node_id: opt.next_node_id || null,
          is_correct_answer: Boolean(opt.is_correct_answer),
          points: typeof opt.points === 'number' ? opt.points : (opt.is_correct_answer ? 10 : 0),
          position: typeof opt.position === 'number' ? opt.position : index,
        }));

        const { data: insertedOpts } = await admin
          .from('node_options')
          .insert(optionsRows)
          .select();
        updatedOptions = insertedOpts || [];
      }
    } else {
      const { data: currentOpts } = await admin
        .from('node_options')
        .select('*')
        .eq('node_id', id)
        .order('position', { ascending: true });
      updatedOptions = currentOpts || [];
    }

    return NextResponse.json({
      node: {
        ...updatedNode,
        options: updatedOptions.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)),
      }
    });
  } catch (err: any) {
    console.error('[workflow-nodes/[id]] PATCH error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = supabaseAdmin();
    let { data: profile } = await supabase
      .from('profiles')
      .select('business_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile?.business_id) {
      const { data: adminProfile } = await admin
        .from('profiles')
        .select('business_id')
        .eq('user_id', user.id)
        .maybeSingle();
      profile = adminProfile;
    }

    if (!profile?.business_id) {
      return NextResponse.json({ error: 'Business not found' }, { status: 400 });
    }

    // 1. Unlink any parent options pointing to this node as their next destination
    await admin
      .from('node_options')
      .update({ next_node_id: null })
      .eq('next_node_id', id);

    // 2. Unlink any child nodes having this node as parent
    await admin
      .from('workflow_nodes')
      .update({ parent_node_id: null })
      .eq('parent_node_id', id)
      .eq('business_id', profile.business_id);

    // 3. Clear active user sessions on this node
    await admin
      .from('user_sessions')
      .update({ current_node_id: null })
      .eq('current_node_id', id)
      .eq('business_id', profile.business_id);

    // 4. Delete the workflow node (cascades to delete its own options)
    const { error } = await admin
      .from('workflow_nodes')
      .delete()
      .eq('id', id)
      .eq('business_id', profile.business_id);

    if (error) {
      console.error('[workflow-nodes/[id]] DELETE error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[workflow-nodes/[id]] DELETE error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
