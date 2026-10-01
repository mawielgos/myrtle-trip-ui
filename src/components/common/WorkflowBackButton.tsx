import { useNavigate } from "react-router-dom";
import { secondaryButtonStyle } from "../../styles/uiStyles";

type WorkflowBackButtonProps = {
  label: string;
  to?: string | null;
  onBeforeNavigate?: () => boolean | Promise<boolean>;
  disabled?: boolean;
};

export default function WorkflowBackButton({
  label,
  to,
  onBeforeNavigate,
  disabled = false,
}: WorkflowBackButtonProps) {
  const navigate = useNavigate();

  async function handleClick(): Promise<void> {
    if (disabled) {
      return;
    }

    if (onBeforeNavigate) {
      const canNavigate = await onBeforeNavigate();
      if (!canNavigate) {
        return;
      }
    }

    if (to) {
      navigate(to);
      return;
    }

    navigate(-1);
  }

  return (
    <button type="button" style={secondaryButtonStyle} onClick={handleClick} disabled={disabled}>
      {label}
    </button>
  );
}
