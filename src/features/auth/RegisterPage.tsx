import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { saveSession } from "./auth.client";
import { AuthSession } from "./auth.types";

type RegisterFormValues = {
  fullName: string;
  tenantName: string;
  email: string;
  password: string;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://saasproback.onrender.com";

export function RegisterPage() {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<RegisterFormValues>();

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName,
          tenantName: values.tenantName,
          email: values.email,
          password: values.password
        })
      });

      const payload = (await response.json()) as AuthSession | { message?: string | string[] };
      if (!response.ok) {
        const rawMessage = "message" in payload ? payload.message : null;
        const message = Array.isArray(rawMessage)
          ? rawMessage.join(", ")
          : rawMessage || "Error al registrar usuario";
        setApiError(message);
        return;
      }

      saveSession(payload as AuthSession);
      navigate("/dashboard");
    } catch {
      setApiError("No se pudo conectar al backend. Revisar CORS/URL/API.");
    }
  };

  return (
    <main style={{ maxWidth: 420, margin: "48px auto", fontFamily: "system-ui, sans-serif", padding: "0 16px" }}>
      <h1 style={{ marginBottom: 8 }}>Registro</h1>
      <p style={{ marginTop: 0, color: "#555" }}>Crea tu usuario y entra directo al dashboard.</p>

      <form onSubmit={handleSubmit(onSubmit)} style={{ display: "grid", gap: 12 }}>
        <label>
          Nombre
          <input
            type="text"
            placeholder="Juan Perez"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("fullName", { required: "Nombre requerido" })}
          />
        </label>
        {errors.fullName ? <small style={{ color: "crimson" }}>{errors.fullName.message}</small> : null}

        <label>
          Nombre del negocio
          <input
            type="text"
            placeholder="La Claudia"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("tenantName", { required: "Nombre del negocio requerido" })}
          />
        </label>
        {errors.tenantName ? <small style={{ color: "crimson" }}>{errors.tenantName.message}</small> : null}

        <label>
          Email
          <input
            type="email"
            placeholder="tu@email.com"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("email", { required: "Email requerido" })}
          />
        </label>
        {errors.email ? <small style={{ color: "crimson" }}>{errors.email.message}</small> : null}

        <label>
          Password
          <input
            type="password"
            placeholder="********"
            style={{ width: "100%", padding: 10, marginTop: 4 }}
            {...register("password", { required: "Password requerido", minLength: 5 })}
          />
        </label>
        {errors.password ? <small style={{ color: "crimson" }}>Password minimo 5 caracteres</small> : null}

        <button type="submit" disabled={isSubmitting} style={{ padding: 12, fontWeight: 600 }}>
          {isSubmitting ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      {apiError ? <p style={{ color: "crimson", marginTop: 12 }}>{apiError}</p> : null}
      <p style={{ marginTop: 12 }}>
        Ya tenes cuenta? <Link to="/login">Ir a login</Link>
      </p>
    </main>
  );
}
