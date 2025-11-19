import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchEventDetail,
  addParticipant,
  addTransaction,
  settleDebts,
} from "../services/api";
import {
  Container,
  Card,
  Button,
  Form,
  Table,
  Alert,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [settling, setSettling] = useState(false);
  const [settleResult, setSettleResult] = useState(null);
  
  // Form states
  const [newParticipant, setNewParticipant] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    payer_id: "",
    amount: "",
    description: "",
  });
  const [addingTransaction, setAddingTransaction] = useState(false);

  // Fetch event details
  useEffect(() => {
    fetchEventData();
  }, [eventId]);

  const fetchEventData = async () => {
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

  // Add participant
  const handleAddParticipant = async (e) => {
    e.preventDefault();
    
    if (!newParticipant.trim()) return;
    
    setAddingParticipant(true);
    try {
      await addParticipant(eventId, { 
        participant_name: newParticipant 
      });
      
      await fetchEventData();
      setNewParticipant("");
      setErrors([]);
    } catch (err) {
      setErrors([err.message || "Failed to add participant"]);
    } finally {
      setAddingParticipant(false);
    }
  };

  // Add transaction
  const handleAddTransaction = async (e) => {
    e.preventDefault();
    
    if (!newTransaction.payer_id || !newTransaction.amount) return;
    
    setAddingTransaction(true);
    try {
      await addTransaction(eventId, newTransaction);
      
      await fetchEventData();
      setNewTransaction({ payer_id: "", amount: "", description: "" });
      setErrors([]);
    } catch (err) {
      setErrors([err.message || "Failed to add transaction"]);
    } finally {
      setAddingTransaction(false);
    }
  };

  // Settle debts
  const handleSettle = async () => {
    if (!window.confirm("Create settlement transactions for this event?")) {
      return;
    }
    
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
          <Alert variant="danger">Event not found</Alert>
          <Button variant="primary" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </Container>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "#1a1d24", minHeight: "100vh", paddingBottom: "40px" }}>
      <Container style={{ paddingTop: "24px", maxWidth: "900px" }}>
        
        {/* Back Link */}
        <Button
          variant="link"
          onClick={() => navigate("/dashboard")}
          style={{ 
            color: "#3b82f6", 
            padding: 0, 
            marginBottom: "16px",
            textDecoration: "none",
            fontSize: "14px"
          }}
        >
          ← Back to events list
        </Button>

        {/* Event Header */}
        <h1 className="text-light mb-2" style={{ fontSize: "32px", fontWeight: "600" }}>
          {event.title}
        </h1>
        <div style={{ color: "#9ca3af", fontSize: "14px", marginBottom: "24px" }}>
          <div>Created: {new Date(event.created_at).toLocaleDateString()}</div>
          <div>Owner: {event.owner}</div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <Alert variant="danger" onClose={() => setErrors([])} dismissible className="mb-3">
            {errors.map((err, i) => (
              <div key={i}>{err}</div>
            ))}
          </Alert>
        )}

        {/* Settle Button */}
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
                borderRadius: "10px"
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

        {/* Settle Result */}
        {settleResult && (
          <Card className="mb-4" style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
            <Card.Body>
              <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
                Settlements created
              </h5>
              {settleResult.created && settleResult.created.length > 0 ? (
                <ul className="text-light" style={{ marginBottom: 0, paddingLeft: "20px" }}>
                  {settleResult.created.map((s, i) => (
                    <li key={i} style={{ marginBottom: "8px" }}>
                      <strong>{s.payer}</strong> → <strong>{s.to}</strong>: ${s.amount}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-light mb-0">No settlement transactions were necessary.</p>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Participants Card */}
        <Card className="mb-4" style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
              Participants and their expenses
            </h5>

            {participants.length > 0 ? (
              <div style={{ 
                backgroundColor: "#1a1d24", 
                borderRadius: "8px", 
                overflow: "hidden",
                marginBottom: "20px"
              }}>
                <Table className="mb-0" style={{ color: "#d1d5db" }}>
                  <thead style={{ backgroundColor: "#2d3139" }}>
                    <tr>
                      <th style={{ padding: "12px 16px", borderBottom: "none", fontWeight: "600" }}>
                        Participant
                      </th>
                      <th style={{ padding: "12px 16px", borderBottom: "none", fontWeight: "600", textAlign: "right" }}>
                        Total paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((p, index) => (
                      <tr key={p.id} style={{ borderTop: index > 0 ? "1px solid #2d3139" : "none" }}>
                        <td style={{ padding: "12px 16px", borderBottom: "none" }}>
                          {p.username}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "none", textAlign: "right", fontWeight: "600" }}>
                          ${p.total_spent.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>No participants yet</p>
            )}

            {/* Add Participant Form */}
            <Row className="g-2">
              <Col xs={12} md={8}>
                <Form.Control
                  type="text"
                  placeholder="Name of new participant"
                  value={newParticipant}
                  onChange={(e) => setNewParticipant(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddParticipant(e);
                    }
                  }}
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}
                />
              </Col>
              <Col xs={12} md={4}>
                <Button 
                  onClick={handleAddParticipant}
                  disabled={addingParticipant || !newParticipant.trim()}
                  className="w-100"
                  style={{
                    background: addingParticipant || !newParticipant.trim() 
                      ? "#6b7280" 
                      : "linear-gradient(135deg, #3b82f6, #10b981)",
                    border: "none",
                    padding: "10px 14px",
                    borderRadius: "8px",
                    fontWeight: "600"
                  }}
                >
                  {addingParticipant ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Adding...
                    </>
                  ) : (
                    "Add participant"
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Expenses Card */}
        <Card style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px" }}>
          <Card.Body style={{ padding: "24px" }}>
            <h5 className="text-light mb-3" style={{ fontSize: "18px", fontWeight: "600" }}>
              Expenses
            </h5>

            {transactions.length > 0 ? (
              <div style={{ 
                backgroundColor: "#1a1d24", 
                borderRadius: "8px", 
                padding: "12px 16px",
                marginBottom: "20px"
              }}>
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {transactions.map((txn, index) => (
                    <li
                      key={txn.id}
                      style={{
                        padding: "10px 0",
                        borderBottom: index < transactions.length - 1 ? "1px solid rgba(255,255,255,0.08)" : "none",
                        color: "#d1d5db",
                        fontSize: "14px",
                      }}
                    >
                      <div style={{ marginBottom: "4px" }}>
                        <strong style={{ color: "#fff" }}>{txn.payer}</strong>
                        {" — "}
                        <span style={{ fontWeight: "600", color: "#10b981" }}>
                          ${parseFloat(txn.amount).toFixed(2)}
                        </span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#9ca3af" }}>
                        {txn.description || "No description"}
                        {" • "}
                        {new Date(txn.date).toLocaleDateString()}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p style={{ color: "#9ca3af", marginBottom: "20px" }}>No expenses yet</p>
            )}

            {/* Add Transaction Form */}
            <Row className="g-2 mb-2">
              <Col xs={12} md={4}>
                <Form.Select
                  value={newTransaction.payer_id}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, payer_id: e.target.value })
                  }
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: newTransaction.payer_id ? "#fff" : "#9ca3af",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}
                >
                  <option value="">Who paid</option>
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.username}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col xs={12} md={4}>
                <Form.Control
                  type="number"
                  step="0.01"
                  placeholder="Amount"
                  value={newTransaction.amount}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, amount: e.target.value })
                  }
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}
                />
              </Col>
              <Col xs={12} md={4}>
                <Form.Control
                  type="text"
                  placeholder="Description (optional)"
                  value={newTransaction.description}
                  onChange={(e) =>
                    setNewTransaction({ ...newTransaction, description: e.target.value })
                  }
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    padding: "10px 14px",
                    borderRadius: "8px"
                  }}
                />
              </Col>
            </Row>
            <Row>
              <Col>
                <Button 
                  onClick={handleAddTransaction}
                  disabled={addingTransaction || !newTransaction.payer_id || !newTransaction.amount}
                  style={{
                    background: addingTransaction || !newTransaction.payer_id || !newTransaction.amount
                      ? "#6b7280"
                      : "linear-gradient(135deg, #3b82f6, #10b981)",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    fontWeight: "600"
                  }}
                >
                  {addingTransaction ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Adding...
                    </>
                  ) : (
                    "Add expense"
                  )}
                </Button>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default EventDetail;