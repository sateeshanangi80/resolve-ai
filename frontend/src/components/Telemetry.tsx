import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
import { useRoute } from '../navigation';
export default function Telemetry() {
    const route = useRoute();
    // Invitation fragments and owner setup never enter third-party telemetry.
    if (route.startsWith('/accept-invite') || route === '/setup')
        return null;
    return <><SpeedInsights /><Analytics /></>;
}
