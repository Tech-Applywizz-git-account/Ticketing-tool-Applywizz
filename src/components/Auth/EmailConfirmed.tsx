// ✅ File: src/components/Auth/EmailConfirmed.tsx
"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from '@/lib/supabaseClient';
import { Eye, EyeOff } from 'lucide-react';

const EmailConfirmed = () => {
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [status, setStatus] = useState<"pending" | "verified" | "expired">("pending");
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token_hash = urlParams.get("token_hash");
                const type = urlParams.get("type");
                const emailFromQuery = urlParams.get("email");

                if (type === "email" && token_hash && emailFromQuery) {
                    const { data, error } = await supabase.auth.verifyOtp({
                        type: "email",
                        token_hash,
                        email: emailFromQuery,
                    });

                    if (error) {
                        setStatus("expired");
                        return;
                    }

                    setStatus("verified");
                    setEmail(data.user?.email || "");
                } else {
                    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
                    if (sessionError || !session?.user) {
                        setStatus("expired");
                        return;
                    }
                    setStatus("verified");
                    setEmail(session.user.email || "");
                }
            } catch (e) {
                setStatus("expired");
            }
        };
        verifyEmail();
    }, []);

    // const handleUpdatePassword = async () => {
    //     if (!password || password.length < 6) return;

    //     setLoading(true);
    //     try {
    //         // ✅ 1. Update password in Supabase
    //         const { error } = await supabase.auth.updateUser({
    //             password
    //         });

    //         if (error) throw error;

    //         // ✅ 2. Clear stored email
    //         localStorage.removeItem("applywizz_user_email");
    //         sessionStorage.removeItem("signup_email");

    //         // ✅ 3. Redirect to login
    //         alert("Password updated successfully! Redirecting to login...");
    //         setTimeout(() => navigate("/login"), 3000);
    //     } catch (e: any) {
    //         alert("Error updating password: " + e.message);
    //     } finally {
    //         setLoading(false);
    //     }
    // };
    const handleUpdatePassword = async () => {
        if (!password || password.length < 6) return;

        setLoading(true);
        try {
            // ✅ 1. Update password in Supabase
            const { error } = await supabase.auth.updateUser({
                password
            });

            if (error) throw error;

            // ✅ 2. Insert into public.users table (if not already)
            const {
                data: { session },
                error: sessionError
            } = await supabase.auth.getSession();

            if (!sessionError && session?.user) {
                const user = session.user;
                await supabase.from("users").insert({
                    id: user.id,
                    email: user.email,
                    name: user.user_metadata?.name || "New User",
                    role: user.user_metadata?.role || "user",
                    department: user.user_metadata?.department || "",
                    is_active: true
                });
            }

            // ✅ 3. Clear stored email
            localStorage.removeItem("applywizz_user_email");
            sessionStorage.removeItem("signup_email");

            // ✅ 4. Redirect to login
            alert("Password updated successfully! Redirecting to login...");
            setTimeout(() => navigate("/login"), 3000);
        } catch (e: any) {
            alert("Error updating password: " + e.message);
        } finally {
            setLoading(false);
        }
    };


    if (status === "pending") {
        return (
            <div className="min-h-screen flex justify-center items-center text-center">Verifying email...</div>
        );
    }

    if (status === "expired") {
        return (
            <div className="min-h-screen flex justify-center items-center flex-col">
                <h2 className="text-red-600 text-xl font-bold mb-4">Link Expired</h2>
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={() => navigate("/LinkExpired")}
                >
                    Go to Resend Page
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="bg-white shadow p-6 rounded-lg w-full max-w-md">
                <h2 className="text-green-600 text-xl font-bold mb-4 text-center">Email Confirmed</h2>

                <label className="block mb-2 text-sm text-gray-600">Your Email</label>
                <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100 mb-4 cursor-not-allowed"
                />

                <label className="block mb-2 text-sm text-gray-600">New Password</label>
                <div className="relative">
                    <input
                        type={showPassword ? 'text' : 'password'}
                        className="w-full p-2 border rounded pr-10"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        minLength={6}
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute top-2 right-3 text-gray-500"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                <button
                    className="w-full mt-4 bg-blue-600 text-white px-4 py-2 rounded"
                    onClick={handleUpdatePassword}
                    disabled={loading || password.length < 6}
                >
                    {loading ? "Updating..." : "Update Password"}
                </button>
            </div>
        </div>
    );
};

export default EmailConfirmed;
