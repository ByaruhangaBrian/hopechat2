import { supabaseAdmin } from '@/lib/automations/admin-client';
import { decrypt } from '@/lib/whatsapp/encryption';
import { sendInteractiveMessage, sendTextMessage } from '@/lib/whatsapp/meta-api';
import { sanitizePhoneForMeta } from '@/lib/whatsapp/phone-utils';
import { logHttpEvent } from '@/lib/logs/http-logs';
import { WorkflowNode, NodeOption } from '@/types';

export interface DispatchNodeArgs {
  businessId: string;
  contactId: string;
  nodeId: string;
}

export interface NodeInteractionResult {
  handled: boolean;
  currentNodeId?: string | null;
  nextNodeId?: string | null;
  completed?: boolean;
  isQuestion?: boolean;
  isCorrect?: boolean;
  score?: number;
  message?: string;
}

/**
 * Dispatches a Workflow Node as a WhatsApp Interactive Message (Button or List)
 */
export async function dispatchWorkflowNode(args: DispatchNodeArgs): Promise<{ success: boolean; whatsapp_message_id?: string; error?: string }> {
  const db = supabaseAdmin();
  const { businessId, contactId, nodeId } = args;

  try {
    // 1. Fetch Node and its options
    const { data: node, error: nodeError } = await db
      .from('workflow_nodes')
      .select('*, options:node_options(*)')
      .eq('id', nodeId)
      .eq('business_id', businessId)
      .single();

    if (nodeError || !node) {
      console.error('[workflow-runtime] Node not found:', nodeId, nodeError);
      return { success: false, error: 'Workflow node not found' };
    }

    const options: NodeOption[] = (node.options || []).sort(
      (a: any, b: any) => (a.position ?? 0) - (b.position ?? 0)
    );

    // 2. Fetch Contact
    const { data: contact, error: contactError } = await db
      .from('contacts')
      .select('id, phone, name')
      .eq('id', contactId)
      .single();

    if (contactError || !contact?.phone) {
      console.error('[workflow-runtime] Contact not found:', contactId);
      return { success: false, error: 'Contact phone not found' };
    }

    // 3. Fetch WhatsApp Config
    const { data: config, error: configError } = await db
      .from('whatsapp_config')
      .select('phone_number_id, access_token, user_id')
      .eq('business_id', businessId)
      .maybeSingle();

    if (configError || !config) {
      console.error('[workflow-runtime] WhatsApp config missing for business:', businessId);
      return { success: false, error: 'WhatsApp not configured' };
    }

    const accessToken = decrypt(config.access_token);
    const sanitizedPhone = sanitizePhoneForMeta(contact.phone);

    // 4. Resolve or create conversation
    let { data: conv } = await db
      .from('conversations')
      .select('id')
      .eq('business_id', businessId)
      .eq('contact_id', contactId)
      .maybeSingle();

    if (!conv) {
      const { data: newConv } = await db
        .from('conversations')
        .insert({
          business_id: businessId,
          user_id: config.user_id,
          contact_id: contactId,
          ai_enabled: true,
        })
        .select('id')
        .single();
      conv = newConv;
    }

    const conversationId = conv?.id;

    // 5. Send via Meta
    let whatsappMessageId = '';
    const isButtons = options.length <= 3;
    const maxChars = isButtons ? 20 : 24;

    if (options.length === 0) {
      // Fallback to text message if node has no interactive options
      const sendRes = await sendTextMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: sanitizedPhone,
        text: node.body_text,
      });
      whatsappMessageId = sendRes.messageId;
    } else {
      // Format items with Meta character limit compliance
      const items = options.slice(0, 10).map((opt) => ({
        id: opt.option_id,
        label: opt.label.slice(0, maxChars),
      }));

      const sendRes = await sendInteractiveMessage({
        phoneNumberId: config.phone_number_id,
        accessToken,
        to: sanitizedPhone,
        header: node.header_text || undefined,
        body: node.body_text,
        footer: node.footer_text || undefined,
        items,
      });
      whatsappMessageId = sendRes.messageId;
    }

    // 6. Record sent message in messages table
    if (conversationId) {
      await db.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'bot',
        content_type: options.length > 0 ? 'interactive' : 'text',
        content_text: node.body_text,
        message_id: whatsappMessageId,
        status: 'sent',
      });

      await db.from('conversations').update({
        last_message_text: `[Menu: ${node.title}]`,
        last_message_at: new Date().toISOString(),
      }).eq('id', conversationId);
    }

    // 7. Upsert user_sessions state
    await db.from('user_sessions').upsert(
      {
        business_id: businessId,
        contact_id: contactId,
        current_node_id: node.id,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,contact_id' }
    );

    void logHttpEvent({
      userId: config.user_id,
      businessId,
      direction: 'outgoing',
      service: 'workflow-nodes',
      endpoint: 'dispatch',
      payload: { stage: 'node_dispatched', node_id: node.id, node_key: node.node_key, message_id: whatsappMessageId },
      note: 'workflow_node_dispatched',
    });

    return { success: true, whatsapp_message_id: whatsappMessageId };
  } catch (err: any) {
    console.error('[workflow-runtime] Dispatch failed:', err);
    return { success: false, error: err.message || 'Dispatch error' };
  }
}

/**
 * Handles incoming option selection (from quick reply button or list menu item)
 */
export async function handleNodeInteraction(
  businessId: string,
  contactId: string,
  selectedOptionId: string
): Promise<NodeInteractionResult> {
  const db = supabaseAdmin();

  // 1. Fetch current user session
  const { data: session } = await db
    .from('user_sessions')
    .select('*')
    .eq('business_id', businessId)
    .eq('contact_id', contactId)
    .maybeSingle();

  let currentNode: WorkflowNode | null = null;
  let matchedOption: NodeOption | null = null;

  if (session?.current_node_id) {
    const { data: node } = await db
      .from('workflow_nodes')
      .select('*, options:node_options(*)')
      .eq('id', session.current_node_id)
      .eq('business_id', businessId)
      .maybeSingle();

    if (node) {
      currentNode = node;
      matchedOption = (node.options || []).find((opt: NodeOption) => opt.option_id === selectedOptionId) || null;
    }
  }

  // Fallback: If not in active node session, lookup any node option matching selectedOptionId
  if (!matchedOption) {
    const { data: opt } = await db
      .from('node_options')
      .select('*, workflow_nodes!inner(*)')
      .eq('option_id', selectedOptionId)
      .eq('workflow_nodes.business_id', businessId)
      .maybeSingle();

    if (opt) {
      matchedOption = opt;
      currentNode = (opt as any).workflow_nodes;
    }
  }

  if (!matchedOption || !currentNode) {
    // Unmapped interaction - caller can fall back to standard text or Gemini AI
    return { handled: false };
  }

  // 2. Question / Assessment scoring
  let newScore = session?.quiz_score ?? 0;
  const isQuestion = currentNode.node_type === 'question';
  const isCorrect = Boolean(matchedOption.is_correct_answer);

  if (isQuestion && isCorrect) {
    const pointsAwarded = matchedOption.points > 0 ? matchedOption.points : 10;
    newScore += pointsAwarded;
  }

  const sessionData = (session?.session_data as Record<string, unknown>) || {};
  const answers = Array.isArray(sessionData.answers) ? [...sessionData.answers] : [];
  answers.push({
    node_id: currentNode.id,
    node_key: currentNode.node_key,
    selected_option_id: selectedOptionId,
    selected_label: matchedOption.label,
    is_correct: isCorrect,
    points: isCorrect ? (matchedOption.points || 10) : 0,
    answered_at: new Date().toISOString(),
  });
  sessionData.answers = answers;

  // 3. Transition to next node if specified
  const nextNodeId = matchedOption.next_node_id;

  if (nextNodeId) {
    // Update session with new node and score
    await db.from('user_sessions').upsert(
      {
        business_id: businessId,
        contact_id: contactId,
        current_node_id: nextNodeId,
        quiz_score: newScore,
        session_data: sessionData,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,contact_id' }
    );

    // Auto-dispatch next screen
    await dispatchWorkflowNode({
      businessId,
      contactId,
      nodeId: nextNodeId,
    });

    return {
      handled: true,
      currentNodeId: currentNode.id,
      nextNodeId,
      completed: false,
      isQuestion,
      isCorrect,
      score: newScore,
    };
  } else {
    // Terminal Node (Quiz finished or subscreen completed)
    await db.from('user_sessions').upsert(
      {
        business_id: businessId,
        contact_id: contactId,
        current_node_id: null,
        quiz_score: newScore,
        session_data: sessionData,
        last_interaction_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'business_id,contact_id' }
    );

    // If it was a quiz/question bank, send completion score message
    if (isQuestion) {
      const { data: config } = await db
        .from('whatsapp_config')
        .select('phone_number_id, access_token')
        .eq('business_id', businessId)
        .maybeSingle();

      const { data: contact } = await db
        .from('contacts')
        .select('phone')
        .eq('id', contactId)
        .maybeSingle();

      if (config && contact) {
        const accessToken = decrypt(config.access_token);
        const completionText = `🎉 *Assessment Complete!*\n\n` +
          `Your final score is *${newScore} points*.\n` +
          `Thank you for completing this assessment!`;

        await sendTextMessage({
          phoneNumberId: config.phone_number_id,
          accessToken,
          to: sanitizePhoneForMeta(contact.phone),
          text: completionText,
        });
      }
    }

    return {
      handled: true,
      currentNodeId: currentNode.id,
      nextNodeId: null,
      completed: true,
      isQuestion,
      isCorrect,
      score: newScore,
    };
  }
}
