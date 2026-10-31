import { useState } from "react";

interface CreateTicketProps {
  onCreated: () => void;
}

interface TicketForm {
  title: string;
  description: string;
  category: string;
  priority: "Low" | "Medium" | "High";
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function CreateTicket({ onCreated }: CreateTicketProps) {
  const [isOpen, setIsOpen] = useState(false);

  const [form, setForm] = useState<TicketForm>({
    title: "",
    description: "",
    category: "General",
    priority: "Medium",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create ticket");
      }

      setForm({
        title: "",
        description: "",
        category: "General",
        priority: "Medium",
      });

      setIsOpen(false);

      // Refresh GET /api/tickets
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="create-ticket-button"
        onClick={() => setIsOpen(true)}
      >
        + Create Ticket
      </button>

      {isOpen && (
        <div className="ticket-modal-overlay">
          <div className="ticket-modal">
            <div className="ticket-modal-header">
              <div>
                <span>NEW SUPPORT REQUEST</span>
                <h2>Create Ticket</h2>
              </div>

              <button
                type="button"
                className="close-button"
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title</label>

                <input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Example: Payment deducted but plan inactive"
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea
                  id="description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Explain the issue..."
                  rows={5}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>

                  <select
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    <option value="General">General</option>

                    <option value="Billing">Billing</option>

                    <option value="Technical">Technical</option>

                    <option value="Account">Account</option>

                    <option value="Subscription">Subscription</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>

                  <select
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>

                    <option value="Medium">Medium</option>

                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="ticket-modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="submit-ticket-button"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default CreateTicket;
