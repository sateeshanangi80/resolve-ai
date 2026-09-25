import './App.css'

function App() {
  return (
    <main className="app">
      <nav className="navbar">
        <a className="brand" href="/">
          <div className="brand-icon">R</div>
          <span>
            Resolve<span>AI</span>
          </span>
        </a>

        <div className="nav-links">
          <a href="#features">Features</a>
          <a href="#architecture">Architecture</a>
          <a href="#about">About</a>
        </div>

        <button className="login-button">Sign In</button>
      </nav>

      <section className="hero-section">
        <div className="hero-content">
          <div className="badge">
            <span className="badge-dot"></span>
            AI-Powered Support Platform
          </div>

          <h1>
            Resolve customer issues
            <span> smarter with AI.</span>
          </h1>

          <p className="hero-description">
            ResolveAI is an intelligent customer support and incident management
            platform that helps teams manage tickets, automate repetitive work
            and resolve customer problems faster.
          </p>

          <div className="hero-actions">
            <button className="primary-button">
              Get Started
              <span>→</span>
            </button>

            <a
              href="https://github.com/sateeshanangi80/resolve-ai"
              target="_blank"
              rel="noreferrer"
              className="secondary-button"
            >
              View on GitHub
            </a>
          </div>

          <div className="tech-stack">
            <span>Built with</span>

            <div className="tech-items">
              <span>React</span>
              <span>Node.js</span>
              <span>Express</span>
              <span>MongoDB</span>
              <span>FastAPI</span>
            </div>
          </div>
        </div>

        <div className="hero-visual">
          <div className="dashboard-card">
            <div className="dashboard-header">
              <div>
                <p>Support Dashboard</p>
                <span>AI-assisted ticket management</span>
              </div>

              <div className="online">
                <span></span>
                Live
              </div>
            </div>

            <div className="stats">
              <div className="stat-card">
                <span>Open Tickets</span>
                <strong>24</strong>
                <small>+4 today</small>
              </div>

              <div className="stat-card">
                <span>Resolved</span>
                <strong>128</strong>
                <small>92% success</small>
              </div>

              <div className="stat-card">
                <span>AI Assisted</span>
                <strong>86%</strong>
                <small>of tickets</small>
              </div>
            </div>

            <div className="ticket-card">
              <div className="ticket-top">
                <div className="ticket-icon">₹</div>

                <div className="ticket-info">
                  <strong>Payment deducted but plan inactive</strong>
                  <span>Ticket #RA-1024</span>
                </div>

                <span className="priority">HIGH</span>
              </div>

              <div className="ai-box">
                <div className="ai-title">
                  <div className="ai-icon">✦</div>
                  AI Analysis
                </div>

                <div className="analysis-row">
                  <span>Category</span>
                  <strong>Billing</strong>
                </div>

                <div className="analysis-row">
                  <span>Suggested Team</span>
                  <strong>Billing Support</strong>
                </div>

                <div className="analysis-row">
                  <span>Sentiment</span>
                  <strong>Frustrated</strong>
                </div>
              </div>

              <div className="ticket-footer">
                <div className="avatar">SA</div>

                <div>
                  <strong>Assigned to Support Agent</strong>
                  <span>AI generated a suggested response</span>
                </div>

                <button>View Ticket</button>
              </div>
            </div>
          </div>

          <div className="floating-card ai-floating">
            <div className="floating-icon">✦</div>
            <div>
              <strong>AI Assistant</strong>
              <span>Ticket classified automatically</span>
            </div>
          </div>

          <div className="floating-card status-floating">
            <div className="success-icon">✓</div>
            <div>
              <strong>Issue Resolved</strong>
              <span>Just now</span>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <div>
          <strong>Smart Ticket Management</strong>
          <span>
            Create, assign, track and resolve customer support tickets.
          </span>
        </div>

        <div>
          <strong>AI Assistance</strong>
          <span>
            Automatically summarize, classify and prioritize customer issues.
          </span>
        </div>

        <div>
          <strong>Real-Time Updates</strong>
          <span>
            Keep customers and agents synchronized with live ticket updates.
          </span>
        </div>

        <div>
          <strong>Knowledge Intelligence</strong>
          <span>
            Use RAG to answer questions using company documentation.
          </span>
        </div>
      </section>
    </main>
  )
}

export default App