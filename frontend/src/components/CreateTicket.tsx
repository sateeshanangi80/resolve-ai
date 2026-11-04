import { ApiError, apiRequest } from "../api";
import Modal from "./Modal";
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFieldErrors(previous => ({ ...previous, [name]: '' }));

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const issues: Record<string, string> = {};
    if (form.title.trim().length < 3) issues.title = 'Title must contain at least 3 characters.';
    if (form.description.trim().length < 10) issues.description = 'Description must contain at least 10 characters.';
    setFieldErrors(issues);
    if (Object.keys(issues).length) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      await apiRequest('/api/tickets', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...form, title: form.title.trim(), description: form.description.trim() }),
      });

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
      if (err instanceof ApiError) setFieldErrors(Object.fromEntries(err.issues.map(issue => [issue.field, issue.message])));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="button button-primary"
        onClick={() => { setError(''); setFieldErrors({}); setIsOpen(true); }}
      >
        + Create Ticket
      </button>

      {isOpen && (
        <Modal titleId="create-ticket-title" onClose={() => setIsOpen(false)} busy={loading}>
            <div className="modal-header">
              <div>
                <span>NEW SUPPORT REQUEST</span>
                <h2 id="create-ticket-title">Create Ticket</h2>
              </div>

              <button
                type="button"
                className="close-button"
                aria-label="Close create ticket"
                disabled={loading}
                onClick={() => setIsOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="title">Title</label>

                <input className="field"
                  id="title"
                  name="title"
                  required minLength={3} maxLength={150}
                  aria-invalid={Boolean(fieldErrors.title)} aria-describedby="title-help"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Example: Payment deducted but plan inactive"
                />
                <small id="title-help" className={fieldErrors.title ? 'field-error' : 'field-help'}>{fieldErrors.title || `${form.title.length}/150 characters · minimum 3`}</small>
              </div>

              <div className="form-group">
                <label htmlFor="description">Description</label>

                <textarea className="field"
                  id="description"
                  name="description"
                  required minLength={10} maxLength={2000}
                  aria-invalid={Boolean(fieldErrors.description)} aria-describedby="description-help"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Explain the issue..."
                  rows={5}
                />
                <small id="description-help" className={fieldErrors.description ? 'field-error' : 'field-help'}>{fieldErrors.description || `${form.description.length}/2000 characters · minimum 10`}</small>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category</label>

                  <select className="field"
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
                  {fieldErrors.category && <small className="field-error">{fieldErrors.category}</small>}
                </div>

                <div className="form-group">
                  <label htmlFor="priority">Priority</label>

                  <select className="field"
                    id="priority"
                    name="priority"
                    value={form.priority}
                    onChange={handleChange}
                  >
                    <option value="Low">Low</option>

                    <option value="Medium">Medium</option>

                    <option value="High">High</option>
                  </select>
                  {fieldErrors.priority && <small className="field-error">{fieldErrors.priority}</small>}
                </div>
              </div>

              {error && <div className="alert alert-error" role="alert">{error}</div>}

              <div className="form-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={loading}
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Create Ticket"}
                </button>
              </div>
            </form>
        </Modal>
      )}
    </>
  );
}

export default CreateTicket;
