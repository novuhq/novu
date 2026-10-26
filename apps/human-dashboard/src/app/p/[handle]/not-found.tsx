import { CardUnavailable } from '@/components/public-card/card-unavailable';
import { Stage } from '@/components/site/stage';

/** A card's link that shows no card, with the reason left untold. */
export default function CardNotAvailable() {
  return (
    <Stage glow="center">
      <CardUnavailable />
    </Stage>
  );
}
