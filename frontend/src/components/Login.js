import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';  // For API calls
import '../index.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const API_BASE = 'http://127.0.0.1:8000';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Call backend login endpoint
      const response = await axios.post(`${API_BASE}/login`, {
        email,
        password,
      });

      // Extract data from response
      const { access_token, role } = response.data;

      // Store token and role
      localStorage.setItem('authToken', access_token);
      localStorage.setItem('userRole', role);

      // Fetch user details (requires /get-user-details endpoint in backend)
      let userDetails = null;
      try {
        const detailsResponse = await axios.get(`${API_BASE}/get-user-details`, {
          headers: { Authorization: `Bearer ${access_token}` }
        });
        userDetails = detailsResponse.data;
      } catch (detailsErr) {
        console.warn('Failed to fetch user details:', detailsErr);
        // Fallback: Set basic currentUser with available data
        userDetails = { user_id: null, name: email.split('@')[0], email };
      }

      // Store full user object for Header.js and Dashboard.js
      localStorage.setItem('currentUser', JSON.stringify({
        user_id: userDetails.user_id,
        name: userDetails.name,
        email: email,
        role: role
      }));

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      // Handle login or details errors
      const errorMessage = err.response?.data?.detail || 'Login failed. Please try again.';
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

          {error && <div style={{ color: '#cc3b3b', marginTop: 8 }}>{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
