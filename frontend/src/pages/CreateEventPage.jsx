import React from "react";
import CreateEventForm from "../components/CreateEventForm";
import { useNavigate } from "react-router-dom";

function CreateEventPage() {
  const navigate = useNavigate();

 const handleSubmit = async (data) => {
  try {
    const res = await fetch("/api/events/create/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        participants: data.participants, // <-- array of user IDs
      }),
    });
    if (!res.ok) throw new Error("Failed to create event");
    const json = await res.json();
    navigate("/dashboard");
  } catch (err) {
    console.error(err);
  }
};


  return (
    <div className="container mt-4">
      <CreateEventForm
        onSubmit={handleSubmit}
        onCancel={() => navigate("/dashboard")}
      />
    </div>
  );
}

export default CreateEventPage;
