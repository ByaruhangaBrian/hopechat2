import {
  DocPage,
  DocSection,
  DocParagraph,
  DocList,
  DocSteps,
  DocCallout,
  DocNext,
} from "@/components/docs/doc-content";

export default function DocsTeamPage() {
  return (
    <DocPage
      title="Team & permissions"
      subtitle="Invite team members to your workspace and control what each role can see and do."
    >
      <DocSection title="How it works">
        <DocParagraph>
          Every HopeChat workspace has at least one <b>owner</b> — the person who created the
          account. Owners and <b>admins</b> have full access. <b>Agents</b> can handle the inbox,
          contacts, and broadcasts, but don&apos;t see billing or business settings by default.
        </DocParagraph>
        <DocCallout type="note">
          Your plan limits how many seats (team members) your workspace can have. Bronze includes
          1 seat, Silver 5, Gold 15. Upgrade your plan from Settings → Billing to add more.
        </DocCallout>
      </DocSection>

      <DocSection title="Add a team member">
        <DocSteps
          steps={[
            {
              title: "Open Users",
              body: (
                <DocParagraph>
                  Go to <b>Settings → Users</b> (the tab is only visible to owners and admins).
                </DocParagraph>
              ),
            },
            {
              title: "Click Add User",
              body: (
                <DocParagraph>
                  Enter their full name, email, and a temporary password. Choose their role:{" "}
                  <b>admin</b> (full access) or <b>agent</b> (inbox + contacts by default).
                </DocParagraph>
              ),
            },
            {
              title: "Set permissions",
              body: (
                <DocParagraph>
                  If you need a more granular setup, expand <b>Custom Permissions</b> before saving.
                  You can toggle access to the inbox, contacts, broadcasts, pipelines, automations,
                  settings, and billing individually.
                </DocParagraph>
              ),
            },
          ]}
        />
        <DocParagraph>
          The new user can log in immediately with the email and password you provided.
        </DocParagraph>
      </DocSection>

      <DocSection title="Edit or remove a member">
        <DocList
          items={[
            <span key="1">
              <b>Edit</b> — click the pencil icon next to a user to change their role or fine-tune
              their permissions.
            </span>,
            <span key="2">
              <b>Remove</b> — click the trash icon to revoke access instantly. They will be logged
              out on next refresh.
            </span>,
          ]}
        />
      </DocSection>

      <DocSection title="Roles at a glance">
        <DocList
          items={[
            <span key="1">
              <b>Owner</b> — full access, can delete the workspace, cannot be removed by others.
            </span>,
            <span key="2">
              <b>Admin</b> — full access to all features and settings.
            </span>,
            <span key="3">
              <b>Agent</b> — default access to inbox, contacts, and other features you choose. Does
              not see billing or business settings unless you toggle them on.
            </span>,
          ]}
        />
      </DocSection>

      <DocCallout type="tip">
        The agent count in Settings → Users matches your plan limit. Hit the cap? Upgrade from
        Settings → Billing (Bronze → Silver → Gold) and you get more seats immediately.
      </DocCallout>

      <DocNext
        href="/docs/templates"
        title="Message templates"
        description="Create Meta-approved templates for broadcasts and automation replies."
      />
    </DocPage>
  );
}