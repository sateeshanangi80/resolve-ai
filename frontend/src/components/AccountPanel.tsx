import { useEffect, useState } from 'react';
import type { SessionUser } from '../App';
import { apiRequest } from '../api';
import { panelPath, roleLabels } from '../navigation';

const accountContent = {
  Admin: {
    panel: 'Admin panel',
    description: 'Manage your workspace, people, and support operations.',
    heading: 'Your administrator access',
    guidance: 'You can manage every ticket, assign support agents, invite people, and manage customer or agent access.',
    action: 'Manage people & access',
    target: '/people',
  },
  SupportAgent: {
    panel: 'Support panel',
    description: 'Your profile and assigned support responsibilities.',
    heading: 'Your support access',
    guidance: 'You can review tickets assigned to you and update their status as you work toward a resolution.',
    action: 'Open my queue',
    target: '/tickets',
  },
  Customer: {
    panel: 'Customer panel',
    description: 'Your profile and customer support access.',
    heading: 'Your customer access',
    guidance: 'You can create support requests, view your ticket history, and follow the progress of your own requests.',
    action: 'View my requests',
    target: '/tickets',
  },
};

export default function AccountPanel({ user }: { user: SessionUser }) {
  const content = accountContent[user.role];
  const [ownerSetupAvailable, setOwnerSetupAvailable] = useState(false);
  useEffect(() => {
    if (user.role !== 'Customer') return;
    const controller = new AbortController();
    apiRequest<{ data: { hasAdmin: boolean; setupEnabled: boolean } }>('/api/portal/setup', { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) setOwnerSetupAvailable(!result.data.hasAdmin && result.data.setupEnabled); })
      .catch(() => { /* Optional owner setup guidance must not block the account screen. */ });
    return () => controller.abort();
  }, [user.role]);
  return <section className="account-panel">
    <span className="eyebrow">YOUR PROFILE</span><h1>My account</h1><p>{content.description}</p>
    <dl><dt>Name</dt><dd>{user.name}</dd><dt>Email</dt><dd>{user.email}</dd><dt>Role</dt><dd>{roleLabels[user.role]}</dd><dt>Panel</dt><dd>{content.panel}</dd></dl>
    <div className="account-access"><h2>{content.heading}</h2><p>{content.guidance}</p><a className="button button-primary" href={`#${panelPath(user)}${content.target}`}>{content.action}</a></div>
    {ownerSetupAvailable && <div className="account-setup-note"><h2>Setting up this workspace?</h2><p>No administrator has been configured yet. If you own this workspace, complete the protected setup using your owner key and account password.</p><a className="button button-secondary" href="#/setup">Complete administrator setup</a></div>}
  </section>;
}
