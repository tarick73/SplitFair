import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api";
import { User, Lock, Mail, UserPlus, LogIn, Eye, EyeOff, DollarSign } from "lucide-react";

const AuthComponent = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    username: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Username is required for both login and register
    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!isLogin) {
      // Email is only required for registration
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = "Please enter a valid email";
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password";
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      if (isLogin) {
        const data = await authService.login(formData.username, formData.password);
        console.log("Login successful:", data);
        navigate("/dashboard");
      } else {
        const data = await authService.register(
          formData.username,
          formData.email,
          formData.password
        );
        console.log("Registration successful:", data);
        alert("Registration successful! Please log in.");
        setIsLogin(true);
        setFormData({ email: "", password: "", username: "", confirmPassword: "" });
      }
    } catch (error) {
      console.error("Error:", error);
      setErrors({
        general: error.response?.data?.message || "Something went wrong. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setFormData({ email: "", password: "", username: "", confirmPassword: "" });
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100"
      style={{
        background: "linear-gradient(135deg, #3b1c9e, #0f3460, #16213e)",
        padding: "2rem 1rem",
      }}
    >
      <div
        className="card shadow-lg border-0"
        style={{
          width: "100%",
          maxWidth: "440px",
          height: "auto",
          minHeight: "600px",
          background: "rgba(255, 255, 255, 0.1)",
          backdropFilter: "blur(10px)",
          borderRadius: "20px",
          padding: "2.5rem 2rem",
        }}
      >
        <div className="d-flex flex-column h-100">
          {/* Header */}
          <div className="text-center mb-4">
            <div
              className="rounded-circle d-inline-flex align-items-center justify-content-center shadow mb-3"
              style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #7b2ff7, #4facfe)",
              }}
            >
              <DollarSign size={40} color="white" />
            </div>
            <h1 className="fw-bold text-white mb-1">SplitFair</h1>
            <p className="text-white-50 mb-0">Split expenses fairly</p>
          </div>

          {/* Form Title */}
          <h3 className="text-center mb-4 text-white fw-semibold">
            {isLogin ? "Welcome Back" : "Create Account"}
          </h3>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-grow-1">
            {/* Username Field (both login and register) */}
            <div className="mb-3">
              <label className="form-label text-white-50 small">Username</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-secondary text-white">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className={`form-control bg-transparent text-white border-secondary ${
                    errors.username ? "is-invalid" : ""
                  }`}
                  name="username"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleInputChange}
                  autoComplete="username"
                  style={{ color: "white" }}
                />
              </div>
              {errors.username && (
                <div className="text-danger small mt-1">{errors.username}</div>
              )}
            </div>

            {/* Email Field (Register only) */}
            <div
              style={{
                height: !isLogin ? "auto" : "0",
                opacity: !isLogin ? "1" : "0",
                overflow: "hidden",
                transition: "all 0.3s ease",
                marginBottom: !isLogin ? "1rem" : "0",
              }}
            >
              <label className="form-label text-white-50 small">Email</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-secondary text-white">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  className={`form-control bg-transparent text-white border-secondary ${
                    errors.email ? "is-invalid" : ""
                  }`}
                  name="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  style={{ color: "white" }}
                />
              </div>
              {errors.email && (
                <div className="text-danger small mt-1">{errors.email}</div>
              )}
            </div>

            {/* Password Field */}
            <div className="mb-3">
              <label className="form-label text-white-50 small">Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-secondary text-white">
                  <Lock size={18} />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`form-control bg-transparent text-white border-secondary ${
                    errors.password ? "is-invalid" : ""
                  }`}
                  name="password"
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={handleInputChange}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  style={{ color: "white" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-secondary text-white"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <div className="text-danger small mt-1">{errors.password}</div>
              )}
            </div>

            {/* Confirm Password Field (Register only) */}
            <div
              style={{
                height: !isLogin ? "auto" : "0",
                opacity: !isLogin ? "1" : "0",
                overflow: "hidden",
                transition: "all 0.3s ease",
                marginBottom: !isLogin ? "1rem" : "0",
              }}
            >
              <label className="form-label text-white-50 small">Confirm Password</label>
              <div className="input-group">
                <span className="input-group-text bg-transparent border-secondary text-white">
                  <Lock size={18} />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`form-control bg-transparent text-white border-secondary ${
                    errors.confirmPassword ? "is-invalid" : ""
                  }`}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  autoComplete="new-password"
                  style={{ color: "white" }}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary border-secondary text-white"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <div className="text-danger small mt-1">{errors.confirmPassword}</div>
              )}
            </div>

            {/* Forgot Password (Login only) */}
            {isLogin && (
              <div className="text-end mb-3">
                <button
                  type="button"
                  className="btn btn-link text-info text-decoration-none p-0 small"
                  onClick={() => alert("Password recovery is under development")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* General Error */}
            {errors.general && (
              <div className="alert alert-danger py-2 small text-center" role="alert">
                {errors.general}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="btn w-100 d-flex justify-content-center align-items-center py-2 fw-semibold"
              disabled={loading}
              style={{
                background: loading
                  ? "rgba(123, 47, 247, 0.5)"
                  : "linear-gradient(135deg, #7b2ff7, #4facfe)",
                border: "none",
                color: "white",
                transition: "all 0.3s ease",
                fontSize: "1rem",
              }}
            >
              {loading ? (
                <div className="spinner-border spinner-border-sm text-white" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              ) : (
                <>
                  {isLogin ? <LogIn size={20} className="me-2" /> : <UserPlus size={20} className="me-2" />}
                  {isLogin ? "Login" : "Register"}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center mt-4 pt-3 border-top border-secondary">
            <p className="text-white-50 mb-0">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
              <button
                className="btn btn-link text-info text-decoration-none p-0 fw-semibold"
                onClick={toggleMode}
                disabled={loading}
              >
                {isLogin ? "Register" : "Login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthComponent;