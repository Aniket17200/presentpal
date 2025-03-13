import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!token) {
      setMessage('Invalid or missing reset token.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5100/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Password reset successfully!');
      } else {
        setMessage(data.error || 'Failed to reset password.');
      }
    } catch (error) {
      setMessage('An error occurred. Please try again.');
    }
  };

  return (
    <div>
      <h2>Reset Password</h2>
      {!token && <p>Invalid or missing reset token. Please check your email link.</p>}
      {token && (
        <form onSubmit={handleResetPassword}>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            required
          />
          <button type="submit">Reset Password</button>
        </form>
      )}
      {message && <p>{message}</p>}
    </div>
  );
};

export default ResetPassword;