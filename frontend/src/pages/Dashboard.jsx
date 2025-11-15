import React, { useEffect, useState } from "react";
import { createEvent } from "../services/api";

import {
  Container,
  Card,
  Button,
  Modal,
  Form,
  Spinner,
  InputGroup,
} from "react-bootstrap";

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({ title: "" });

  // 🍪 CSRF
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  };

  // 🔁 Fetch Events
  useEffect(() => {
    fetch("/api/events/", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch events");
        return res.json();
      })
      .then((data) => setEvents(data))
      .catch((err) => console.error("❌ Error fetching events:", err))
      .finally(() => setLoading(false));
  }, []);

 
// ➕ Create Event - ОНОВЛЕНИЙ МЕТОД
const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!formData.title.trim()) return;

  setCreating(true);
  try {
    const newEvent = await createEvent(formData);
    setEvents((prev) => [...prev, newEvent]);
    setFormData({ title: "" });
    setShowModal(false);
  } catch (err) {
    alert("⚠️ Error creating event: " + err.message);
  } finally {
    setCreating(false);
  }
};
  // 🧠 Helpers
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (text) => text?.charAt(0)?.toUpperCase() || "E";
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

  return (
    <div style={{ backgroundColor: "#1a1d24", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: "#24282f",
          borderBottom: "1px solid #2d3139",
          padding: "16px 0",
        }}
      >
        <Container>
          <h1 className="text-light fw-semibold mb-0">Events</h1>
        </Container>
      </header>

      {/* Main Content */}
      <Container style={{ paddingTop: "32px", paddingBottom: "32px" }}>
        {/* Search Bar */}
        <div
          style={{
            backgroundColor: "#24282f",
            borderRadius: "12px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <InputGroup>
            <InputGroup.Text
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#6b7280",
                paddingLeft: "0",
              }}
            >
              🔍
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: "#d1d5db",
                boxShadow: "none",
              }}
            />
          </InputGroup>
        </div>

        {/* Event List */}
        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" style={{ color: "#6366f1" }} />
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-5">
            <p style={{ color: "#9ca3af" }}>
              {searchQuery ? "No events found." : "No events yet."}
            </p>
          </div>
        ) : (
          <div className="d-flex flex-column gap-3">
            {filteredEvents.map((event, i) => (
              <Card
                key={event.id}
                style={{
                  backgroundColor: "#24282f",
                  border: "none",
                  borderRadius: "12px",
                  cursor: "pointer",
                  transition: "0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#2d3139")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "#24282f")
                }
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "12px",
                          backgroundColor: colors[i % colors.length],
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: "20px",
                        }}
                      >
                        {getInitial(event.title)}
                      </div>
                      <div>
                        <h5 className="text-light mb-1">{event.title}</h5>
                        <small style={{ color: "#9ca3af" }}>
                          Created by {event.owner}
                        </small>
                      </div>
                    </div>
                    <div className="text-end">
                      <div
                        style={{
                          color: "#10b981",
                          fontWeight: "600",
                          fontSize: "18px",
                        }}
                      >
                        {event.participants_count}
                      </div>
                      <small style={{ color: "#9ca3af" }}>participants</small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </Container>

      {/* Floating + Button */}
      <Button
        onClick={() => setShowModal(true)}
        style={{
          position: "fixed",
          bottom: "32px",
          right: "32px",
          width: "64px",
          height: "64px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #3b82f6, #10b981)",
          border: "none",
          fontSize: "32px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
        }}
      >
        +
      </Button>

      {/* Create Event Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <div style={{ backgroundColor: "#24282f", borderRadius: "12px" }}>
          <Modal.Header
            closeButton
            closeVariant="white"
            style={{
              backgroundColor: "#24282f",
              borderBottom: "1px solid #2d3139",
            }}
          >
            <Modal.Title className="text-light">Create New Event</Modal.Title>
          </Modal.Header>
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <Form.Group>
                <Form.Label className="text-light">Event Title</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter event title"
                  value={formData.title}
                  onChange={(e) => setFormData({ title: e.target.value })}
                  required
                  style={{
                    backgroundColor: "#1a1d24",
                    border: "1px solid #2d3139",
                    color: "#fff",
                    padding: "12px",
                  }}
                />
              </Form.Group>
            </Modal.Body>
            <Modal.Footer>
              <Button
                variant="secondary"
                onClick={() => setShowModal(false)}
                disabled={creating}
                style={{
                  backgroundColor: "#374151",
                  border: "none",
                  padding: "10px 24px",
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creating}
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #10b981)",
                  border: "none",
                  padding: "10px 24px",
                }}
              >
                {creating ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-2" />
                    Creating...
                  </>
                ) : (
                  "Create"
                )}
              </Button>
            </Modal.Footer>
          </Form>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
