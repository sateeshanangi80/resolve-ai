import { rolePaths } from '../navigation';
import type { SessionUser } from '../App';
import Brand from './Brand';
export default function PublicHome({ user }: {
    user: SessionUser | null;
}) {
    return <div className="public-site">
    <header className="public-nav"><Brand /><nav aria-label="Website navigation"><a href="#/login/customer">Customer portal</a><a href="#/login/support">Support portal</a><a href="#/login/admin">Admin portal</a></nav><a className="button button-primary" href={user ? `#${rolePaths[user.role]}` : '#/register'}>{user ? 'Open my panel' : 'Get started'}</a></header>
    <main>
      <section className="public-hero"><div><span className="eyebrow">A CONNECTED SUPPORT EXPERIENCE</span><h1>One place.<br />Every request.<br /><em>The right people.</em></h1><p>Connect customers, support agents, and administrators in one focused workspace. From the first request to the final resolution.</p><div className="public-actions"><a className="button button-primary" href="#/register">Create a customer account</a><a className="button button-secondary" href="#/login/admin">Manage your team</a></div><div className="public-proof"><span>Role-based workspaces</span><span>Clear ownership</span><span>Trackable progress</span></div></div><div className="workflow-preview"><span className="eyebrow">HOW SUPPORT FLOWS</span><h2>Clarity at every step.</h2>{[['01', 'A customer raises a request', 'Capture the issue, category, and priority.'], ['02', 'An admin connects the right agent', 'Assign ownership and keep the queue organized.'], ['03', 'Support moves it forward', 'Update progress and resolve the issue.'], ['04', 'The customer stays informed', 'Follow the current status from their own panel.']].map(([n, title, body]) => <div className="workflow-step" key={n}><span>{n}</span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></section>
      <section className="portal-section"><div className="section-intro"><span className="eyebrow">THREE PANELS. ONE CONNECTED WEBSITE.</span><h2>A workspace for every role.</h2><p>Choose where you work. Your account determines your access.</p></div><div className="portal-grid">{[
            { id: 'customer', number: '01', title: 'Customer panel', description: 'A direct line to better support.', items: ['Create and track your requests', 'Search your ticket history', 'View progress and assignment'], action: 'Open customer portal' },
            { id: 'support', number: '02', title: 'Support panel', description: 'Focus on the work assigned to you.', items: ['Your personal queue and overview', 'Read customer issue details', 'Update status through resolution'], action: 'Open support portal' },
            { id: 'admin', number: '03', title: 'Admin panel', description: 'Bring your people and requests together.', items: ['Monitor the entire support queue', 'Invite people and manage access', 'Assign, edit, and manage tickets'], action: 'Open admin portal' },
        ].map(panel => <article className="portal-card" key={panel.id}><span className="portal-number">{panel.number}</span><h3>{panel.title}</h3><p>{panel.description}</p><ul>{panel.items.map(item => <li key={item}>{item}</li>)}</ul><a href={`#/login/${panel.id}`}>{panel.action} <span aria-hidden="true">&rarr;</span></a></article>)}</div></section>
      <section className="public-cta"><div><h2>Make your next support day clearer.</h2><p>Customers can sign up. Team members join through an administrator invitation.</p></div><a href="#/register" className="button button-primary">Start with a request</a></section>
    </main><footer className="public-footer"><span>ResolveAI &middot; Support, thoughtfully organized.</span><a href="#/setup">First administrator setup</a></footer>
  </div>;
}
