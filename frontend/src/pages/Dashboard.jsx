import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEvents, authService } from "../services/api"; 
import CreateEventForm from "../components/CreateEventForm";
import {
  Container,
  Card,
  Button,
  Spinner,
  InputGroup,
  Form,
} from "react-bootstrap";

const Dashboard = () => {
  const navigate = useNavigate();
  
  // === СТАН КОМПОНЕНТА ===
  const [events, setEvents] = useState([]);
  // Залишаємо лише стан, що керує видимістю модального вікна
  const [showModal, setShowModal] = useState(false); 
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // === ЕФЕКТИ (ЗАВАНТАЖЕННЯ ДАНИХ ТА ІНІЦІАЛІЗАЦІЯ) ===
  useEffect(() => {
    const loadData = async () => {
      try {
        await authService.init(); 
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

  // === ОБРОБНИКИ ДІЙ ===

  // 🚪 Logout Handler
  const handleLogout = async () => {
    try {
      await authService.logout(); 
      navigate('/');
    } catch (error) {
      console.error("❌ Logout failed:", error);
      localStorage.removeItem('user'); 
      navigate('/'); 
      alert("Logout failed, please try again.");
    }
  };
  
  // ✅ Новий обробник: Додає створену подію до списку
  const handleNewEvent = (newEvent) => {
      setEvents((prev) => [newEvent, ...prev]);
  };

  // === ХЕЛПЕРИ ДЛЯ РЕНДЕРИНГУ ===
  const filteredEvents = events.filter((e) =>
    e.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitial = (text) => text?.charAt(0)?.toUpperCase() || "E";
  const colors = ["#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#f59e0b"];

  // === РЕНДЕРИНГ ===
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
            {/* ... (логіка пошуку залишається незмінною) ... */}
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
        {/* ... (логіка відображення подій залишається незмінною) ... */}
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

      {/* 💡 ВИКЛИК ОКРЕМОГО КОМПОНЕНТА ФОРМИ */}
      <CreateEventForm 
        show={showModal} 
        handleClose={() => setShowModal(false)} 
        onEventCreated={handleNewEvent} 
      />
    </div>
  );
};

export default Dashboard;