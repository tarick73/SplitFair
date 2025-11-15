import React, { useState } from "react";

function CreateEventForm({ onCancel, onSubmit }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    participants: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) onSubmit(formData);
  };

  return (
    <form className="create-event-form" onSubmit={handleSubmit}>

      <h2 className="form-title">Create Event</h2>

      {/* Event name */}
      <div className="form-field">
        <label>Event Name</label>
        <input
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
        />
      </div>

      {/* Description */}
      <div className="form-field">
        <label>Description</label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
        />
      </div>

      {/* Participants */}
      <div className="form-field">
        <label>Participants (comma separated)</label>
        <input
          name="participants"
          value={formData.participants}
          onChange={handleChange}
        />
        <small className="help-text">Example: john, anna, mike</small>
      </div>

      <div className="button-group">
        <button type="submit" className="btn btn-primary">Create</button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default CreateEventForm;
