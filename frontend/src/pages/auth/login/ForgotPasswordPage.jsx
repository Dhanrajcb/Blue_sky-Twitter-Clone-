import { useState } from "react";

const ForgotPasswordPage = () => {
  const [step, setStep] = useState(1); // 1: enter email, 2: enter OTP, 3: reset password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send OTP");
      setMessage("OTP sent to your email.");
      setStep(2);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invalid OTP");
      setMessage("OTP verified. Please enter your new password.");
      setStep(3);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");
      setMessage("Password reset successful! You can now log in.");
      setStep(4);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 px-2 w-full">
      <div className="bg-gray-800 p-8 rounded shadow-md w-full max-w-lg flex flex-col items-center">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">Forgot Password</h2>
        {message && <div className="text-green-400 mb-2">{message}</div>}
        {error && <div className="text-red-400 mb-2">{error}</div>}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <input
              type="email"
              placeholder="Enter your email"
              className="input input-bordered rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className="btn btn-primary rounded-full text-white">Send OTP</button>
          </form>
        )}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <input
              type="text"
              placeholder="Enter OTP"
              className="input input-bordered rounded"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
            />
            <button className="btn btn-primary rounded-full text-white">Verify OTP</button>
          </form>
        )}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
            <input
              type="password"
              placeholder="Enter new password"
              className="input input-bordered rounded"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
            <button className="btn btn-primary rounded-full text-white">Reset Password</button>
          </form>
        )}
        {step === 4 && (
          <div className="text-center text-white">
            Password reset successful! <a href="/login" className="text-blue-400 underline">Login</a>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
