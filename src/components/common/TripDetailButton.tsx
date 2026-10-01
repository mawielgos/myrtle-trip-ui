import { useNavigate, useParams } from "react-router-dom";
import { secondaryButtonStyle } from "../../styles/uiStyles";

type TripDetailButtonProps = {
  tripId?: number | string | null;
  onBeforeNavigate?: () => boolean | Promise<boolean>;
  disabled?: boolean;
};

export default function TripDetailButton({
  tripId,
  onBeforeNavigate,
  disabled = false,
}: TripDetailButtonProps) {
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

    navigate(`/trips/${resolvedTripId}`);
  }

  return (
    <button
      type="button"
      style={secondaryButtonStyle}
      onClick={handleClick}
      disabled={disabled || !resolvedTripId}
    >
      Event Detail
    </button>
  );
}
