import React, { useEffect, useState } from "react";
import { Container, Row, Col, Card, Button, Modal, Form, Spinner } from "react-bootstrap";

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ title: "" });

  // отримати CSRF токен з cookies
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  // отримуємо список подій
  useEffect(() => {
    fetch("/api/events/", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Network error");
        return res.json();
      })
      .then((data) => setEvents(data))
      .catch((err) => console.error("Error fetching events:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleShow = () => setShowModal(true);
  const handleClose = () => setShowModal(false);

  // відправка форми створення події
  const handleSubmit = (e) => {
    e.preventDefault();
    const csrftoken = getCookie("csrftoken");

    fetch("/api/events/create/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to create event");
        return res.json();
      })
      .then((newEvent) => {
        setEvents((prev) => [...prev, newEvent]);
        handleClose();
      })
      .catch((err) => alert("Error creating event: " + err.message));
  };

  return (
    <Container className="py-4">
      <h1 className="text-light mb-3">Dashboard</h1>
      <p className="text-secondary">Welcome! Click + to create a new event.</p>

      {loading ? (
        <div className="text-center text-light">
          <Spinner animation="border" variant="light" />
        </div>
      ) : events.length === 0 ? (
        <div className="text-center text-secondary">No events yet.</div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4 mt-3">
          {events.map((event) => (
            <Col key={event.id}>
              <Card className="bg-dark text-light shadow-sm border-0">
                <Card.Body>
                  <Card.Title className="text-primary">{event.title}</Card.Title>
                  <Card.Text>
                    <small className="text-muted">
                      Created: {new Date(event.created_at).toLocaleDateString()}
                      <br />
                      Owner: {event.owner}
                      <br />
                      Participants: {event.participants_count}
                    </small>
                  </Card.Text>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Floating + Button */}
      <Button
        onClick={handleShow}
        className="rounded-circle position-fixed"
        style={{
          right: "24px",
          bottom: "24px",
          width: "56px",
          height: "56px",
          fontSize: "28px",
        }}
      >
        +
      </Button>

      {/* Modal */}
      <Modal show={showModal} onHide={handleClose} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create Event</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <Form.Group controlId="title">
              <Form.Label>Event Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Create
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default Dashboard;
