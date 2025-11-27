import React, { useState } from "react";
import { Modal, Form, Button, Spinner } from "react-bootstrap";
// Імпортуємо функцію створення події
import { createEvent } from "../services/api"; 

const CreateEventForm = ({ show, handleClose, onEventCreated }) => {
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({ title: "" });

  // ➕ Create Event Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim()) return;

    setCreating(true);
    try {
      const newEvent = await createEvent(formData);
      
      // Повідомляємо батьківський компонент про нову подію
      onEventCreated(newEvent); 
      
      setFormData({ title: "" });
      handleClose(); // Закриваємо модальне вікно
    } catch (err) {
      console.error("⚠️ Error creating event:", err);
      alert("⚠️ Error creating event: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
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
              onClick={handleClose}
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
              disabled={creating || !formData.title.trim()}
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
  );
};

export default CreateEventForm;