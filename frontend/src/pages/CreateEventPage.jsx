import React from "react";
import CreateEventForm from "../components/CreateEventForm";
import { useNavigate } from "react-router-dom";

function CreateEventPage() {
  const navigate = useNavigate();

  const handleSubmit = (data) => {
    console.log("Event:", data);

    // TODO: тут буде POST на Django
    navigate("/dashboard");
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
