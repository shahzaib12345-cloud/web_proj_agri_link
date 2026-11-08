import { WeatherPanel } from './WeatherPanel';
import { AdvicePanel } from '@/features/advice/AdvicePanel';

export function WeatherAdvicePage() {
  return (
    <div className="space-y-6">
      <WeatherPanel />
      <AdvicePanel />
    </div>
  );
}
