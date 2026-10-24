import './Brand.css';

export default function Brand({ href, label = 'MDB home' }: { href: string; label?: string }) {
  return <a className="brand" href={href} aria-label={label}><span className="brand-mark">m</span> MDB</a>;
}
