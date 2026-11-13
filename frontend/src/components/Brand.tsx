import logo from '../assets/resolve-ai-light-192.png';
export default function Brand({ compact = false }: {
    compact?: boolean;
}) {
    return <a className="wordmark" href="#/" aria-label="Resolve AI home"><img src={logo} width={40} height={40} alt=""/>{!compact && <>Resolve<span className="wordmark-ai">AI</span></>}</a>;
}
