import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchEventDetail,
  addTransaction,
  settleDebts,
  fetchAllUsers,
} from "../services/api"; 
import {
  Container,
  Card,
  Button,
  Form,
  Table,
  Spinner,
} from "react-bootstrap";

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [event, setEvent] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState(null);

  // Initialize usedBy to include the current user's ID by default
  const [usedBy, setUsedBy] = useState([user?.id].filter(id => id != null));

  // Note: The original code passed user?.id || "" to payer_id,
  // which means the user ID can be either a number or an empty string.
  const [newTransaction, setNewTransaction] = useState({
    payer_id: user?.id || "",
    amount: "",
    description: "",
  });

  const [addingTransaction, setAddingTransaction] = useState(false);

  useEffect(() => {
    fetchEventData();
    fetchUsers();
  }, [eventId]);

// --- Correction/Adjustment for the Payer/UsedBy sync logic ---
// Ensure the ID is a number when checking/setting usedBy
useEffect(() => {
  const payerId = Number(newTransaction.payer_id);
  if (payerId) {
    // If a payer is selected, they should be in the usedBy list
    setUsedBy((prev) => {
      // Keep only unique numeric IDs, and ensure the payer is present
      const currentIds = prev.map(Number);
      if (!currentIds.includes(payerId)) {
        return [...currentIds, payerId];
      }
      return currentIds;
    });
  }
}, [newTransaction.payer_id]);

  const fetchEventData = async () => {
    setLoading(true);
    try {
      const data = await fetchEventDetail(eventId);
      setEvent(data.event);
      setParticipants(data.participants || []);
      setTransactions(data.transactions || []);
      setErrors([]);
    } catch (err) {
      setErrors([err.message || "Failed to fetch event details"]);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setAllUsers(data);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    }
  };

// --- Correction/Adjustment for toggleUsedBy logic ---
// Ensure the ID is a number when toggling
const toggleUsedBy = (userId) => {
  const numericUserId = Number(userId);
  setUsedBy((prev) =>
    prev.includes(numericUserId)
      ? prev.filter((id) => id !== numericUserId)
      : [...prev, numericUserId]
  );
};

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    // Check for amount and if at least one user is selected
    if (!newTransaction.amount || usedBy.length === 0) return;

    // Non-owner → always use own ID
    let finalPayerId = newTransaction.payer_id;
    if (!event.is_owner) {
      finalPayerId = user.id;
    }

    setAddingTransaction(true);
    try {
      await addTransaction(eventId, {
        ...newTransaction,
        payer_id: finalPayerId, // Use the correct payer ID
        used_by: usedBy, // Send the list of user IDs
      });

      // ✅ 5️⃣ Reset after submit: FULL RESET SNIPPET
      setNewTransaction({
        payer_id: event.is_owner ? "" : user.id,
        amount: "",
        description: "",
      });
      setUsedBy([]); // Reset usedBy after successful submission

      await fetchEventData(); // Refresh data
    } catch (err) {
      setErrors([err.message || "Failed to add transaction"]);
    } finally {
      setAddingTransaction(false);
    }
  };

  const handleSettle = async () => {
    if (!window.confirm("Create settlement transactions for this event?")) return;

    setSettling(true);
    setSettleResult(null);
    try {
      const data = await settleDebts(eventId);
      setSettleResult(data);
      await fetchEventData();
    } catch (err) {
      setErrors([err.message || "Failed to settle debts"]);
    } finally {
      setSettling(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: "#1a1d24", minHeight: "100vh" }}>
        <Container className="text-center py-5">
          <Spinner animation="border" style={{ color: "#3b82f6" }} />
        </Container>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ backgroundColor: "#1a1d24", minHeight: "100vh" }}>
        <Container className="py-5">
          <Card className="p-4 text-center">
            <p>Event not found</p>
            <Button variant="primary" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#1a1d24", minHeight: "100vh", paddingBottom: "40px" }}>
      <Container style={{ paddingTop: "24px", maxWidth: "900px" }}>

        <Button
          variant="link"
          onClick={() => navigate("/dashboard")}
          style={{
            color: "#3b82f6",
            padding: 0,
            marginBottom: "16px",
            textDecoration: "none",
            fontSize: "14px",
          }}
        >
          ← Back to events list
        </Button>

        <h1 className="text-light mb-2" style={{ fontSize: "32px", fontWeight: "600" }}>
          {event.title}
        </h1>

        <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "24px" }}>
          <div>Created: {new Date(event.created_at).toLocaleDateString()}</div>
          <div>Owner: {event.owner}</div>
          <div>Event code: <strong>{event.join_code}</strong></div>
        </div>

        {errors.length > 0 && (
          <Card className="mb-3 p-3" style={{ backgroundColor: "#24282f", border: "none" }}>
            {errors.map((err, i) => (
              <div key={i} style={{ color: "#ff4d4d" }}>{err}</div>
            ))}
          </Card>
        )}

        {event.is_owner && (
          <div className="mb-4">
            <Button
              onClick={handleSettle}
              disabled={settling}
              style={{
                background: "linear-gradient(135deg, #3b82f6, #10b981)",
                border: "none",
                padding: "12px 28px",
                fontSize: "15px",
                fontWeight: "600",
                borderRadius: "10px",
              }}
            >
              {settling ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Processing...
                </>
              ) : (
                "Settle debts"
              )}
            </Button>
          </div>
        )}

        {/* Participants (omitted for brevity, assume content is correct) */}
        <Card className="mb-4" style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
              Participants and their expenses
            </h5>

            {participants.length ? (
              <Table className="mb-0 table-dark" style={{ color: "#fff", backgroundColor: "#2d3139" }}>
                <thead style={{ backgroundColor: "#363a43", borderBottom: "none" }}>
                  <tr>
                    <th style={{ padding: "12px 16px", border: "none" }}>Participant</th>
                    <th style={{ padding: "12px 16px", border: "none", textAlign: "right" }}>
                      Total paid
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: i ? "1px solid #363a43" : "none" }}>
                      <td style={{ padding: "12px 16px" }}>{p.username}</td>
                      <td
                        style={{
                          padding: "12px 16px",
                          textAlign: "right",
                          fontWeight: "600",
                          color: "#10b981",
                        }}
                      >
                        ${Number(p.total_spent).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>No participants yet</p>
            )}
          </Card.Body>
        </Card>

        {/* Transactions */}
        <Card style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
              Expenses
            </h5>

            {transactions.length ? (
              <div
                style={{
                  backgroundColor: "#1a1d24",
                  borderRadius: "8px",
                  padding: "12px 16px",
                  marginBottom: "20px",
                }}
              >
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {transactions.map((txn, index) => (
                    <li
                      key={txn.id}
                      style={{
                        padding: "12px 0",
                        borderBottom: index < transactions.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "#fff" }}>{txn.payer}</span>
                        <span
                          style={{
                            fontWeight: "600",
                            color: "#10b981",
                          }}
                        >
                          ${Number(txn.amount).toFixed(2)}
                        </span>
                      </div>
                      {txn.description && (
                        <div
                          style={{
                            marginTop: "4px",
                            color: "#9ca3af",
                            fontSize: "14px",
                          }}
                        >
                          {txn.description}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>No expenses yet</p>
            )}

            {/* Add transaction */}
            {/* Changed from <Form className="d-flex gap-2"> to use onSubmit for better form handling */}
            <Form onSubmit={handleAddTransaction}>
              <div className="d-flex gap-2 mb-3">
                {/* Owner → full control */}
                {event.is_owner ? (
                  <Form.Select
                    value={newTransaction.payer_id}
                    onChange={(e) =>
                      setNewTransaction({
                        ...newTransaction,
                        payer_id: e.target.value,
                      })
                    }
                    style={{
                      backgroundColor: "#1a1d24",
                      border: "1px solid #2d3139",
                      color: newTransaction.payer_id ? "#fff" : "#9ca3af",
                      borderRadius: "8px",
                      flex: 1,
                    }}
                  >
                    <option value="">Who paid</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.username}
                      </option>
                    ))}
                  </Form.Select>
                ) : (
                  // Non-owner: force own username
                  <Form.Control
                    disabled
                    value={`Paid by: ${user.username}`}
                    style={{
                      backgroundColor: "#1a1d24",
                      border: "1px solid #2d3139",
                      color: "#9ca3af",
                      borderRadius: "8px",
                      flex: 1,
                    }}
                  />
                )}

                <Form.Control
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required // Added required
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      amount: e.target.value,
                    })
                  }
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    borderRadius: "8px",
                    maxWidth: "120px",
                  }}
                />

                <Form.Control
                  type="text"
                  placeholder="Description (optional)"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({
                      ...newTransaction,
                      description: e.target.value,
                    })
                  }
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    borderRadius: "8px",
                    flex: 1,
                  }}
                />
              </div>

              {/* ✅ 6️⃣ Add “Who used this?” UI */}
              {/* Note: Moved Form.Check into a flex container for better dark-mode visibility/layout */}
              <div className="mb-3" style={{ width: "100%", marginTop: "12px" }}>
                <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "6px" }}>
                  Who used this?
                </div>

                <div className="d-flex flex-wrap gap-3">
                  {participants.map((p) => {
                    // Disable checkbox for non-owner if it's their own ID, to ensure they are always included
                    const isDisabled = !event.is_owner && Number(p.id) === Number(user.id);
                    return (
                      <Form.Check
                        key={p.id}
                        type="checkbox"
                        label={p.username}
                        checked={usedBy.includes(p.id)}
                        onChange={() => toggleUsedBy(p.id)}
                        disabled={isDisabled}
                        style={{ color: "#e5e7eb" }}
                      />
                    );
                  })}
                </div>
              </div>

              <Button
                type="submit" // Use type="submit" for Form handling
                // onClick={handleAddTransaction} (Removed onClick since form handles submit)
                // ✅ 7️⃣ Prevent empty submit: Updated disabled condition
                disabled={addingTransaction || !newTransaction.amount || usedBy.length === 0}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #10b981)",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                }}
              >
                {addingTransaction ? "Adding..." : "Add expense"}
              </Button>
            </Form>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default EventDetail;