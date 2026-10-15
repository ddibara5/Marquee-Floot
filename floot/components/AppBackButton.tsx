import { ArrowLeft } from "lucide-react";
import { useAppBack } from "../helpers/useAppBack";
import styles from "./AppBackButton.module.css";

type AppBackButtonProps = {
  fallback: string;
  fallbackLabel: string;
  className?: string;
  iconSize?: number;
};

export default function AppBackButton({
  fallback,
  fallbackLabel,
  className,
  iconSize = 14,
}: AppBackButtonProps) {
  const goBack = useAppBack(fallback);

  return (
    <button
      type="button"
      className={`${styles.back} ${className || ""}`}
      onClick={goBack}
      aria-label={`Back, or go to ${fallbackLabel}`}
    >
      <ArrowLeft size={iconSize} aria-hidden="true" />
    </button>
  );
}