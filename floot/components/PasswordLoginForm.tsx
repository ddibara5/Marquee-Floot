import React, { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  Form as FormProvider,
  FormControl,
  FormItem,
  FormLabel,
  FormMessage,
  useForm,
} from "./Form";
import { Input } from "./Input";
import { PasswordField } from "./PasswordField";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import styles from "./PasswordLoginForm.module.css";
import {
  schema,
  postLogin,
} from "../endpoints/auth/login_with_password_POST.schema";
import { useAuth } from "../helpers/useAuth";

export type LoginFormData = z.infer<typeof schema>;

interface PasswordLoginFormProps {
  className?: string;
}

export const PasswordLoginForm: React.FC<PasswordLoginFormProps> = ({
  className,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onLogin } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    schema,
  });

  const handleSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      const result = await postLogin(data);
      onLogin(result.user);
      setTimeout(() => navigate("/"), 200);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Login failed. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FormProvider {...form}>
      <form
        noValidate
        onSubmit={form.handleSubmit(handleSubmit)}
        className={`${styles.form} ${className || ""}`}
      >
        {error && <div role="alert" className={styles.errorMessage}>{error}</div>}

        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              placeholder="your@email.com"
              type="email"
              name="email"
              autoComplete="username"
              disabled={isLoading}
              value={form.values.email}
              onChange={(e) =>
                form.setValues((prev) => ({ ...prev, email: e.target.value }))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <PasswordField
              type="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              value={form.values.password}
              onChange={(e) =>
                form.setValues((prev) => ({
                  ...prev,
                  password: e.target.value,
                }))
              }
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button
          type="submit"
          disabled={isLoading}
          className={styles.submitButton}
        >
          {isLoading ? (
            <span className={styles.loadingText}>
              <Spinner className={styles.spinner} size="sm" />
              Signing in…
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </FormProvider>
  );
};
