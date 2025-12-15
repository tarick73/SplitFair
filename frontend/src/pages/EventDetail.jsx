import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchEventDetail,
  addTransaction,
  settleDebts,
  fetchAllUsers, // Although fetched, not currently used in a meaningful way here
} from "../services/api";
import {
  Container,
  Card,
  Button,
  Form,
  Table,
  Spinner,
} from "react-bootstrap";
import "./EventDetail.css"; // Assuming you might use a CSS file for styling

// Initial state for a new transaction
const initialNewTransactionState = (userId, isOwner) => ({
  payer_id: isOwner ? "" : userId, // Only owner can choose payer, non-owner defaults to self
  amount: "",
  description: "",
});

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));
  const currentUserId = user?.id;

  const [event, setEvent] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [participants, setParticipants] = useState([]);
  // const [allUsers, setAllUsers] = useState([]); // Removed, as it wasn't effectively used
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState(null);

  // State for the new transaction form
  const [newTransaction, setNewTransaction] = useState(
    initialNewTransactionState(currentUserId, event?.is_owner)
  );

  // State for who used/shared the expense
  const [usedBy, setUsedBy] = useState([]);
  const [addingTransaction, setAddingTransaction] = useState(false);

  // --- Data Fetching Logic ---

  const fetchEventData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchEventDetail(eventId);
      setEvent(data.event);
      setParticipants(data.participants || []);
      setTransactions(data.transactions || []);
      setErrors([]);

      // Initialize newTransaction state *after* event data is available
      setNewTransaction(initialNewTransactionState(currentUserId, data.event.is_owner));
      // Initialize usedBy: Should default to the payer if one is set, or current user
      // Since the payer defaults to the current user (if non-owner),
      // we initialize usedBy to just the current user's ID
      setUsedBy([currentUserId]);

    } catch (err) {
      setErrors([err.message || "Failed to fetch event details"]);
    } finally {
      setLoading(false);
    }
  }, [eventId, currentUserId]);

  /*
  // fetchUsers wasn't being used effectively, so it's commented out/removed
  const fetchUsers = async () => {
    try {
      const data = await fetchAllUsers();
      setAllUsers(data);
    } catch (err) {
      console.error("Failed to fetch all users:", err);
    }
  };
  */

  useEffect(() => {
    fetchEventData();
    // fetchUsers(); // See note above
  }, [fetchEventData]);

  // --- State/Effect for Payer Selection and UsedBy Synchronization ---

  // ORIGINAL LOGIC: The original useEffect was triggering on every render
  // because newTransaction.payer_id was being changed inside handleAddTransaction.
  // The logic was also flawed for the owner case.

  // CORRECTED LOGIC: When the Payer changes, update the 'usedBy' array.
  // *If* the newly selected payer is NOT already in `usedBy`, they should be added
  // (as the person who paid is generally assumed to be part of the expense).
  useEffect(() => {
    const payerId = Number(newTransaction.payer_id);
    if (payerId && !usedBy.includes(payerId)) {
      // We only force the payer into the usedBy list if they are explicitly selected
      // and not already in the list. This is often desirable in split-bill apps.
      // Alternatively, you could reset usedBy to [payerId] every time.
      setUsedBy((prev) => [...prev.filter(id => id !== payerId), payerId]);
    }
  }, [newTransaction.payer_id]); // Trigger when the payer selection changes

  const toggleUsedBy = (userId) => {
    const numericUserId = Number(userId);
    setUsedBy((prev) =>
      prev.includes(numericUserId)
        ? prev.filter((id) => id !== numericUserId)
        : [...prev, numericUserId]
    );
  };

  // --- Transaction and Settlement Logic ---

  const handleAddTransaction = async (e) => {
    e.preventDefault();

    // Check if amount is valid and there's at least one person sharing the expense
    if (!newTransaction.amount || usedBy.length === 0) return;

    // Ensure payer_id is a number (essential for API)
    const payerId = Number(newTransaction.payer_id);

    setAddingTransaction(true);
    setErrors([]); // Clear previous errors

    try {
      await addTransaction(eventId, {
        ...newTransaction,
        payer_id: payerId, // Ensure it's the numeric ID
        used_by: usedBy, // Pass the list of users who shared the expense
      });

      // Reset form state
      setNewTransaction(initialNewTransactionState(currentUserId, event.is_owner));
      setUsedBy([currentUserId]); // Default usedBy back to current user

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
      await fetchEventData(); // Refresh data to show settlement transactions
    } catch (err) {
      setErrors([err.message || "Failed to settle debts"]);
    } finally {
      setSettling(false);
    }
  };

  // --- Render Logic ---

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

  // Get the selected payer's ID
  const selectedPayerId = Number(newTransaction.payer_id);
  // Get the list of all potential users for the 'Used By' checkbox
  const availableUsersForUsedBy = event.is_owner ? participants : participants.filter(p => p.id === currentUserId);


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

        {/* Settlement Button - Only for Owner */}
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

        {/* Settle Result Message */}
        {settleResult && (
          <Card className="mb-4 p-3" style={{ backgroundColor: "#10b98120", border: "1px solid #10b981" }}>
            <div style={{ color: "#10b981" }}>
              Settlement complete! {settleResult.message || "Settlement transactions have been created."}
            </div>
          </Card>
        )}

        {/* Participants */}
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
                        ${p.total_spent ? Number(p.total_spent).toFixed(2) : '0.00'}
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

        {/* Transactions and Add Transaction Form */}
        <Card style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
              Expenses
            </h5>

            {/* Existing Transactions List */}
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
                      {txn.shared_by && (
                        <div
                          style={{
                            marginTop: "4px",
                            color: "#9ca3af",
                            fontSize: "12px",
                          }}
                        >
                          Shared by: {txn.shared_by}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>No expenses yet</p>
            )}

            {/* Add transaction Form */}
            <Form onSubmit={handleAddTransaction}>
              <div className="d-flex gap-2 mb-3">
                {/* 1. Payer Selection */}
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
                      color: selectedPayerId ? "#fff" : "#9ca3af",
                      borderRadius: "8px",
                      flex: 1, // Use flex for layout control
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

                {/* 2. Amount Input */}
                <Form.Control
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  required
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
                    maxWidth: "150px", // Keep amount field narrower
                  }}
                />

                {/* 3. Description Input */}
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

              {/* 4. Used By Checkboxes (Only show if a payer is selected/set) */}
              {(event.is_owner && selectedPayerId) || !event.is_owner ? (
                <div className="mb-3" style={{ color: "#fff", fontSize: "14px" }}>
                  <label className="d-block mb-2">Split the expense with:</label>
                  <div className="d-flex flex-wrap gap-3">
                    {participants.map((p) => {
                      const isDisabled = selectedPayerId === p.id && !event.is_owner;
                      return (
                        <Form.Check
                          key={p.id}
                          type="checkbox"
                          id={`used-by-${p.id}`}
                          label={p.username}
                          checked={usedBy.includes(Number(p.id))}
                          onChange={() => toggleUsedBy(p.id)}
                          disabled={isDisabled} // Disable checkbox if non-owner is the payer (and they must be included)
                          style={{
                            paddingLeft: "1.5em",
                            color: isDisabled ? "#6c757d" : "#fff"
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}


              {/* 5. Submit Button */}
              <Button
                type="submit"
                disabled={addingTransaction || !newTransaction.amount || usedBy.length === 0}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #10b981)",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  width: "100%", // Full width button
                  padding: "10px 0",
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