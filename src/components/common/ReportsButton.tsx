import { useNavigate, useParams } from "react-router-dom";
import { secondaryButtonStyle } from "../../styles/uiStyles";

type ReportsButtonProps = {
  tripId?: number | string | null;
  onBeforeNavigate?: () => boolean | Promise<boolean>;
  disabled?: boolean;
};

export default function ReportsButton({
  tripId,
  onBeforeNavigate,
  disabled = false,
}: ReportsButtonProps) {
  const navigate = useNavigate();
  const params = useParams();
  const resolvedTripId = tripId ?? params.tripId;

  async function handleClick(): Promise<void> {
    if (disabled || !resolvedTripId) {
      return;
    }

    if (onBeforeNavigate) {
      const canNavigate = await onBeforeNavigate();
      if (!canNavigate) {
        return;
      }
    }

    navigate(`/trips/${resolvedTripId}/reports`);
  }

  return (
    <button
      type="button"
      style={secondaryButtonStyle}
      onClick={handleClick}
      disabled={disabled || !resolvedTripId}
    >
      Reports & Exports
    </button>
  );
}
