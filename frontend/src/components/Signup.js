import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import '../index.css';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE = 'http://127.0.0.1:8000';

  async function handleSubmit(e) {
    e.preventDefault();
    console.log("handleSubmit called");
    setError('');
    console.log({ name, email, password, confirm });

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      console.log("Sending signup request...");
      const response = await axios.post(`${API_BASE}/signup`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      console.log("Response:", response.data);

      const { user_id } = response.data;
      alert('Signup successful!');

      // NEW: Store user_id and email in localStorage for later use in forms
      localStorage.setItem("currentUser", JSON.stringify({ user_id, email: email.trim() }));

      // Navigate to role selection page
      navigate(`/role-selection/${user_id}`);
    } catch (err) {
      console.error(err);
      let errorMessage = 'Signup failed. See console for details.';

      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data.detail === 'string') errorMessage = data.detail;
        else if (typeof data.error === 'string') errorMessage = data.error;
        else errorMessage = JSON.stringify(data);
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>SoftScale</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />

          {error && <div style={{ color: '#cc3b3b', marginTop: 8 }}>{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p>
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
