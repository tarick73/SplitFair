import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, authService, joinEvent } from "../services/api.js"; 
import CreateEventForm from "../components/CreateEventForm.jsx";
import {
  Container,
  Card,
  Button,
  Spinner,
  InputGroup,
  Form,
  Alert,
} from "react-bootstrap";

const Dashboard = () => {
  const navigate = useNavigate();
  
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState(null); 

  const styles = {
    bgColorPrimary: "#1a1d24", 
    bgColorSecondary: "#24282f", 
    borderColor: "#2d3139",
    textColor: "#e5e7eb",
    textMuted: "#9ca3af",
    accentColor: "#6366f1",
    successColor: "#10b981",
    gradientButton: "linear-gradient(135deg, #3b82f6, #10b981)",
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        if (authService.init) await authService.init(); 
        const data = await fetchEvents();
        setEvents(data);
      } catch (err) {
        console.error("❌ Error loading data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      if (authService.logout) await authService.logout(); 
      navigate('/');
    } catch (error) {
      console.error("❌ Logout failed:", error);
      localStorage.removeItem('user'); 
      navigate('/'); 
    }
  };

  const handleNewEvent = () => {
    setShowModal(false);
    setLoading(true); 
    fetchEvents()
        .then(setEvents)
        .catch(err => console.error("Error refreshing list:", err))
        .finally(() => setLoading(false));
  };

  // 🟢 Join Event Handler
  const handleJoinEvent = async (e) => {
    e.preventDefault();
    setJoinError(null);

    const code = joinCode.toUpperCase().trim();
    if (!code) {
      setJoinError("Будь ласка, введіть код події.");
      return;
    }

    setIsJoining(true);
    try {
      const eventId = await joinEvent(code); 
      
      // ✅ Важливо: шлях має співпадати з твоїм маршрутом у App.js
      navigate(`/events/${eventId}`); 
      setJoinCode("");
      fetchEvents().then(setEvents); 
      
    } catch (error) {
      const errorMessage = error.message || "Невірний код або помилка сервера.";
      setJoinError(errorMessage);
      console.error("Join event failed:", error);
    } finally {
      setIsJoining(false);
    }
  };

  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (text) => text?.charAt(0)?.toUpperCase() || "E";
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

  return (
    <div style={{ backgroundColor: styles.bgColorPrimary, minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          backgroundColor: styles.bgColorSecondary,
          borderBottom: "1px solid #2d3139",
          padding: "16px 0",
        }}
      >
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="text-light fw-semibold mb-0">Events</h1>
            <Button
              variant="outline-secondary"
              onClick={handleLogout} 
              style={{
                color: "#9ca3af",
                borderColor: "#374151",
                fontWeight: "500",
              }}
            >
              Logout
            </Button>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <Container style={{ paddingTop: "32px", paddingBottom: "32px" }}>
        
        {/* Join Event */}
        <Card className="mb-4 shadow" style={{ backgroundColor: styles.bgColorSecondary, border: `1px solid ${styles.borderColor}`, borderRadius: "12px" }}>
            <Card.Body className="p-4">
                <h4 className="text-light fw-bold mb-3">Join existing event</h4>
                <Form onSubmit={handleJoinEvent}>
                    <InputGroup>
                        <Form.Control
                            type="text"
                            placeholder="Enter event code"
                            value={joinCode}
                            onChange={(e) => { setJoinCode(e.target.value); setJoinError(null); }}
                            required
                            style={{
                                backgroundColor: styles.bgColorPrimary,
                                border: `1px solid ${styles.borderColor}`,
                                color: "#fff",
                                boxShadow: "none",
                            }}
                        />
                        <Button
                            type="submit"
                            disabled={isJoining || !joinCode.trim()}
                            style={{
                                background: styles.gradientButton,
                                border: "none",
                                padding: "10px 20px",
                            }}
                        >
                            {isJoining ? <Spinner animation="border" size="sm" /> : "Join"}
                        </Button>
                    </InputGroup>
                    {joinError && (
                        <Alert variant="danger" className="mt-3 py-2 text-sm" style={{ backgroundColor: '#444', color: '#ff4d4d', borderColor: '#ff4d4d' }}>
                           {joinError}
                        </Alert>
                    )}
                </Form>
            </Card.Body>
        </Card>

        {/* Search Bar */}
        <div style={{ backgroundColor: "#24282f", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
          <InputGroup>
            <InputGroup.Text style={{ backgroundColor: "transparent", border: "none", color: "#6b7280", paddingLeft: "0" }}>🔍</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ backgroundColor: "transparent", border: "none", color: "#d1d5db", boxShadow: "none" }}
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
                onClick={() => navigate(`/events/${event.id}`)}
                style={{ backgroundColor: "#24282f", border: "none", borderRadius: "12px", cursor: "pointer", transition: "0.2s" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#2d3139"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#24282f"}
              >
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: colors[i % colors.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: "600", fontSize: "20px" }}>
                        {getInitial(event.title)}
                      </div>
                      <div>
                        <h5 className="text-light mb-1">{event.title}</h5>
                        <small style={{ color: "#9ca3af" }}>Created by {event.owner}</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <div style={{ color: "#10b981", fontWeight: "600", fontSize: "18px" }}>{event.participants_count || 0}</div>
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
        style={{ position: "fixed", bottom: "32px", right: "32px", width: "64px", height: "64px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #10b981)", border: "none", fontSize: "32px", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}
      >
        +
      </Button>

      <CreateEventForm show={showModal} handleClose={() => setShowModal(false)} onEventCreated={handleNewEvent} />
    </div>
  );
};

export default Dashboard;
